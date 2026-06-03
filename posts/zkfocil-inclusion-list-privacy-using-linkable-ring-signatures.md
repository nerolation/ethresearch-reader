*by [George](https://twitter.com/asn_d6), [Benedikt](https://benedikt-wagner.dev/) and [Thomas](https://x.com/soispoke).*

*Thanks to [Francesco](https://x.com/fradamt) for discussions and comments.*

## Motivation

We propose an alternative approach to improving [FOCIL (EIP-7805)](https://eips.ethereum.org/EIPS/eip-7805) privacy. Inspired by the work on [Anonymous Inclusion Lists](https://ethresear.ch/t/anonymous-inclusion-lists-anon-ils/19627) and focusing on [includer](https://ethresear.ch/t/towards-attester-includer-separation/21306/) privacy, we propose a simple protocol *based on Linkable Ring Signatures (LRS)* that allows validators to privately publish inclusion lists. We also propose an LRS scheme based on general-purpose SNARKs.

Our goal with this document is to spark research into specialized constructions that instantiate this LRS primitive more efficiently and elegantly, compared to our SNARK construction.

## Overview

In [FOCIL](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870), the beacon chain uses RANDAO to select a committee of includers, who then publish inclusion lists.

Here, we aim to **hide the identity of these includers** in two steps:
1. A private lottery protocol picks the committee of includers from the validator set.
2. A linkable ring signature scheme anonymizes includers’ messages.

We show how to achieve these steps using an LRS scheme and propose a SNARK-based instantiation.

## Linkable Ring Signatures

Abstractly, linkable ring signatures (LRS) let a signer prove membership in a group without revealing which member signed, while also detecting repeated use of the same key. Each signature includes a “key image” that is derived from the secret key but does not reveal the signer’s identity. If the same secret key is used again, the resulting key image is the same, allowing verifiers to link multiple signatures from the same (anonymous) signer without exposing who they are.

Linkable ring signatures are well studied cryptographic primitives (e.g. [see this construction](https://eprint.iacr.org/2020/646)). For this proposal, we assume the following minimal API:

1. **KeyGen() → (SigningKey, PublicKey)**  
   Generates a key pair.
2. **Sign(Ring, SigningKey, message) → (Signature, KeyImage)**  
   Produces a ring signature on `message` over the given `Ring` of public keys, returning both the signature and its associated `KeyImage`.
3. **Verify(Ring, message, (Signature, KeyImage)) → bool**  
Verifies that the signature was validly produced by one of the private keys in `Ring`.
   
This mirrors a standard linkable ring signature interface, except we expose the key image directly rather than providing a separate `Link()` function. Looking ahead, making the key image explicit allows us to use it in private lotteries. Verifiers can then detect multiple signatures from the same secret key simply by comparing key images. We also assume that the key images are indistinguishable from random strings for anyone not holding the corresponding signing key.


## Protocol overview

At every slot, Alice computes her ephemeral ring signing key (i.e. the key image) and checks it against a predicate to see if she won the lottery. Because the key image is tied to the validator's identity public key, the key image is unique for each validator, and hence Alice cannot grind lottery tickets to bias the election. Furthermore, because the key image looks random for everyone except Alice, only Alice herself will know that she won the lottery, until she decides to reveal herself.

If Alice won the lottery, she is an includer for that slot, and she should build and broadcast an inclusion list and sign it with her LRS signing key.

## Protocol Spec

We now provide a protocol spec of our "Private Proof Of Includer" protocol using the API of the LRS scheme above:

### Key generation

Every validator generates a linkable ring signature keypair and **registers its public key** to the blockchain:

```
Sk, Pk := KeyGen()
```

This only needs to be done once, but there is currently no such channel for key registration in the beacon chain. There are approaches (like the SNARK-based one we describe below) where the validator BLS12-381 signing key can be used for this scheme, at the cost of exposing the validator private key to this new primitive.

### Lottery

A validator is selected to be an includer based upon the return value of `is_includer()`.

```
def is_includer(state: BeaconState, slot: Slot, Sk: RingSigningKey, Ring) -> bool
    domain = get_domain(state, DOMAIN_IL, compute_epoch_at_slot(block.slot))
    signing_root = compute_signing_root(slot, domain)

    _, KeyImage = Sign(Ring, Sk, signing_root)

    return is_includer_impl(state, KeyImage)

def is_includer_impl(state: BeaconState, KeyImage)
    modulo = max(1, len(state.validators) // TARGET_N_INCLUDERS)
    return bytes_to_uint64(hash(KeyImage)[0:8]) % modulo == 0
```

This approach satisfies the secrecy requirement from the [FOCIL IL Committee Selection document](https://hackmd.io/@ttsao/il-committee-selection#3-Aggregator-approach), since only Alice can compute her own key image.

Note that the probability of winning is the same for all validators and it's not weighted by stake.

### Publishing inclusion lists

```
def get_inclusion_list_signature(Sk: RingSigningKey, Ring) -> RingSignature:
    inclusion_list_body = compute_inclusion_list()
    Signature, _ = Sign(Ring, Sk, inclusion_list_body)
    return Signature
```

### Inclusion list verification

When Alice, the proposer, receives ILs from the P2P network, she checks the following for every IL:
- that the signature is valid
- that the sender is a valid includer
- whether she has received more than one IL from the same signer

```
def verify_inclusion_lists(state: BeaconState, signed_inclusion_lists: SignedInclusionList):
    key_images = []

    for signed_inclusion_list in signed_inclusion_list:
        assert Verify(Ring, signed_inclusion_list.body, signed_inclusion_list.signature)
        assert is_includer_impl(state, signed_inclusion_list.signature.key_image)
        key_images.append(signed_inclusion_list.signature.key_image)

    # Check double-signing by checking duplicate key images
    assert len(key_images) == len(set(key_images))
```

Similar rules would be introduced for nodes on the P2P network [as suggested by the EIP](https://eips.ethereum.org/EIPS/eip-7805#cl-p2p-validation-rules).

## Linkable Ring Signature schemes

The above spec can be realized with various LRS protocols from the literature. Below, we propose an LRS construction using general-purpose SNARKs, since existing published schemes are not efficient enough for our use case. Afterwards, we provide performance requirements for an LRS scheme to be compatible with our use case.

### LRS based on zk-SNARKs

In this section we provide an instantiation of an LRS scheme based on general purpose zk-SNARKs:

The following SNARK-based approach is inspired by the [Proof Of Validator post](https://ethresear.ch/t/proof-of-validator-a-simple-anonymous-credential-scheme-for-ethereums-dht/16454) (also see this [recent paper from ESORICS 2024](https://eprint.iacr.org/2024/553)). In this approach, the lottery protocol is implemented using the derived ephemeral BLS public key (similar to how beacon chain aggregators are currently selected using a BLS-based VRF).

In particular, consider a validator with `(Sk, Pk)` as her BLS identity keypair:

```
def Sign(Sk, message, validators_pks, validators_pks_commitment):
    derived_sk = hash(Sk)
    derived_pk = G.mul(derived_sk)  # derived_pk is the key image

    # Proof that `derived_pk = H(Sk) * G` and that `Sk` is a log of an element in validators_pks
    proof = SNARK.prove((Sk, validators_pks), (validators_pks_commitment, derived_pk, G))
    signature = BLS.Sign(derived_sk, message)

    return (signature, proof), derived_pk
```

```
def Verify(message, ((signature, proof), derived_pk), validators_pks_commitment):
    # Check that key image (derived_pk) is properly derived from one of the validators
    assert SNARK.verify(proof, (validators_pks_commitment, derived_pk, G))

    assert BLS.verify(derived_pk, signature, message)
```

where `validators_pks` is a list of BLS public keys for all validators, and `validators_pks_commitment` is a Merkle commitment to `validators_pks`.

`SNARK.Prove(w, x)` is the prove function of an abstract zk-SNARK scheme where `w` represents the witness and `x` the statement. Similarly, `SNARK.Verify(proof, x)` verifies the statement `x` using the `proof`.

#### Downsides and upsides of the LRS SNARK scheme

This approach is efficient and practical and with the right SNARK proof system (e.g. Halo2+IPA) it does not require a trusted setup.

However, the complexity of specifying and implementing a SNARK is considerable. This is due to SNARKs having multiple complex underlying parts (polynomial commitment scheme, proof system, arithmetization) and each of them being critical to security and performance.

It's worth noting that the approach above avoids key registration by inherently using the BLS identity keypair of the validators. This is generally not recommended practice: you are not supposed to use long-term private keys in cryptosystems they were not intended for. An alternative would be to use the "Approach 1" from the [Proof Of Validator](https://ethresear.ch/t/proof-of-validator-a-simple-anonymous-credential-scheme-for-ethereums-dht/16454) post, which would add an explicit key registration step to the protocol. Key registration is particularly hard in Ethereum because there is no standard way for validators to register new cryptographic keys, and because it bloats the size of the `BeaconState` considerably (given that we have 1 million validators).

### Performance Requirements

Any LRS that satisfies the following requirements would work here:

- Inclusion lists are 8kb, so signature size should be less than 1.5 kb (this likely translates to $O(1)$ or $O(logn)$ constructions, where $n$ is the total number of validators).
- Signing time must be fast (on the order of milliseconds).
- Verification time must be fast (on the order of milliseconds).
- Public keys should be tiny (ideally one group element).
- Key image computation can be slow (on the order of seconds). It's likely that we can precompute it ahead of time since it does not depend on the block or transactions.
- Ideally should be able to work with already existing BLS keys. Require no key registration step.
- No trusted setup. No RSA accumulators. 

## Informal Security Properties

Here is a list of informal security properties that our private FOCIL scheme should cover:

1. **Independence and Fairness of the Lottery**  
   Each validator has the same probability of winning in a given slot, and one validator’s probability of winning does not depend on whether others have won. This security property depends on an LRS scheme which produces unique key images given a public key, and also by feeding the key image into the a random oracle before applying the predicate.
2. **Hiding of Winners Until Reveal**  
   No one can determine whether a validator has won unless and until that validator publishes its key image and signature. In other words, a validator’s winning status remains secret until it explicitly reveals proof. This security property depends on an LRS scheme where key images are pseudorandom and the pair `(key_image, signature)` is unforgeable. Hence, Bob cannot derive the key image of Alice to check if she won the lottery.
3. **Anonymity Upon Reveal**  
   Even when a validator does reveal its key image and signature, external observers only learn a pseudonym (i.e., the key image) and cannot link this ephemeral identity to the validator’s long-term public key.
4. **Unforgeability of Signatures**  
   An adversary cannot create a valid signature or key image on behalf of a winning validator without knowing that validator’s secret key. 

## Future work

- **Anonymous Reward Mechanisms**: Investigate how to reward anonymous includers without linking their real-world identities.
- **Long Term Anonymity Attacks on LRS**: There has been [lots](https://arxiv.org/pdf/2402.18755) of [work](https://eprint.iacr.org/2020/1550.pdf) on reducing the anonymity of linkable ring signatures over time. Such attacks roughly work by composing a graph of key images and running the [*DM decomposition* algorithm](https://www.cambridge.org/core/journals/canadian-journal-of-mathematics/article/coverings-of-bipartite-graphs/413735C5888AB542B92D0C4F402800B1). We should investigate whether our ring size is susceptible to such attacks, and otherwise consider using key images that change per epoch.
- **Networking Anonymity**: Networking anonymity is not in-scope for this document, but an efficient [Anonymous Broadcast Protocol](https://ethresear.ch/t/anonymous-inclusion-lists-anon-ils/19627#anonymous-broadcast-protocol-11) is something that will eventually be needed.