*By [Conor McMenamin](https://x.com/ConorMcMenamin9) and [Artem Grigor](https://x.com/ElusAegis), both [Nethermind](https://www.nethermind.io/).*

## Abstract

As AI agents become autonomous economic participants — calling APIs, purchasing compute, and transacting on behalf of users — existing payment infrastructure exposes a critical privacy gap. Current protocols reveal which agents a user pays and how much, leaking intent and behavior patterns. A centralized facilitator can hide this information, but at the cost of introducing a single point of trust. PrivateX402 is a payment channel protocol that enables a user to allocate budgets across many agents inside a single channel while hiding individual allocations from on-chain observers — without relying on a trusted intermediary. Set-up and settlement of N user-agent channels (for arbitrary N) requires only 1 set-up and 1 settlement transaction per user -- 2 transactions covering the lifecycle of N channels. Agent claims are batched across many channels themselves, obfuscating per-channel claims and unlocking significant gas savings vs per-channel collection. Proofs in PrivateX402 are concentrated at channel lifecycle boundaries rather than proofs being per-payment. This article describes the protocol, [a working proof-of-concept implementation](https://github.com/ConorNethermind/PrivateX402), and paths toward production deployment.



## 1. The Problem: Payment Privacy in Multi-Agent Systems



### 1.1 The Rise of Agentic Payments



Large language models with tool-calling capabilities are rapidly evolving into autonomous agents that transact on behalf of users. A single user session might involve an LLM orchestrator delegating tasks to a code execution agent, a web search agent, and a data analysis agent — each requiring payment for their services.[ x402](https://github.com/coinbase/x402) has been a key step in this direction enables machine-to-machine payments via the HTTP 402 status code.



### 1.2 The Privacy Gap



Existing payment channel designs — state channels, the Lightning Network, and x402 itself — assume direct bilateral payment relationships. When a user opens individual payment channels with multiple agents, or makes direct on-chain payments, the transaction graph reveals:

* **Which agents the user interacts with** — exposing the user's tooling choices and workflow
* **How much each agent is paid** — revealing the relative importance of each service
* **Payment timing and frequency** — enabling behavioral fingerprinting



In a multi-agent setting, this information is particularly sensitive. If a user allocates 80% of their budget to a medical research agent and 20% to a pharmacy lookup agent, on-chain observers can infer health conditions. If a competitive intelligence agent receives large payments shortly before a business decision, rivals can infer strategy.



### 1.3 What's Missing

A centralized payment facilitator — a custodial hub, a managed API gateway — can trivially solve the privacy problem: it sees all payments, but the blockchain doesn't. However, centralization introduces a single point of trust that can censor transactions, surveil user behavior, or misappropriate funds. In the context of autonomous AI agents, where payment flows may encode sensitive user intent, delegating that trust to a single operator is a poor trade-off.

To our knowledge, no deployed protocol simultaneously provides:

1. **Multi-agent budget allocation** within a single channel (one deposit covers many agents)
2. **Per-agent privacy** where individual allocations are hidden from on-chain observers
3. **Verifiable settlement** ensuring agents receive correct payments without trusting the user
4. **Dispute resolution** for agents who are underpaid or excluded
5. **No trusted intermediary** — no single entity that can censor, surveil, or misappropriate channel funds

PrivateX402 addresses this gap. The protocol replaces the centralized facilitator with a verifiable computation layer — currently a TEE, designed to be replaceable by ZK circuits — that enforces settlement correctness without any party having privileged access to the channel state.

### 1.4 Related Work and Positioning

Recent work has started to explicitly target privacy-preserving, high-frequency payments for AI and API usage. Notably, the Ethereum Research post [ZK API Usage Credits: LLMs and Beyond](https://ethresear.ch/t/zk-api-usage-credits-llms-and-beyond/24104) (Davide & Vitalik) proposes a deposit-once model where a user can make many API calls unlinkably, using Rate-Limit Nullifiers (RLN) plus a ZK solvency proof to ensure the user stays within their funded credit, with provider-issued refund tickets for variable-cost calls and a dual-staking mechanism for policy enforcement.

PrivateX402 is complementary but targets a different point in the design space:

- **Lightning / state channels / x402**: These are strong payment rails, but they do not, by themselves, hide the user-to-agent payment graph from on-chain observers when a user pays many independent agents via per-agent settlement or per-agent channels. PrivateX402 specifically hides the *per-agent* breakdown on-chain; each paid agent still learns its own receipts and allocation.
- **Custodial gateways / API aggregators**: A hub can hide the per-agent breakdown from the chain, but it becomes a trusted intermediary with visibility into (and potential control over) the full payment graph.
- **Single-provider private metering (RLN)**: ZK usage credits focus on unlinkable requests against a single provider (server in their terms), requiring per-request ZK-proofs. With RLN, a user interacting with N independent providers generally needs N deposits/commitments. PrivateX402 covers N agents with a single deposit and keeps payments proof-free (per-payment signatures only), concentrating proofs at setup/settlement/claim.
- **Multi-party settlement and disputes**: PrivateX402 includes an explicit settlement/dispute/claim lifecycle so each agent can enforce correct payment if the user lies at settlement time; this is orthogonal to policy-accountability mechanisms like RLN slashing or terms-of-service staking.


## 2. Protocol Design

### 2.1 Overview

The protocol has seven phases: **Setup**, **Register**, **Payment**, **Settlement**, **Dispute** (optional), **Finalize**, and **Claim**. 

Note: All proofs are generated by the TEE or ZK prover. 
![Screenshot 2026-02-18 142532|584x500](images/jAxFmJMIxEl5cKQRCoqR0TlAzqC.png)


### 2.2 Channel Setup

A user selects a set of agents and assigns each a maximum budget (`MaxSpend`). These allocations are encoded as leaves in a Merkle tree:

```
Leaf = H(SessionKey, AgentAddress, MaxSpend)
```

Each `SessionKey` is a random 256-bit secret shared only between the user and the corresponding agent. The user submits the Merkle root and a proof (`P_alloc`) that the sum of all `MaxSpend` values equals the deposited `TotalMaxSpend`. The contract stores only the root and total funding — individual allocations remain private.

A collateral deposit of 50% of `TotalMaxSpend` is required at setup. This collateral is burned if the user cheats during settlement, or returned on honest finalization.

### 2.3 Off-Chain Payments

Payments happen entirely off-chain via EIP-191 signed cumulative receipts. On first contact, the user sends a Merkle inclusion proof demonstrating the agent's leaf exists in the committed tree. The agent verifies the proof against the on-chain Merkle root, confirms its own address is in the leaf, and extracts its `MaxSpend` budget.

Subsequent payments are lightweight: the user signs a new cumulative amount (e.g., "I've now spent 3 ETH with you"), and the agent verifies the signature and that the new total doesn't exceed `MaxSpend`. No Merkle proof is re-sent — the budget is immutable.

### 2.4 Settlement via Split Encryption

When the user wants to close a channel and reclaim unspent funds, they submit a total unspent Remainder which should total to the unspent allocation from each agent in the channel. The user also sends encrypted settlement data for every agent slot:

```
EncryptedAmount[i] = Amount[i] XOR H(SessionKey[i], 0)
EncryptedInfo[i]   = Address[i] XOR H(SessionKey[i], 1)
```

The domain separator (0 for amounts, 1 for addresses) ensures amount and address are encrypted independently. A proof (`P_settle`) verifies that decrypting all entries with the correct session keys produces amounts that sum to `TotalMaxSpend - ReturnAmount`.

The critical security property: if a user provides a fake session key to understate an agent's payment, the decrypted amount will be a random 256-bit value. Since the proof enforces `Amount < 2^64`, a fake key fails with overwhelming probability (~1 - 2^-192).

### 2.5 Dispute Mechanism

After settlement is initiated, a dispute window (1 day) opens. Any agent who believes they were underpaid or excluded can submit a dispute containing their payment receipt, Merkle proof, and session key. The contract:

1. Verifies the Merkle proof and EIP-191 signature on-chain
2. Decrypts the agent's entry using the revealed session key
3. Compares the decrypted amount against the signed receipt

If the dispute is valid, the channel is marked as `Disputed`, the user's collateral is burned (sent to `address(0)`), and the disputing agent receives their claimed amount. Other agents can then call `disputeClaimMaxSpend` to recover their `MaxSpend` allocations from the remaining channel funds.

Privacy note: disputing reveals the agent's association with the user, since the session key is exposed. This is an intentional trade-off — privacy is sacrificed only when the user has cheated.

### 2.6 Epoch-Based Batch Claims

Honest settlements are finalized after the dispute window expires. At finalization, the channel's data is accumulated into a rolling epoch hash chain:

```
entryHash = H(channelId, merkleRoot, encryptedValuesHash)
epochHash = H(epochHash_prev, entryHash)
```

Agents batch-claim across all channels settled within an epoch by submitting a single aggregated proof (`P_claim`). The proof demonstrates ownership of funds in multiple channels by reconstructing the epoch hash, decrypting per-channel entries, and verifying Merkle inclusion — all without revealing which specific channels the agent participated in (beyond the total claim amount).

### 2.7 Privacy Properties

| Observer | Learns | Does NOT learn |
|---|---|---|
| On-chain observer | Total channel funding, settlement timing | Per-agent allocations, agent identities |
| Other agents | Their own allocation | Other agents' allocations or identities |
| Epoch observers | Total claim per agent per epoch | Per-channel breakdown of claims |

### 2.8 Cost Efficiency

Beyond privacy, the protocol achieves significant cost reductions compared to naive alternatives by amortizing on-chain and proving costs across agents and channels.

**O(1) setup gas.** A single on-chain transaction funds a channel covering N agents. The alternative — opening N bilateral payment channels — requires N separate deposits, each incurring base transaction gas plus contract storage writes.

**Zero-cost off-chain payments.** Each payment is an EIP-191 signature computed locally by the user and verified locally by the agent. No on-chain transaction, no ZK proof, no network communication beyond the user-agent link. This contrasts sharply with per-payment ZK approaches where every API call requires proof generation (seconds of latency, significant compute).

**Settlement: O(1) tx, O(N) data availability.** A single on-chain transaction settles the channel for all N agents (instead of N close/withdraw transactions), but publishing `EncryptedAmount[i]` / `EncryptedInfo[i]` for each agent slot is O(N) in calldata unless moved to blob/DA layers with a commitment.

**O(1) batch claiming.** An agent serving M channels within an epoch submits a single aggregated proof and receives a single transfer, rather than M separate withdrawal transactions. Gas savings scale linearly with channel count.


**Proofs concentrated at lifecycle boundaries.** The protocol requires proofs only at three points: setup (`P_alloc`), settlement (`P_settle`), and claim (`P_claim`). For a channel with 100 agents where each makes 1,000 payments, this means 3 proofs total — not 100,000. The overwhelming majority of protocol activity (off-chain payments) is proof-free.

| Operation | PrivateX402 | N Bilateral Channels | Per-Payment ZK |
|---|---|---|---|
| N agent Setup (on-chain) | 1 tx | N txs | 1 tx |
| Register |  N proofs | N proofs | - |
| Payments | Free (signatures only) | Free (signatures only) | 1 ZK proof per payment |
| Settlement (on-chain) | 1 tx | - | - |
| Agent withdrawal | 1 tx per epoch (batched) | N txs | N txs |
| Total proofs (N agents, K payments each) | N | - | N × K |
| Total txs (M channels, N agents each) | 2M + N | M × 2N | M × (N +1)  |

## 3. Proof-of-Concept Summary

A working proof-of-concept exists across Solidity and Rust: a single smart contract manages the channel lifecycle; a user library creates channels and issues cumulative receipts; an agent server verifies registration proofs and receipts; and a pluggable proof backend currently uses a mock TEE (with ZK circuits drafted but not integrated). For the full protocol description, see [Protocol Specification](https://github.com/ConorNethermind/PrivateX402/blob/746ddf3744c68661bbfc1a405ecc64a009ffb438/docs/protocol-specification.md). For implementation details and known issues, see [Next Steps & Known Issues](https://github.com/ConorNethermind/PrivateX402/blob/746ddf3744c68661bbfc1a405ecc64a009ffb438/docs/next-steps.md).

## 4. Key Design Decisions

**Cumulative receipts over delta receipts.** Each payment receipt contains the cumulative total spent, not the increment. The agent keeps only the latest receipt with the highest amount. This simplifies receipt management and dispute logic — a single receipt proves the total obligation.

**No channel adjustment.** Modifying a live channel's Merkle tree would leak the difference between old and new funding, potentially revealing a newly added agent's budget. Channels are immutable once opened; users create new channels for changed allocations.

**Collateral as deterrence.** The 50% collateral requirement creates a direct economic cost for fraudulent settlement. Combined with the dispute mechanism, a rational user has no incentive to cheat: they lose 50% of their deposit for certain if any single agent disputes, while gaining at most the underpaid amount.

**Pluggable verification.** All cryptographic verification is injected via interfaces at deployment. This enables the same contract to work with TEE signatures today and ZK proofs tomorrow, without redeployment or migration.

**Epoch batching for claim privacy.** Without epochs, each agent claim would link one agent to one channel. Epoch batching aggregates multiple channels into a single claim, reducing the information leaked about per-channel participation.

## 5. Status and Next Steps

The protocol is implemented as a working PoC, but key production work remains. Decentralization maximalists may prefer integration of ZK over TEEs; this repo keeps both paths open (TEE now, ZK later). That said, TEEs reduce costs and offer more flexibility.  Some interesting add-ons could include the ability to top-up channels, extend channels to more agents, or not fix the agents in a channel at creation time. Initially, these seem like they would either add complexity or gas-costs -- creating new channels likely makes most sense. Integration of PrivateX402 with a coin-mixer to enable users to buy privacy coins, hold them for mixing, and then use these to create multi-agent channels as we describe is also a viable extension. 

## 6. Conclusion

PrivateX402 demonstrates that privacy-preserving payment channels for multi-agent AI systems are practical, cost-effective — and that they can be built without a trusted intermediary. The protocol hides per-agent budget allocations behind set commitments and encryption, while preserving on-chain settlement guarantees through a combination of a dispute mechanism and verifiable proofs. By replacing a centralized facilitator with a verifiable computation layer (TEE today, ZK tomorrow), the protocol eliminates the single point of trust that would otherwise have access to the full payment graph.

The design also achieves substantial cost efficiency: a single on-chain deposit covers any number of agents, off-chain payments are proof-free signature exchanges, and agents batch-claim across channels in one transaction per epoch. On-chain cost scales with the number of users, not the number of agents or payments.

The proof-of-concept implements the full protocol lifecycle across Solidity smart contracts and a Rust workspace, with a TEE trust backend operational in mock mode and ZK circuits written but pending integration. The architecture is designed for backend interchangeability between TEE and ZK.