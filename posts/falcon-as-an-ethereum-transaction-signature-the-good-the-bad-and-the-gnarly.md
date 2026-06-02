This is **Part 2** of a blog series exploring the feasibility of implementing a **post-quantum signature** scheme for Ethereum. In [Part 1](https://ethresear.ch/t/so-you-wanna-post-quantum-ethereum-transaction-signature/21291/1), we introduced the fundamental challenges and considerations involved in transitioning Ethereum to a quantum-resistant future. In this installment, we'll dive deeper into Falcon, a promising post-quantum signature algorithm, examining its strengths, weaknesses, and the practical hurdles of integrating it into Ethereum's transaction framework.

## Falcon Signature Scheme - Technical Overview
[Falcon](https://falcon-sign.info/) (*Fast-Fourier Lattice-based Compact Signatures over NTRU*) builds upon the lattice-based signature framework of Gentry, Peikert, and Vaikuntanathan ([GPV](https://eprint.iacr.org/2007/432)). It applies this framework to NTRU lattices and employs a "fast Fourier sampling" trapdoor sampler. The scheme relies on the Short Integer Solution (SIS) problem over [NTRU](https://en.wikipedia.org/wiki/NTRU) lattices, which is considered computationally hard to solve in the general case, even with quantum computers, as no efficient solving algorithm is currently known.



### Core Components

Falcon is based on the **hash-and-sign** paradigm and is an evolution of the traditional RSA signature scheme. However, instead of relying on number-theoretic problems, it leverages the hardness of lattice-based problems. Falcon's security is based on the hardness of finding short vectors in NTRU lattices, leveraging **Gaussian sampling** techniques for generating trapdoor bases with reduced norms. This ensures efficient key generation and signing.

1. **Key Generation:**  
   - Given an NTRU polynomial ring $( \mathbb{Z}[X] / (X^n + 1))$, a private key consists of two short polynomials $( f, g )$ satisfying the NTRU equation.  
   - The public key is derived as $( h = g / f )$ in the ring $( \mathbb{Z}_q[X] / (X^n + 1) )$.

2. **Signing Process:**  
   - A message is hashed into a challenge vector in the lattice domain.  
   - A short solution is sampled using **fast Fourier sampling**, ensuring a compact signature size while maintaining security against lattice reduction attacks.  
   - The signature consists of the short lattice vector satisfying the challenge.

3. **Verification:**  
   - The verifier checks whether the signature satisfies the public key relation in the lattice ring.  
   - Verification involves computing norms and ensuring the validity of the lattice basis under modular arithmetic.

Falcon is designed to offer a robust post-quantum signature solution, combining lattice-based cryptography with efficient sampling techniques. While its security benefits are clear, like any cryptographic system, it presents certain trade-offs in terms of complexity and implementation challenges. Now, let's break down the highlights, potential pitfalls, and some of the more challenging aspects of Falcon.


## The Good

Aside from the well-known benefits highlighted by NIST, such as **Compact Signatures**, **Fast Operations** (efficient key generation and verification via FFT techniques), and **Security Proofs** (relying on lattice reductions and worst-case hardness assumptions). Falcon also provides Ethereum-specific advantages. Notably, it has a well-defined **worst-case running time**, making it particularly useful for the Ethereum Virtual Machine (EVM), where predictable performance and execution times are essential for scalability and reliability.



## The Bad

Falcon’s reliance on **floating-point arithmetic** and specialized number-theoretic transforms (NTT/FFT) can lead to **implementation complexity** and sensitivity to side-channel vulnerabilities during **signing**. However, this is **NOT** a significant concern for Ethereum, as signing occurs off-chain, where performance is less critical. The main focus is on optimizing the verification process, which happens on-chain, ensuring efficient and secure execution.

## The Gnarly

There has been ongoing research into efficiently aggregating Falcon signatures, such as the work presented in this [paper](https://eprint.iacr.org/2024/311). Assuming the aggregation will be efficient enough, using Falcon in the consensus layer to replace the BLS signature (instead of the [alternative proposal](https://eprint.iacr.org/2025/055.pdf) based on Hash-Based Multi-Signatures) would help maintain a more homogeneous stack across the Ethereum network.



## Conclusion


Falcon is a strong candidate for post-quantum cryptography applications, including blockchain systems like Ethereum, where signature size and verification efficiency are critical. In Part 3 of the series, we will begin implementing the hybrid approach introduced in [Part 1](https://ethresear.ch/t/so-you-wanna-post-quantum-ethereum-transaction-signature/21291/1), initially focusing on **Account Abstraction** and a **Solidity contract for Falcon verification**, bridging the gap between post-quantum security and Ethereum’s current infrastructure.