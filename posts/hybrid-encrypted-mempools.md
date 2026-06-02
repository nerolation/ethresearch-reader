*Authors: [Benedikt](https://ethresear.ch/u/b-wagn/summary), [Julian](https://ethresear.ch/u/julian/summary)*

We thank [Anders Elowsson](https://x.com/weboftrees?s=21), [Terence Tsao](https://x.com/terencechain?s=21), [Luis Bezzenberger](https://x.com/bezzenberger?s=21), and Jannik Luhn for feedback and comments.

## Introduction
About every 30 seconds an Ethereum user gets sandwiched on average, according to [Hildobby's dashboard](https://dune.com/hildobby/sandwiches) that shows about one third of blocks contains at least one sandwich attack. Sandwiched traders receive fewer tokens at the end of their trade, and a bad user experience, as those who learn they were sandwiched, may feel stolen from.

With an encrypted mempool, transactions can be included and ordered in a block before their contents are known. Users enjoy lower trading costs as less MEV can be extracted from their encrypted transactions. Moreover, new applications can be built using encrypted mempools that cannot trustlessly exist on Ethereum today. Finally, encrypted mempool schemes as proposed here can create unbiasable randomness beacons that unlock new protocol features such as [Attester-Proposer Separation](https://aps.directory) by removing multi-slot MEV, see below.

Builders offer private transaction submission channels today that allow users to land their transactions on Ethereum without exposing them publicly, like an encrypted mempool would. Notable are [MEV Protect](https://docs.flashbots.net/flashbots-protect/overview) and [MEV Blocker](https://cow.fi/mev-blocker). These private channels have protected hundreds of billions of dollars worth of transaction volume and offer special services like rebates to users who create backrun opportunities. Moreover, new private channels like [BuilderNet](https://buildernet.org/docs) operate from Trusted Execution Environments creating trustless private transaction submission.

Still, we believe an enshrined encrypted mempool on Ethereum is worth considering for the following reasons:
1. **Censorship Resistance.** The Ethereum mempool provides [censorship resistance](https://youtu.be/sTfATirYqGA?si=CpqzhxRAMPcJC5f-) that no other private submission channel can provide. Encrypted mempools and other censorship resistance tools like [FOCIL](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870) [complement each other](https://blog.shutter.network/the-holy-trinity-of-censorship-resistance-in-ethereum/) to create a level of censorship resistance that [applications and institutions demand](https://arxiv.org/abs/2502.20334). Even if other private submission channels do not intend to censor, the mempool may centralize in them due to other forces, [as happened with email](https://cfenollosa.com/blog/after-self-hosting-my-email-for-twenty-three-years-i-have-thrown-in-the-towel-the-oligopoly-has-won.html). 
3. **Users are still getting sandwiched!** We cannot ignore the evidence. On average someone gets sandwiched about every 30 seconds. That is about 2-4 users since you first [read](https://scholarwithin.com/average-reading-speed) that fact at the top of the page. Scroll through [Eigenphi's dashboard](https://eigenphi.io/mev/ethereum/sandwich) here to see the latest attacks. Clearly, out-of-protocol private submission channels are not sufficient to protect all users.

In this post we propose an encrypted mempool design that allows a builder to order encrypted transactions together with plaintext transactions in a block. Decryption happens during the slot and transactions are executed as ordered. Decryption keys are included in the next block. Decryption is usually done by a threshold committee but can be instigated by the user as well. This hybrid decryption design prevents MEV tricks while ensuring liveness, as we outline below.

Additionally, we make explicit which properties a threshold encryption scheme should have to be useful in this design.

### Optional Decryption Problems
[Anders](https://ethresear.ch/u/aelowsson/summary) recently proposed an encrypted mempool mechanism called [Sealed Transactions](https://ethresear.ch/t/sealed-transactions/21859). We sketch how the mechanism works in a very simplified form here:
- Users send encrypted transactions to the encrypted mempool.
- Encrypted transactions are referenced in the next block but not executed (as they are encrypted).
- The user observes the block and releases a decryption key.
- The decrypted transactions are ordered at the top of the next block.

The fundamental problem with designs that rely on the user being responsible for decryption to happen is that the user may only do so if it is profitable for them. Consider the following example. There is a decentralized exchange on Ethereum that trades USDC/ETH. The current price on the AMM is 4500 USDC/ETH. The first transaction in the next block may capture an arbitrage opportunity. Users may submit *encrypted* transactions that would be optimal arbitrage trades if the market price would move to 4490 USDC/ETH, 4480 USDC/ETH, ..., 4400 USDC/ETH and 4510 USDC/ETH, 4520 USDC/ETH, ..., 4590 USDC/ETH. Just before the decryption keys must be released, users would only release decryption keys for profitable trades.

The problem is that the optional reveal would induce spam transactions that crowd out welfare-creating usage of Ethereum blockspace. Given limited space for encrypted transactions, it is not clear whether other transactions than these *options* described above would be included. Moreover, the optionality would be a big shock to the builder market structure.




### Threshold Cryptography and its problems 
The discussion above suggests that a central question to ask for encrypted mempools is 

*Who can decrypt the encrypted transactions? And when are they decrypted?*

In other words, we ask to which public key we let the users encrypt their transactions. Looking back at sealed transactions, here the user itself decrypted (or rather *opened*) the transactions, which opened the door to new MEV vectors, as we have seen. Another commonly suggested approach is *threshold cryptography*. In a nutshell, the setting is as follows:
- there is a *committee* of $n$ parties, and with it an associated encryption key (which could be $n$ individual keys or one joint key, see below).
- each member of this committee holds a share of the decryption key.
- only if enough (say, at least $t$ for some threshold $t$) of these committee members come together, they can decrypt ciphertexts.

With this, the user would now encrypt its transaction towards the encryption key of the committee and the committee would decrypt the transaction later. Note that this introduces a *new honesty assumption on the committee*, namely $<t$ corrupted parties in the committee. Also, for liveness we need to assume that at least $t$ honest parties *are online*. If this does not hold, then the committee cannot decrypt. This is the main challenge when using threshold encryption, even if we had an ideal threshold encryption scheme (see below).

---

## Overview and Ideas
Before we explain the detailed architecture of our proposal, we give an overview and outline the main ideas. 

### Parties and Threat Model
We consider a setting in which a *user* wishes to submit a transaction to the blockchain. The user may behave either honestly or dishonestly.

Additionally, we assume the existence of a committee consisting of $n$ parties. The method by which this committee is selected is beyond the scope of this work. We define the committee as honest if $< t$ parties behave dishonestly. Importantly, honest parties may be temporarily offline. If fewer than $t$ parties are online at any given time, and consequently the honest parties cannot decrypt, we consider the committee to be offline.

To summarize:

- *User*: dishonest or honest
- *Committee*: honest (and online) or offline

### Idea 1: Hybrid Mode
Our first observation is that Sealed Transactions and threshold encryption complement each other and can be effectively combined.

We assume that, in the benign case the user encrypts towards the committee, but:
- The user opens the ciphertext (as in sealed transactions), and
- The committee decrypts the ciphertext.

This combination addresses two major issues discussed earlier: selective opening in Sealed Transactions and the liveness problem of threshold encryption. To see this, consider the following four cases:

- **Case 1. Honest User, Committee Online:** The user sends a single ciphertext, and the committee successfully decrypts it.
- **Case 2. Dishonest User, Committee Online:** The user can no longer selectively open its ciphertexts as in plain sealed transactions. This is because the committee will decrypt *all* ciphertexts.
- **Case 3. Honest User, Committee Offline:** The user would open its transaction.
- **Case 4. Dishonest User, Committee Offline:** This is the bad case, where selective opening is possible. To deal with that, we want to ensure that when creating ciphertexts, the user does not know if we are in Case 2 or Case 4, i.e., whether the committee is online or offline.

To summarize:
|                         | **Committee Online**                                           | **Committee Offline**                                           |
|-------------------------|----------------------------------------------------------------|-----------------------------------------------------------------|
| **Honest User**         | single ciphertext; committee decrypts. | single ciphertext; user opens.                          |
| **Dishonest User**      | committee decrypts *all* ciphertexts.  | Bad case; selective opening possible   |


To ensure that the user has a hard time guessing whether the committee is online or offline, it makes sense to regularly (e.g., every few slots) rotate the committee (deterministically or even randomly). Note that using *silent* threshold encryption (see below), the costs of this can be small. 

While Case 4 is undesirable, it should occur rarely, assuming the committee is online most of the time. Moreover, if we make the cost of Case 2 high enough for the user, this disincentivizes dishonest behavior. As a result, the system will effectively operate in Case 1 or Case 2 most of the time.

In short: Threshold encryption is used primarily to disincentivize users from creating MEV vectors in Sealed Transactions.

### Idea 2: Hybrid Encryption
If we want to implement this hybrid approach, we need to write ciphertexts of a threshold encryption scheme on-chain. Depending on the scheme, this may be expensive as ciphertexts are large. Also, it is not entirely clear from the definition of threshold encryption that the user is *committed* to a transaction given a (potentially malformed) ciphertext. To solve these two problems, one can resort to *hybrid encryption*:
1. the user puts $ct = \mathsf{AES.Enc}(k,tx)$ and $h =\mathsf{Hash}(k)$ on-chain, for a symmetric encryption key $k$. 
2. the user sends a threshold encryption of $k$ to the committee. This can happen off-chain, with some restrictions (see Idea 3).
3. to open the transaction, the user or the committee posts $k$ on-chain.

In this way, only a small symmetric ciphertext and a hash end up on-chain. In addition, a potentially malicious user is committed to $k$ via $h$, and thefore to a unique transaction $tx = \mathsf{AES.Dec}(k,ct).$

### Idea 3: Sampling Ciphertexts 
The ciphertext of the threshold encryption of the symmetric encryption key, denoted as $k$ above, may be large. Since blocks are limited in size, large ciphertexts mean few can be included per slot. 

In our Idea 2, we have proposed sending this large ciphertext off-chain, while only a short symmetric ciphertext of the transaction is on-chain.

However, there is one important catch: the ciphertext encrypting $k$ must be *available* for the threshold committee to decrypt, otherwise the user is the only party who can decrypt and retains the optionality to only decrypt if profitable. Therefore, we propose sampling data availability.

If the ciphertext was not available, or if it was decrypted and the ciphertext does not correspond to the symmetric encryption key, then the corresponding transaction should not be executed to prevent giving users the optionality to reveal. 

The builder includes in the block special blobs that reference the transactions for which the blob holds the encryption keys. Attesters sample the availability of the blobs.

Finally, if the decryption key the threshold committee finds is different from the decryption key that a user submits to open its transaction, the transaction may not be executed. Therefore, decryption keys must correspond to the hash of the symmetric encryption key put on-chain.


### Requirements for threshold encryption
For our approach, the threshold encryption scheme that is used should satisfy the following requirements:
- **Silent Setup with small Public Keys:** The scheme should avoid the need for a distributed key generation (DKG) protocol to create a shared public key. DKG protocols are complex, highly interactive, and require significant implementation effort. Moreover, they must be rerun whenever the committee changes or is rotated. Instead, we require a *silent setup*, where each committee member independently generates their own public key. Encryption is performed with respect to the list of public keys of all committee members. These public keys should be of constant size, independent of the committee size—for instance, consisting of just a few group elements.
- **Non-Interactive Decryption:** To minimize latency and complexity, the decryption process should be non-interactive. Specifically, each committee member should be able to compute a *decryption share* using their secret key and the ciphertext. Once enough decryption shares are collected, any party should be able to publicly combine them to recover the original message.
- **Small Ciphertext Size:** Ciphertexts must remain within practical size limits, as they will be stored in blobs. To maximize efficiency, we aim to store multiple ciphertexts per blob.
- **CCA2 Security:** The scheme must offer [CCA2 security](https://theory.stanford.edu/~dabo/pubs/papers/ibethresh.pdf) (i.e., security under chosen ciphertext attacks). This is crucial because, in our setting, anyone can submit encrypted transactions, and committee members subsequently compute and reveal decryption shares for them.

Another (optional but very useful) feature may be the ability to *batch decrypt* multiple ciphertexts with small communication, i.e., the ability to generate succinct decryption shares for decrypting a set of multiple ciphertexts (see [this](https://eprint.iacr.org/2024/669.pdf) and [this](https://eprint.iacr.org/2024/1533.pdf)).

Let us reference a few candidate schemes and explain where they fail to meet our requirements: 

- Classical CCA2-secure threshold encryption schemes such as the one by [Shoup and Gennaro](https://www.shoup.net/papers/thresh1.pdf) or by [Boneh, Boyen, and Halevi](https://theory.stanford.edu/~dabo/pubs/papers/ibethresh.pdf), as well as modern schemes proposed for encrypted mempools (e.g., [this](https://eprint.iacr.org/2024/669.pdf) and [this](https://eprint.iacr.org/2024/1533.pdf)) rely on a DKG.
- The scheme due to [Garg et al.](https://eprint.iacr.org/2024/263.pdf) has a silent setup, but linear-sized public keys (i.e., each public key contains $n$ group elements) for a committee of size $n$. While they call the elements causing this overhead "hints", they effectively belong to the public key and have to be stored with the actual public key on chain.
- [A recent scheme](https://eprint.iacr.org/2025/1384.pdf) has a silent setup and small keys. On the downside, it has somewhat large ciphertext (for small plaintexts) and is only CCA1-secure. The ciphertext size may be acceptable as the large part of the ciphertext is stored in blobs. 

---

## Architecture
This section describes the Hybrid Encrypted Mempools mechanism in more detail. We refer to Figure 1 below for an overview.

- **Before Block $n$** *(Before $T{1}$)*: Users submit encrypted transactions to the encrypted mempool by encrypting towards the threshold committee. Transactions do specify `gasLimit` and `from` address in plain text. The user is charged `gasLimit` * `gasPrice` upfront. The user may submit a higher `gasLimit` than strictly necessary for extra obfuscation, as suggested by Anders in [Sealed Transactions](https://ethresear.ch/t/sealed-transactions/21859)
- **Block $n$** ($T_{1}$): The builder propagates a block as it does today. There is an ordered list of transactions and encrypted and decrypted transactions may be interspersed. The symmetric encryption of each encrypted transaction is put in the block as well as the hash of the symmetric encryption key. The size of the symmetric encryption of a transaction is roughly as large as the plain text transaction. Moreover, the ciphertext of the encryption key is put into a blob to ensure it is available.
- **Attestation Deadline Block** $n$ ($T_{2}$): Attesters verify that the blobs with the ciphertexts of the symmetric encryption keys are available for each encrypted transaction in the block. They do not vote for the block if they find any blob to be unavailable.
- **Non-interactive Threshold Decryption** (Before $T_{3}$, After $T_2$): Members of the threshold committee start non-interactive decryption as soon as they see the block. That means every committee member outputs and propagates a decryption share.
- **Decryption Deadline** ($T_{3}$): Users must have submitted their decryption keys $k$ before this deadline. Additionally, the committee also submits $k$ before this deadline. More precisely, we assume there is at least one party that creates $k$ if sufficient decryption shares are available and propagates it before this deadline. Attesters freeze view on available decryption keys, whether they come from individual users or the threshold committee.
- **Block** $n+1$ ($T_{4}$): The block must contain all decryption keys released before the deadline. The builder is free to include decryption keys that were released later.
- **Attestation Deadline Block** $n+1$ ($T_{5}$): Attesters execute block $n$ with the decryption keys included in block $n+1$. If an attester saw a decryption key before the Decryption Deadline that is not included in block $n+1$, it does not vote for block $n+1$. This resembles the view-merge change to the fork-choice rule also used in FOCIL.

![Figure 1](images/ibQFhM2UbjuGhHmIfbfOB48y1FG.png)
*Figure 1: Schematic overview of the hybrid encrypted mempool design. A user sends the hash and the symmetric encryption of its transaction in a black closed envelope to the builder. Moreover, it sends the ciphertext of the threshold encryption of its symmetric encryption key to the network as 'ct' before $T_{1}$. The information is included in the block and its blobs, which are sampled by the attesters by $T_{2}$. The threshold committee observes the ciphertext and performs non-interactive decryption to output a decryption key before the deadline $T_{3}$, the user may also release a decryption key. Attesters enforce that any decryption key released before $T_{3}$ is included in the block. The decryption keys are included in the next block by $T_{4}$. At $T_{5}$, attesters execute block 1.*

As a downside, we note that if the threshold committee decrypts before attesters vote for the block, a late revealed block, whether maliciously or not, causes the threshold committee to decrypt the transaction even if it does not become canonical. A user may condition its transaction only to execute at a specific block height preventing the decrypted transaction from being included in a later block. Still, decrypted transactions reveal user intent which harm users.

The threshold committee could decrypt after attesters attest to decrease the change of a reorg, however, blocks would then still not be finalized and may be reorged and it would increase the slot duration which is a worse user experience.

Another big downside of this design is that the execution output of block $n$ can only be known with certainty after block $n+1$. That is because the builder may always include more decryption keys than publicly observed. Suppose the committee is offline and the builder includes a decryption key that attesters had not seen before, then the execution output would be different than attesters may have expected. This leads to a worse user experience as time to execution is delayed by one slot. If the committee is online users can execute a block as soon as the decryption key is revealed by the committee.

---

## Security Intuition
Let us give some security intuition for our design.

*Optional Decryption Problems Are Eliminated.* We first argue that the optional decryption problems present in the sealed transaction design are mitigated in our construction. To that end, first observe that users are disincentivized from assuming that the committee is offline, since:
- The committee is rotated frequently.
- Each encrypted transaction requires an upfront payment making speculation on an offline committee expensive.

When the committee is online, there are two possible cases:
- Case 1: The threshold encryption ciphertext is available and well-formed, and will therefore be decrypted.  
- Case 2: The threshold encryption ciphertext is unavailable or malformed.

Importantly, the user is *committed* to whether we are in Case 1 or Case 2 at time $T_1$ (this uses the *binding property* of the commitment to the blob). This means that the user must decide *upfront* whether the ciphertext will be decrypted—unlike in the sealed transaction design, where this decision could be deferred.


*Privacy of the Construction.* Next, we claim that our construction hides the content of transactions until they are included in the block. Informally, this follows because:
1. The committee only begins decryption *after* time $T_2$.  
2. As long as the committee does not decrypt, the threshold encryption ciphertext leaks no information about $k$ (by the security of the threshold encryption scheme).  
3. The hash $h = \mathsf{Hash}(k)$ reveals no information about $k$, in the random oracle model and assuming that $k$ has sufficiently high entropy.  
4. Therefore, the symmetric ciphertext $ct = \mathsf{AES.Enc}(k, tx)$ reveals no information about the transaction $tx$.

*Split-View Attacks.* Finally, the deadline $T_3$ is chosen to ensure that the proposer has sufficient time to observe the decrypted or opened keys $k$. Attesters vote for the block if all decryption keys that they have seen before the deadline are included in the block. Without such a deadline, it could occur that attesters see a key while the proposer does not—leading them to withhold their vote from the proposer’s block since it would appear incomplete.


---

## Randomness from Encrypted Mempools
Ethereum's current source of randomness is RANDAO, an accumulator where each proposer adds random contributions to the existing RANDAO value. See the [Ethereum book](https://eth2book.info/latest/part2/building_blocks/randomness/) by Ben Edgington for more information. A problem of RANDAO is that it is *biasable*: proposers may choose whether to reveal their block which allows them to bias the output of RANDAO. Proposers may do so if it is profitable for them, for example if that leads to being chosen as proposer in the next epoch more often as Kaya Alpturer and Matt Weinberg explore in [this paper](https://arxiv.org/abs/2409.19883). Moreover, predictability of RANDAO is the key blocker to move towards Attester-Proposer Separation (APS) as explored in this [talk](https://youtu.be/5OOzMqCOoKM?si=3jOdWoo9Y4wNVNcl).

Encrypted mempools would create a new, better source of randomness. For example, we could use the hash of the post-state root of a block as source of randomness. The post-state root is unpredictable if there are encrypted transactions in the block. The builder may not be able to exclude encrypted transactions if force-included via FOCIL. Possibly, the hash of the decryption key that the threshold committee releases could be used as a source of randomness. The randomness is even hard to predict if the threshold committee is offline since it is hard to predict whether the threshold committee is offline and the committee would rotate often, potentially even every few slots. This source of randomness is not bullet-proof, however, since the post-state root may be predictable if there are no or just a few encrypted transactions in the block. 

---

## Open questions, problems, alternatives
In this post, we proposed an encrypted mempool design that uses a threshold committee to remove reveal optionality from the users, while allowing users to reveal to reduce the liveness risk of the threshold committee. The main contributions of this post are:
1. Exploring a new part of the design space that we call *hybrid* encrypted mempools that use a threshold committee and rely on users decryption.
2. Clarifying the cryptographic requirements for a threshold committee in the context of Ethereum.

In this final section we highlight the remaining open questions and problems with this proposal.

First, to ensure users do not know whether the threshold committee will be online, it is necessary to rotate the threshold committee often. Rotating frequently also reduces the liveness concern of the threshold committee. The protocol design would be simpler if there were only a threshold committee instead of a hybrid design. Other designs that mitigate the liveness risk may also be possible. For example, the threshold committee could be turned off after a certain condition like a few missed slots has been met. All in all, perhaps the additional protocol complexity of the hybrid design is not worth it.

Secondly, users encrypt their transactions to a specific threshold committee. If the committee rotates and the transaction has not been included yet, the transaction needs to be resubmitted. This worsens user experience.

Moreover, coordination is needed to put multiple ciphertexts from different users into one blob. Usually blobs are created by the blob submitter. Either the builder could fulfill the role of coordinator, but then ciphertexts need some way to gossip to the builder. Alternatively, a new data structure could be created that is sampled like a blob, but that fits exactly one ciphertext.

Finally, it should be better considered whether applications could build a similar design out-of-protocol. Transaction hashes can be included in a block of course and the applications could consider setting up a threshold committee and data availability via, for example, EigenLayer. This approach would reduce in-protocol complexity while allowing use cases that rely on encrypted transactions like sandwich prevention.