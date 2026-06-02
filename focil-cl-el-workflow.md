![Screenshot 2024-09-30 at 14.48.26|500x500, 90%](images/8HWOgcuPBpmNkdCPcXGptQU7XRo.jpeg)

by [Thomas Thiery](https://ethresear.ch/u/soispoke/summary), on `September 30th, 2024`

*Thanks to [Julian](https://x.com/_julianma), [Terence](https://ethresear.ch/u/terence/summary), [Jihoon](https://x.com/jih2nn), [Jacob](https://ethresear.ch/u/jacobkaufmann/summary) and [Anders](https://ethresear.ch/u/aelowsson/summary) for their input and feedback on this post.*

## Introduction

Fork-Choice enforced Inclusion Lists (FOCIL) is a mechanism designed to enhance Ethereum's censorship resistance and chain neutrality properties by enforcing timely transaction inclusion. Since its [inception](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870), our focus has shifted towards working on an EIP and specifying its implementation on both the [consensus layer](https://github.com/terencechain/consensus-specs/pull/2) (CL) and the execution layer (EL). This document outlines the workflow of FOCIL, detailing the roles and responsibilities of various participants, including IL committee members, nodes, proposers, and attesters. It also addresses potential edge cases and mitigation strategies to ensure the robustness of the mechanism.

## Roles & Participants 

### IL committee members

- Slot $n$, `t = 0 to 9s`: IL committee members construct their local ILs and broadcast them over the P2P network after processing the block for slot $n$ and confirming it as the head. If no block is received by `t = 8s`, they should run `get_head` and build and release their local ILs based on their node's canonical head.

    > *By default, local ILs are built by selecting raw  transactions from the public mempool, ordered by priority fees, up to the local IL's maximum `gas` limit (we could also set a limit in `bits` if we consider that local ILs mostly consume bandwidth). Additional rules can be optionally applied to maximize CR, such as prioritizing valid transactions that have been pending in the mempool the longest.*


### Nodes

- Slot $n$, `t = 0 to 9s`: Nodes receive local ILs from the P2P network and only forward and cache those that pass the CL P2P validation rules.
- Slot $n$, `t = 9s`, _IL freeze deadline_: Nodes freeze their local ILs view, stop forwarding and caching new local ILs. 

    > **CL P2P validation rules:**
    >- *The number of transactions in the local IL does not exceed the maximum `gas` limit allowed.*
    >- *The slot of the local IL matches the current slot. Locals ILs not matching the current slot should be ignored.*
    >- *The parent hash of the IL is recognized.*
    >- *The IL is received before the local IL freeze deadline (e.g., `9s`) into the slot.*
    >- *Received two or fewer local ILs from this IL committee member (see Local IL equivocation section below).*
    >- *The local IL is correctly signed by the validator.*
    >- *The validator is part of the IL committee.*

### Proposer

- Slot $n$, `t = 11s`: The proposer freezes its view of local ILs, and asks the EL to update its execution payload by adding transactions from its view (the exact timings will be defined after running some tests/benchmarks). Optionally, an RPC endpoint can be added to allow the proposer to request the missing local ILs from its peers (e.g., by committee index).

    > *By **(1)** allowing sufficient time between the local IL freeze deadline and the moment the proposer must broadcast its block with the updated execution payload, and **(2)** potentially adding a mechanism for the proposer to request missing local ILs from peers via an RPC endpoint, we ensure that the proposer's IL aggregate contains *all* transactions observed local ILs, thus eliminating the need for the Δ parameter described in the  [FOCIL research post](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870).*


- Slot $n+1$, `t = 0s`: The proposer broadcasts its block with the up-to-date execution payload satisfying IL transactions over the P2P network. 

### Attesters

- Slot $n+1$, `t = 0 to 4s`: Attesters monitor the P2P network for the proposer's block. Upon detecting the block, they check whether all transactions from their cached local ILs are included in the proposer's execution payload. The $Valid$ function verifies if the execution payload satisfies IL validity conditions either when all transactions are present or when any missing transactions are found to be invalid when appended to the end of the payload. In these cases, attesters use the EL to verify the validity of missing transactions.

    >Since we set $Δ = 0$ (or rather, got rid of the parameter altogether), the proposer's execution payload must contain at least all transactions from the attester's local ILs. Therefore, the attester does not need an IL aggregate from the proposer to perform this check.

## Mitigations and Edge Cases

### Invalidation
By having attesters use the $Valid$ function to check if each missing transaction would be valid when added to the end of the execution payload, we ensure that FOCIL is compatible with account abstraction.

To handle invalidation cases—including those introduced by full Account Abstraction (AA)—attesters use the $Valid$ function to verify each missing transaction from the execution payload. They check whether each missing transaction would be valid if appended to the end of the execution payload using the EL.

By evaluating missing transactions in the context of the execution payload's post-state, attesters can accurately determine whether the proposer has wrongly omitted any valid transactions from the ILs. If a missing transaction is found to be invalid when appended—due to state changes caused by earlier transactions—the proposer isn't penalized for leaving it out, and the IL validity condition is satisfied.

This approach effectively handles invalidation scenarios and provides a robust mechanism that accommodates the complexities of transaction validity, ensuring that all valid transactions from local ILs are included whenever possible.

### Equivocation

To mitigate local IL equivocation, attesters should stop caching local ILs after the freeze deadline but continue to monitor the P2P network and forward multiple local ILs from the same IL committee member. If the proposer or attesters detect that a committee member has broadcast multiple local ILs (i.e., has equivocated), they should ignore all local ILs from that member.

We also introduce a P2P network rule that limits nodes to forwarding no more than two local ILs per validator index. This approach ensures that information about equivocation spreads while preventing spam, keeping the maximum bandwidth increase to at most `2×`.

It is also worth noting that the IL aggregate doesn't exist as an explicit object in FOCIL; instead, the proposer includes transactions from the local ILs directly into the execution payload. Therefore, there is no IL aggregate that can cause equivocations.

### IL stuffing
We also considered IL stuffing, where a builder floods the mempool with transactions they plan to invalidate later—such as by draining the account’s ETH to prevent base fee payment or causing the transactions to revert. However, this attack is risky because the builder must submit these transactions to the mempool before the target block, without knowing if they will secure the right to build it. This means another builder could win the block, include and execute the transactions intended to be invalidated, making the attack costly and impractical.