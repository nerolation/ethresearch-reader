# Delayed Execution Design Tradeoffs

*Thanks to Toni, Jacob, Thomas and Barnabé for comments. Final work is the author’s and reviews are not an endorsement!*

This document goes through three delayed execution designs and analyzes them from first principles. We start with a brief summary of each design, followed by defining some measurable objectives and design complexities and map them into individual design.

This document does not present these designs as competing alternatives. Example: EIP-7862 can be combined with EIP-7732 to give the proposer a one-slot delayed state root. We mainly aim to focus on the desired protocol properties and how it achieves them within the given complexity.

## Designs
### Delayed Execution State Root Inclusion for Proposer
This is [EIP-7862](https://eips.ethereum.org/EIPS/eip-7862). The proposer includes a delayed state root, preventing block production from being bottlenecked by state merklization. This removes the expensive state root computation from the block-propagation critical path, reducing block production latency.

### Delayed Execution Through Skipped Transaction
This is this [EIP-7886](https://eips.ethereum.org/EIPS/eip-7886). The block references execution output of a parent block, extending the execution deadline of block `n` to `n+1`. Cheap static validations are still performed before `n`'s attestation deadline, while more expensive execution are deferred to until `n+1`'s proposal deadline. To address free DA, the proposer/builder must commit sufficient balances to cover block space through a `COINBASE` signature. If a transaction in the block is later found to be invalid after the block is committed on-chain, the proposer will still be required to pay for the space.

### Delayed Execution Through Payload and Block Separation
This is [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732). The execution payload is physically separated from the beacon block, and it is revealed later than the beacon block. The payload for slot `n` has until the `n+1` beacon attestation deadline for verification. A slot may contain a beacon block without an execution payload. Fork choice is adjusted to a reveal/withhold boost-based design or an attestation-type counting design. The auction mechanism is irrelevant to EIP-7732, as our focus is on block and payload separation.

## Properties
Next, we analyze the impact on the following properties:
- Block preparation time: How much additional time do the proposer and builder have to prepare the block under timing constraints?
- Block propagation time: How much extra time does the beacon block have to propagate through the network?
- Execution payload propagation time: How much extra time does the execution payload have to propagate through the network?
- Blobs propagation time: How much additional time do blobs have to propagate through the network?
- Block verification time: How much time do nodes have to verify a block containing both consensus and execution?
- Implementation complexities: A brief overview of the key areas where implementation complexity arises.

## Designs + Properties
### Delayed State Root Computation for Proposer
- Gains block preparation time as the proposer/builder removes state merklization from the critical path
- Does not help block and blob propagation time
- Does not help block verification time except for pre state root validation assuming there's gain there
- Design complexity is low: The proposer/builder commits to the pre-state root instead of the post-state root. Nodes verifying the block check the correctness of the pre-state root rather than the post-state root. Implementation surface area touches: 1.) Execution Layer

### Delayed Execution Through EIP-7886 (Skipped Transactions)
- Gains block preparation time. It reaps the same benefits of the first design
- Gains block verification time. Before attestation deadline, only cheap validations need to be performed such as header field and gas limit boundary check. The actual execution can be done after the validation deadline (between second 4 to second 12)
- Does not gain block and blob propagation time. There are conversations about changing the attestation deadline, but it is irrelavant here. The block and blobs still have to arrive before attestation deadline for attesters to vote on the block. Blobs have 2 seconds to propagate before attestation deadline.
- Design complexity is non-trivial, mainly due to skipping transactions, which is the main execution-layer change and its a new paradigm. On the consensus layer side, the main changes are validator signing for`COINBASE` as a new requirement for self-building block. Which consits the following:
    - Validator signer changes signing `COINBASE` signature
    - Beacon API changes for submitting `COINBASE` signature
    - Engine API changes for adding `COINBASE` signature to `PayloadAttribute` field
    - Validator needs to sign `COINBASE` before the slot start

Alternatively, the EL client can sign over `COINBASE` to simplify things for the CL client, but this alters the entire infrastructure setup and adds complexity to the EL and how we view validators are the only signing entities.

### Delayed Execution Through EIP-7732 (ePBS)
- As the slot anatomy changes, the proposer/builder does not see the payload until the payload reveal deadline. This may shorten block preparation time, making it worse than before, but it's not a blocker since builders have time to adapt.
- In EIP-7732, the block still references the post-state root instead of the pre-state root, but this can be changed. EIP-7732 and EIP-7862 are complementary in this regard.
- Execution payloads are separated from the consensus block, which implies the following:
    - The consensus block must be propagated and verified before the attestation deadline, same as today.
    - The execution payload must be propagated before the payload attestation deadline.
    - Blobs must be propagated until the next slot’s attestation deadline. Blobs have 12 seconds to propagate
    - By separating payloads from blocks, there is more time for propagation, with blobs benefiting the most.
- The consensus block has until the beacon attestation deadline to be verified, which is unchanged across all proposals.
- The execution payload has until the next slot's beacon attestation deadline to be verified.
- Unlike skipped transactions, the majority of the design changes are now in the consensus layer, focusing on separating the payload from the beacon block. Validators must sign and broadcast the payload separately. The payload is received via gossip and an additional import path in the client. Fork choice complexity is low but remains to be evaluated in practice. Implementation surface area touches only consensus layer