Special thanks to Thomas, Julian, Barnabe, and Jihoonsong for reviewing it

This document was motivated by our work on the [FOCIL consensus spec](https://github.com/terencechain/consensus-specs/pull/2), where we realized that the protocol required more thoughtful consideration around resource constraints since certain details were not explicitly specified in the [FOCIL Ethereum research post](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870).

# Prerequisite
Before we begin, we assume the following setup to establish a clean baseline for our considerations:
- The setup is based on the Electra hard fork. It also makes sense to revisit this on top of EIP-7732 (ePBS) for comparison
- We are assuming solo block building and releasing, where the proposer is not running MEV-Boost. This is the first key component to get right, while the Builder API is a secondary consideration
- We are assuming a solo staker setup with typical compute, memory requirements, and bandwidth that you can easily follow on the Ethereum chain today

# Actors
Before we proceed, we assume the following actors are part of the protocol and analyze their responsibilities:
- Inclusion List (IL) committee members, who are responsible for constraining the next slot proposer by its set of inclusion list transactions
- The proposer, who is responsible for proposing the next slot
- Attesters, who are attesting to the next slot for the head of the chain
- Nodes, which are verifying and following the chain. Proposers and attesters are part of nodes that have staked Ether

# Timeline
We assume the following timeline in which the IL committee, proposer, and attesters perform some honest actions:
- Slot `n-1`, `t=6`: The IL committee publishes their local Inclusion Lists (ILs) over a global topic after learning the contents of block `n-1`
- Slot `n-1`, `t=9`: Attesters and honest verifying nodes lock in their view of the local ILs
- Slot `n`, `t=0`: The block proposer for slot `n` releases block `B`, which includes the payload which should satisfy the IL requirement
- Slot `n`, `t=4`: Attesters for slot `n` vote on block `B`, verifying the IL aggregation by comparing it to their local IL views and confirming whether block `B` is "valid"
	- We overload the word "valid" when referring to a block, but it could mean "importable," "canonical", or something else. See the open question for further clarification

## Interval 1: IL Committee Releases Local IL
### Actor: Inclusion List Committee
IL committee members retrieve a list of IL transactions from EL client given the head (CL -> EL call), then they sign the local IL (transactions + summaries) and release it to the gossip network.

#### Resource Considerations
- Retrieving IL transactions from the EL mempool -> CPU/MEM
- Signing the inclusion list -> CPU
- Uploading the inclusion list to the gossip network -> Bandwidth (Upload)

### Actor: Nodes (including Attesters)
Nodes following the chain will download the IL, verify it for anti-DOS (not importing it to EL yet), and forward it to other peers. Nodes also import the IL into fork choice and track which ILs have been seen using an aggregate cache. Attesters and nodes following the chain should have the same view of the chain.

#### Resource Considerations
- Downloading the IL -> Bandwidth (Download)
- Forwarding the IL -> Bandwidth (Upload)
- Verifying the IL for anti-DOS -> CPU/MEM
- Caching seen and aggregate ILs -> MEM

### Actor: Proposer
The proposer for the next slot actively monitors the IL gossip network and, collects and aggregates the local ILs, then at IL aggregation cutoff (interval #2) proposer updates the block-building process with a list of IL transactions to be included for its block. This requires a CL to EL call.

#### Resource Considerations
- Inherits the same costs as nodes following the chain

#### Proposer Edge Case
If the next slot's proposer observes a sufficient number of inclusion lists based on a parent hash it hasn’t seen, the proposer will need to manually request the missing beacon block, import the block, and build on top of that block.

### Conclusion
Based on the above, we can identify potential resource-intensive areas and narrow down on them:
- **IL Committee's CPU impact**: IL transaction retrieval from EL & signing: while there are resource demands here, this is presumed to be relatively inexpensive and not a major concern.
- **Nodes bandwidth impact**: Nodes downloading and uploading ILs may use tons of bandwidth, especially research post currently states that the inclusion list size is flexible/unbounded. This introduces a potential DOS risk, as a malicious IL committee member could flood the network with a large number of transactions, even if they are invalid. Nodes would still gossip about the IL before they import the ILs. Anti-DoS measures need to be considered carefully.

## Interval 2: Nodes lock their view, proposer import IL transactions
### Actor: Proposer
The proposer updates block building process with a list of inclusion list transactions. This is a CL -> EL call.

#### Resource Considerations
- Updates block building process with a list of inclusion list transactions -> CPU/MEM

### Actor: Nodes (including Attesters)
Lock inclusion list view. Stop accepting local inclusion list from this point.

#### Resource Considerations
- Lock local inclusion list view -> None

### Conclusion
- **Proposer's CPU impact**: Importing the IL transactions into the block-building process could disrupt the block building process, potentially straining the execution layer client’s CPU during transaction simulation. This may become complicated under account abstraction as transactions may invalidate each other. This should be further analyzed.


## Interval 3: Proposer Releases Block
### Actor: Proposer
The proposer retrieves the execution payload from the EL client (CL -> EL call), and releases it to the beacon block gossip network. Everyone else then verifies the block.

#### Resource Considerations
- Retrieving the payload from the EL client -> CPU/MEM

### Actor: Nodes
Nodes receive the beacon block and verify it. The new verification steps include checking the inclusion list aggregate construction and confirming whether the inclusion list satisfies the evaluation function, which is be completed on the CL. The checking of IL conditions (whether they can be skipped due to conflicts or not) will be performed on the EL.

#### Resource Considerations
- Verifying that the inclusion list is satisfied on CL -> CPU
- Verifying inclusion list conditions on EL -> CPU

### Conclusion
The additional duties for the proposer do not seem to be a significant concern. The new verification steps for nodes—checking verifying that the inclusion list meets the satisfactory conditions—may introduce some additional CPU load, but it doesn't appear to be a major issue.

## Interval 4: Attester Committee
### Actor: Attester
The attester votes for the beacon block using LMD GHOST fork choice rule. Attesters will only vote for a beacon block that satisfies the inclusion list evaluation function, based on observations from Interval 1.

### Resource Considerations
- Attesters voting for a block that satisfies the inclusion list evaluation function -> No additional cost

### Conclusion
There is no difference than today.

# Resource Consideration Summary
As seen above, the most significant resource concerns revolve around inclusion list upload, download, and the potential for spamming from a node's perspective. Another key concern is the overhead on nodes for verifying and importing the inclusion list, as well as the proposer's need to update its block-building process to satisfy the inclusion list. These aspects require careful consideration and design to ensure efficiency and security.

# Open Questions
Based on the above, we outline several open questions that will influence how the specification is written:
1. **Block Not Satisfying the Evaluation Function**: How should a block that fails the inclusion list evaluation function be handled, and what design considerations come into play for such conditions?
   - Should it be treated similarly to blobs and **cannot be imported**?
   - Should it **not be filtered** by fork choice?
   - Should it **not be valid** in the state transition function?

2. **Inclusion List Equivocations**: If an inclusion list committee member sends different versions of the inclusion list to different nodes, and they are all propagated across the network, what are the consequences of this action? How could such behavior negatively impact the proposer building the next block?

3. **Proposer Already Building on a Different Head**: If the proposer builds on a different head than the one sent by the inclusion list committee, and thus needs to change its head view, what are the consequences of this action for block validity and proposer behavior?

4. **Inclusion List Transactions Invalidations**: Local inclusion list transactions can be invalidated in a few ways. Even if these transactions are invalidated, the block should still be able to satisfy the evaluation function. Transactions may be invalidated as multiple inclusion lists merge with each other or with transactions in the block. Besides typical nonce checking, account abstraction introduces new ways for transactions to be invalidated, as balance can be drained with a static nonce. How much additional simulation a block builder needs to perform due to transaction invalidation and how much this affects its CPU compute remains to be seen for both MEV-Boost actors and local builders.

5. **Proposer's Observation of the IL Committee Subnet**: The proposer monitors the inclusion list committee subnet to know when it is ready to construct the aggregate. There are two design approaches here, and it's worth considering them further. The first approach is a greedy proposer, where the proposer waits until `t=9`, gathers as many ILs as possible, sends them to the EL, and the EL updates its block. The second approach is a selective proposer, where the proposer waits until it has a sufficient inclusion list to satisfy the eval function, sends them to the EL, and can do this in less than `t=9s` or even earlier. The question is whether the second approach justifies the optimization to allow the proposer to release the inclusion list aggregate earlier. The second approach may only be well suited for an IL with its own dedicated gas limit.