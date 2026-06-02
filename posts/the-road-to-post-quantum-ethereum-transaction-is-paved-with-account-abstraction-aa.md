 *Thanks to Nicolas Bacca, Vitalik Buterin, Nicolas Consigny, Renaud Dubois, Simon Masson, Dror Tirosh,Yoav Weiss and Zhenfei Zhang for fruitfull discussions.*

**This is Part 3 of our series exploring the feasibility of implementing a post-quantum signature scheme for Ethereum**. In [Part 1](https://ethresear.ch/t/so-you-wanna-post-quantum-ethereum-transaction-signature/21291), we discussed the fundamental challenges and considerations involved in transitioning Ethereum to a quantum-resistant future. In [Part 2](https://ethresear.ch/t/falcon-as-an-ethereum-transaction-signature-the-good-the-bad-and-the-gnarly/21512), we took a deep dive into Falcon, analyzing its strengths, weaknesses, and the practical hurdles of integrating it into Ethereum’s transaction framework. In this installment, we build on that foundation by exploring how **account abstraction (AA) can be leveraged to integrate Falcon into Ethereum**. We’ll examine the architectural changes required, the benefits of using AA for post-quantum security, and the potential challenges in making this approach viable.

## Did you say ERC-4337?

When discussing **account abstraction (AA)**, the natural conclusion is to think about [ERC-4337](https://www.erc4337.io/), as it is currently the most prominent and widely adopted approach to enabling AA on Ethereum. ERC-4337 provides a way to implement smart contract wallets without requiring changes to the Ethereum protocol, making it a strong candidate for integrating post-quantum signature schemes like Falcon.
In particular, we can take inspiration from the [`SimpleWallet`](https://github.com/asanso/account-abstraction/blob/95d36a70162e48612dd25e2e28f77a95cf627e7f/contracts/samples/SimpleAccount.sol) smart contract or from smart contracts leveraging [RIP-7212](https://github.com/ethereum/RIPs/blob/eedf04cdeeb4feb141a271cede23260eb66d03b8/RIPS/rip-7212.md) to explore how Falcon can be efficiently integrated within the ERC-4337 framework.


### `SimpleWallet`

The [`SimpleWallet`](https://github.com/asanso/account-abstraction/blob/95d36a70162e48612dd25e2e28f77a95cf627e7f/contracts/samples/SimpleAccount.sol) is a smart contract-based wallet designed to implement **Account Abstraction** on Ethereum. Instead of using traditional private keys for transactions, a SimpleWallet smart contract allows for greater flexibility by enabling custom validation logic and potentially supporting new cryptographic signature schemes like **Falcon**. For instance, in the context of **post-quantum Ethereum**, the `SimpleWallet` could be adapted to work with **Falcon signatures**, allowing for more flexible, secure, and future-proof transaction processing. This smart contract approach would allow Ethereum accounts to evolve and support post-quantum cryptography without requiring changes to the underlying Ethereum protocol.

### `FalconSimpleWallet`

A `FalconSimpleWallet` would be a modified version of `SimpleWallet` that replaces **ECDSA** with **Falcon-based cryptography**. Unlike ECDSA, "plain" Falcon does **not** support **public key recovery** from a signature—meaning that `ecrecover` cannot be used. Instead, a Falcon-based wallet must verify signatures **directly against a stored public key**. 
However, as [Renaud Dubois](https://x.com/RenaudDUBOIS10) pointed out, **Section 3.12** of the [Falcon paper](https://falcon-sign.info/) introduces a **key recovery model**. This method allows for public key recovery, but it comes at the cost of **doubling the signature  size**. While this could provide a potential workaround for `ecrecover`-like functionality, the increased key size presents additional considerations for on-chain efficiency.


This difference means that Falcon-based wallets need an explicit mapping of **Ethereum addresses to public keys**, requiring a different approach to authorization. Rather than relying on `ecrecover` to derive the signer's identity, a `FalconSimpleWallet` would explicitly store and reference public keys for verification.

Additionally, integrating Falcon into the **Ethereum Virtual Machine (EVM)** requires deviating from the **NIST standard implementation**. Falcon relies on **SHAKE** for hashing, but since **SHAKE is not natively supported in the EVM**, we need to use a more **EVM-friendly hash function**, such as **Keccak**. This ensures compatibility and efficiency when verifying Falcon signatures on-chain.

*Kudos to [Zhenfei Zhang](https://x.com/zhenfei_zhang), who contributed a [Keccak256-based PRNG implementation for Falcon](https://github.com/zhenfeizhang/falcon-go/blob/8ae42f4142cdda1fbca4cdca4e850bcb9aee4584/c/keccak_prng.c#L2-L27), further bridging the gap between Falcon and Ethereum's cryptographic stack.*

### Show Me the Demo!

You can find the demo in [FalconSimpleWallet on GitHub](https://github.com/asanso/account-abstraction). This project showcases a wallet that replaces traditional ECDSA with **Falcon-based verification**, tailored for Ethereum's evolving security needs.

*A special shout-out to **[ZKNox](https://zknox.eth.limo/)**—their exceptional work on the [Falcon Solidity implementation](https://github.com/ZKNoxHQ/ETHFALCON) has dramatically cut verification costs from **24M gas down to 3.6M gas**. This impressive gas optimization brings post-quantum security a step closer to practical deployment on the blockchain. Kudos to ZKNox for their remarkable contribution!*


### The elephant in the room

While we have successfully transitioned the **smart wallet signature** to be **post-quantum (PQ) resistant**, there remains a critical issue: the **bundler transaction** still relies on the traditional **ECDSA** signature scheme. This means that even though individual user operations (`UserOps`) within the account abstraction framework can use Falcon, the final transaction submitted to the **Ethereum mempool** is still signed with **ECDSA** by the bundler.

To fully remove ECDSA from the transaction pipeline, changes at the **L1 protocol level** will likely be required, specifically via [EIP-7701](https://eips.ethereum.org/EIPS/eip-7701)/[RIP-7560](https://github.com/ethereum/RIPs/blob/eedf04cdeeb4feb141a271cede23260eb66d03b8/RIPS/rip-7560.md). 

### (Bonus part) Batching  

As mentioned in the **"Gnarly" section** of [Part 2](https://ethresear.ch/t/falcon-as-an-ethereum-transaction-signature-the-good-the-bad-and-the-gnarly/21512), there has been [ongoing research](https://eprint.iacr.org/2024/311) into efficiently aggregating Falcon signatures, including work involving **Labrador**. If this approach proves efficient, we could leverage [EIP-7766](https://eips.ethereum.org/EIPS/eip-7766) (**Signature Aggregation for ERC-4337**) to optimize Falcon signature aggregation within the AA framework—similar to how **BLS signatures** are aggregated in [this VerificationGateway contract](https://github.com/getwax/bls-wallet/blob/7671d78a1b96ceb9010362b09a5f255297c12d9d/contracts/contracts/VerificationGateway.sol#L85).  

## No soup (EIP-7702) for you!

As discussed in the context of [EIP-7702](https://github.com/ethereum/EIPs/blob/fa5ceb255acf88747d0483fc72a34a7983c00342/EIPS/eip-7702.md), the proposal might allow turning an account into an **ERC-4337** account and adding **Falcon** support, but it still retains the **ECDSA** key. The problem with **EIP-7702** is that the **ECDSA key remains valid** within this framework, which introduces a potential security risk. Even if the account starts using Falcon after setting the code, the presence of the **ECDSA key** leaves the account exposed. An attacker could potentially recover and misuse the ECDSA key to compromise the account.

This is why **EIP-7702** is problematic from a **quantum-resilience perspective**: it enshrines **ECDSA**, which is vulnerable to quantum attacks. Instead, the focus should be on **native Account Abstraction (AA)**, which removes any reliance on ECDSA and offers a more robust, quantum-resistant approach through smart contract wallets like the **`SimpleWallet`**. solution above.

## Conclusion
In this installment, we’ve explored how **Account Abstraction (AA)** can be leveraged to integrate **Falcon**, a **post-quantum signature scheme**, into Ethereum. By transitioning to a Falcon-based **smart wallet signature**, we can ensure a future-proof, quantum-resistant approach to Ethereum transactions.

While the adoption of Falcon-based wallets within the AA framework is a promising step, the ongoing reliance on **ECDSA** signatures for **bundler transactions** still presents a challenge. Overcoming this requires protocol-level changes, likely through **EIP-7701** or **RIP-7560**, to fully eliminate ECDSA from the transaction pipeline.

Additionally, research into **signature aggregation** for Falcon, as discussed in the **"Gnarly" section** of [Part 2](https://ethresear.ch/t/falcon-as-an-ethereum-transaction-signature-the-good-the-bad-and-the-gnarly/21512), presents an opportunity to further optimize Falcon's integration in the Ethereum network, particularly with the potential adoption of **EIP-7766** for **ERC-4337**.

However, since we are still using a smart contract for Falcon, which currently costs about **3.7M gas** per transaction, the next logical step is to move toward a **RIP** for Falcon, which would aim to optimize its integration and bring gas costs down for practical, on-chain use.

In conclusion, while we’ve made significant progress in integrating **post-quantum security** into Ethereum, there are still key challenges to address at both the **bundler** and **protocol levels** to ensure a complete transition to a quantum-resistant future.