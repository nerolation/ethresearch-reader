# So you wanna Post-Quantum Ethereum transaction signature

*Thanks to Vitalik Buterin, Justin Drake, Renaud Dubois, Marius Van Der Wijden and Zhenfei Zhang for fruitfull discussions.*

## Introduction

2024 will probably be remembered as one of the years marking the acceleration of the quantum computer menace. Google, under its CEO Sundar Pichai, finally unveiled its quantum chip, Willow, via a [loud tweet](https://x.com/sundarpichai/status/1866167429367468422)! 

Scott Aaronson, one of the most famous quantum experts in the world, has changed his message to people asking whether they should be worried about quantum computers. He [shifted from saying](https://scottaaronson.blog/?p=8329)

> ... Maybe, eventually, someone will need to start thinking about migrating from RSA, Diffie-Hellman, and elliptic curve cryptography to lattice-based crypto or other systems that could plausibly withstand quantum attacks,...

to 

> Yes, unequivocally, worry about this now. Have a plan.'


Vitalik has already written about [how to hard-fork to save most users’ funds in a quantum emergency](https://ethresear.ch/t/how-to-hard-fork-to-save-most-users-funds-in-a-quantum-emergency/18901/1). Also, few days ago, he highlighted in a [podcast](https://x.com/3orovik/status/1867754730136731923) the four main Ethereum components potentially vulnerable to quantum attacks. They are:

1. Ethereum transaction signatures (notably using **ECDSA**)
2. **BLS** signatures in consensus
3. Data Availability Sampling (leveraging **KZG** commitments)
4. Verkle trees (if shipped with **Bandersnatch**)

An attentive reader might have noticed that these four points have something in common—yes, it's my *beloved* elliptic curves. Unfortunately, the discrete logarithm problem for elliptic curves (ECDLP) is broken by Shor's Algorithm, a famous quantum algorithm.

In this short note, we are going to analyze a possible post-quantum replacement for the first point, namely a potential **post-quantum Ethereum transaction signature**.

## Which PQ signature?

Now, a legitimate question is: *which post-quantum (PQ) signatures should we use?* Fortunately, we don’t need to overthink this too much if we had to choose right now. Zhenfei Zhang, a former Ethereum Foundation cryptographer, has already written about the [NIST Post-Quantum Cryptography Standardization Process](https://crypto.ethereum.org/blog/nist-pqc-standard). If we analyze the three possible signature choices (two of which leverage lattice-based cryptography), it’s clear (at least for now) that Falcon appears to be the most promising candidate. The computation for the verifier should be roughly the same as other lattice-based signature schemes (like Dilithium), i.e., bounded by an FFT. However, [Falcon](https://falcon-sign.info/) does have a smaller signature size.

## Ship it!!!

Now that we've 'settled' on the signature to use, the next question is: *how are we going to ship it?*  There is a big dichotomy now: one implies a hard fork, and the other doesn't. Let's dig a bit deeper.

### The Account Abstraction way

The first approach we will discuss, arguably the most elegant and promising, involves **Account Abstraction** (AA). It has been advocated by Justin Drake and Vitalik on various occasions.

For people not familiar with it, AA is a proposed improvement to make the Ethereum ecosystem more flexible and user-friendly by changing how transactions and accounts are managed. It shifts certain functionalities traditionally reserved for externally owned accounts (EOAs) into smart contracts, effectively "abstracting" the differences between EOAs and smart contract accounts. 
Ethereum developers have introduced various proposals for implementing AA, including [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337). This is a practical solution that achieves AA without requiring a consensus-layer upgrade. It uses a mechanism called *User Operation* objects and introduces a separate *Bundler* layer to handle transactions.

Adding **Falcon as the Ethereum transaction signature in this scenario means coding a Falcon verifier contract** that is responsible for verifying the validity of *User Operation* objects before they are executed by the *Entry Point* contract.
Now, this may sound like all sunshine and rainbows, but there is at least one substantial underlying issue. Coding Falcon in Solidity might not be the best experience (and it’s probably quite gas-costly). On top of that, there are even nastier problems, such as the fact that Falcon deals with 13-bit numbers, while Solidity only supports U256. The latter is the kind of issue that could be addressed by adding [SIMD](https://eips.ethereum.org/EIPS/eip-616) and [EVMMAX](https://eips.ethereum.org/EIPS/eip-6690) to the EVM.

* **Pros:** It is an elegant and flexible solution.
* **Cons:** It is costly in terms of gas consumption.

### The hard fork way

The method we discuss here is probably the simplest technically. It is inspired by previous work done by Marius Van Der Wijden and essentially involves introducing a **new [transaction type](https://eips.ethereum.org/EIPS/eip-2718) signed with Falcon signatures** [instead of BLS signatures](https://eips.ethereum.org/EIPS/eip-7591). The biggest problem here is that, by doing so, we are tightly bound (through a new EIP) to a favored master signature scheme. 
So, to recap this approach
 
* **Pros:**  Easy to code and fast.
* **Cons:** Not future-proof.

### Hybrid

A really tempting approach would be to take the best of the two methods above and combine them into a single one. In a nutshell, we could leverage AA in a similar way that [RIP-7212](https://github.com/ethereum/RIPs/blob/5dbad75fcc9aabf3021e176818aa8d256293d460/RIPS/rip-7212.md) does, but of course, we would need a **new RIP for Falcon**. This might provide the time to experiment with the feature in rollups and determine if Falcon is truly the way to go. However, it is important to note that this approach does not solve the original problem of introducing a new signature scheme at the L1 level.

* **Pros:** Easy to code and fast.
* **Cons:** Temporary (does not solve the L1 use case).

## Conclusion

The rise of quantum computing demands urgent action to secure Ethereum, particularly its transaction signatures vulnerable to Shor's Algorithm. Falcon, a lattice-based signature scheme, emerges as a strong candidate due to its efficiency and compact size. Deployment strategies, including Account Abstraction, hard forks, or a hybrid approach, each offer distinct benefits and trade-offs. A careful evaluation is essential to ensure Ethereum remains robust against quantum threats while maintaining scalability and usability.