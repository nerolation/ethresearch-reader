Special thanks to @Julian, @barnabe and @manav2401 for the reviews

## Background

Inclusion list have been an active topic since the [early](https://notes.ethereum.org/@vbuterin/pbs_censorship_resistance) [days](https://ethresear.ch/t/how-much-can-we-constrain-builders-without-bringing-back-heavy-burdens-to-proposers/13808). [Various](https://notes.ethereum.org/@fradamt/forward-inclusion-lists) [designs](https://notes.ethereum.org/@fradamt/H1TsYRfJc) have emerged over time, each with inevitable trade-offs concerning **What can be constrained within a single Ethereum slot?**. 
This post explores these trade-offs from the perspectives of **different actors** involved in ILs and defines the dependencies required for each actor to fulfill their role in integrating ILs into the protocol. We will compare and contrast multiple designs, focusing on the limitations related to **timing, security, and feasibility**.

First, we will outline some definitions.

## IL Definitions 

**Slot Time**: In the context of Ethereum, a slot refers to a fixed interval currently set at 12 seconds. During each slot, the proposer/builder proposes a block, attesters vote on the block, and an aggregator aggregates the votes. The proposer of subsequent slot includes aggregated votes in their block, and the cycle repeats. Today out-of-protocol builders have an ~8-second window to prepare for the next slot's block. All actions are synchronized with these validator duty intervals, and **IL should not extend the current slot time**.

**Inclusion List:** An inclusion list (IL) is a list of transactions that a block proposer commits to including in a block. Depends on the conditional vs unconditional constraint, if these transactions are not included in the block, then the block cannot be considered canonical, assuming honest attesters who will vote against the block. The IL consists of the following options and requirements.
1. **Satisfactory Requirement**:
   - **Conditional**: The IL does not need to be satisfied if the target block is full.
       - **Forward-Looking**: If the IL cannot be satisfied in the current target block, does it still apply to subsequent blocks? [More in this post](https://ethresear.ch/t/cumulative-non-expiring-inclusion-lists/16520)
   - **Unconditional**: The IL needs to be satisfied. This typically means the IL has its own gas limit.
2. **Satisfactory Time**:
   - **Same Slot IL**: The IL is satisfied within the same slot, similar to users sending a transactions wanting to be included on chain. With sufficient base fee and tip, we can expect the transaction to be included the slot of. For example, an IL transaction for slot `n+1` is satisfied in slot `n+1`.
   - **Next Slot IL**: The IL is satisfied in the subsequent slot with one slot delay. For example, an IL transaction for slot `n+1` is satisfied in slot `n+2`.
3. **IL constructor**: The actor responsible for preparing and broadcasting the IL to the network. This role can be fulfilled by a single entity (like a proposer) or by a committee where the protocol reaches consensus on individual ILs from its members. The consensus of IL may be reached by IL aggregate which represents IL committee's vote.
4. **IL Gas Limit**: IL gas limit has an implication on the size of IL which dirrectly affects the network propagation time and node's verification time.
5. **IL Ordering In Block**: When the IL becomes part of the block, the transactions may be required to be placed in a specific order. This order could be:
	- **Top of the Block**: Transactions are placed at the beginning of the block.
	- **Anywhere in the Block**: Transactions are placed anywhere within the block.
	- **Bottom of the Block**: Transactions are placed at the end of the block.
6. **Liveness Guarantee** The IL must be made available to the block builder to avoid stalling the chain's liveness. The delivery method of the IL to the builder varies based on the trust model. If a single person constructs the IL, stricter requirements may be necessary, such as additional attester validation along with the block.
7. **No Free DA** An IL that has not been satisfied in execution cannot be part of the consensus, as it would grant free DA. Free DA has to be tightly coupled with consensus and should not be mistaken for free bandwidth or temporary data storage. While nodes can use a small amount of bandwidth or store temporary data with anti-dos measures in place, this should not be conflated with free DA.

**Block Builder**: The actor tasked with fulfilling the IL and broadcasting the resulting product (ie. a block that fulfills the IL) over the network. In the case of a solo validator, the block proposer serves as the block builder, and the product is the execution payload of the block. For a MEV-boost validator, the block builder handles the fulfillment, which returns the signed header to proposer, and the relay broadcasts the final block to the network. It is often the case that the block proposer cannot verify the satisfactory fulfillment of the IL when signing the header request. Relays have to verify the payload satisfies IL ahead of time or assume optimistic.

**IL Transaction Invalidation**: Transactions in an IL may become **not includable** at the time of inclusion due to invalidations, such as an incorrect nonce or insufficient balance. This situation can arise under different conditions. For example, when multiple parties are involved in constructing their version of ILs, the transactions from each party might render each other not includable. Similarly, if one party constructs the IL while another party broadcasts the block at the same moment, there can also be invalidations, leading to mutual exclusion of the IL transactions and block transactions.

**Head Block**: Often referred to as the parent block, the IL should be constructed on top of the chain's head from the perspective of the node. The builder, responsible for constructing the block and satisfying the IL, should also build on top of the head block in order to make sure that block and inclusion list are aligned.
	**Constraint**: If an IL is built on head `a`, then to satisfy the IL, the builder's block must also be built on top of head `a`.

## IL Timings

**IL Preparation Time**: This is the time required for a party to prepare the IL, which is constructed on top of the head block. The larger the IL may require longer time to prepare.

**IL Propagation Time**: This is the time required for the IL to propagate across the network to other nodes. Factors influencing this time include the size of the IL, the number of ILs (committee size), and the network's gossip rules.

**IL Verification Time**: This is the time required to verify the IL. The IL must be valid, otherwise builders can get grieved. In some scenarios, attesters must verify the IL before considering the current slot block as the head (. In other cases, the proposer must verify the IL before proposing the next slot block. The point is that some parties must verify the IL beforehand, and it's crucial to consider who is bearing this cost.

**Block Preparation Time**: This is the time required to build an execution block. The block can be constructed either by the proposer or the builder. The IL's satisfactory requirements must be met in the block. This means the block builder must verify the IL, parent block and ensure that the block satisfies IL requirements.

**Block Propagation Time**: This is the time taken for a block to be transmitted across the network and received by all participants. It's crucial that the block is received and verified by attesters promptly, as delays can lead to the block not being considered as the head of the chain, increasing the risk of reorg.

**Block Verification Time**: This is the time taken for a node to verify the block and IL. The focus here is on execution verification time, as consensus verification is typically fast. A block must be verified as execution valid and meet the IL requirements before it can be considered the head of the chain.

Based on the timing definition provided, we can outline the following dependencies:
* The parent head block `n` must be released before attestation cut off. The difference is between start of the slot. Head release time = $T_{HR}$
* The head block must be propagated to peers on time. Head propagation time = $T_{HP}$  
- The IL constructor must see and validate the parent head block before creating the IL. Head validator time = $T_{HV}$
- The IL must be constructed and released using for example a local mem pool. IL construction time = $T_{ILC}$ 
- The IL must propagate through the network to reach the builders. IL propagation time = $T_{ILP}$
- The block builder needs to verify the IL before submitting a bid.  IL verification time = $T_{ILV}$
	- This requirement may change in the context of slot auctions.
- The proposer must see the bids before submitting a block. Bid propagation time = $T_{BP}$ 
- The attester must verify the block `n+1` before considering it as the head. We can reuse head verification time above.

In short, we could summarize: A single Ethereum slot should not exceed the following durations, ensuring that the end-to-end IL is applied, and the block remains canonical on the chain: $SLOT >= T_{HR}+T_{HP}+2 * T_{HV}+T_{ILC}+T_{ILP}+T_{ILV}+T_{BP}$

# Different versions of IL
Different versions of IL have varying constraint trade-offs. Some examples taken from [EIP-7547](https://eips.ethereum.org/EIPS/eip-7547) and [FOCIL](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870).

#### EIP-7547 in MEV-Boost
- The block builders for slot `n` constructs a block for slot `n` after verifying the block for slot `n-1`.
- The block proposer of slot `n` constructs an IL for slot `n+1` after verifying the block for slot `n-1`.
- The IL for slot `n+1` and the block for slot `n` may invalidate each other if they are sent by different parties.
- The block proposer/builder of slot `n+1` requires the IL and the block for slot `n` to build a block.
- The block proposer of slot `n+1` needs the IL and the block for slot `n` to build an IL.
- Attesters for slot `n+1` need the IL and the block for slot `n` to attest to the block. The block for slot `n+1` must link to a valid IL `n+1`, or it cannot be canonical.

#### EIP-7547 in ePBS (EIP-7732)
- The block proposer of slot `n` selects the builder's bid of slot `n` after verifying the execution block for slot `n-1`.
- The block proposer of slot `n` constructs an IL for slot `n+1` after verifying the execution block for slot `n-1`.
- Since the bid commits to the transactions, the IL for slot `n+1` and the bid for slot `n` may conflict. This is different in slot auction.
- The builder reveals the execution block at slot `n`'s 6-seconds mark.
- Subsequent block builders require the execution block at slot `n` and the IL for slot `n+1` to place bids for slot `n+1`. This is different in slot auction.
- Attesters for slot `n+2` verify that the execution block for slot `n+1` satisfies the IL and is valid. We gain an extra slot time for validation due to [delayed execution property](https://ethresear.ch/t/advantage-of-pipelining-consensus-and-execution-delayed-execution/19668).

#### FOCIL in MEV-Boost (Ignoring IL Aggregation Step)
- The block builder of slot `n` constructs a block for slot `n` after verifying the block for slot `n-1`.
- The IL committee builds the IL for slot `n` after verifying the block for slot `n-1`.
- The IL committee for slot `n` releases the IL during slot `n-1`.
- Attesters for slot `n` lock their view on the ILs.
- The builder of slot `n` includes the IL transactions into the block for slot `n`
- At the start of slot `n`, the proposer requests the builder's head, signs it, and broadcasts it.
- Attesters for slot `n` verify that the block satisfies the IL committee's requirements according to their locked view in slot `n-1`.

#### FOCIL in ePBS (Same Slot Version)
- The block proposer of slot `n` selects the builder's bid for slot `n` after verifying the execution block for slot `n-1`.
- The IL committee for slot `n+1` constructs the IL for slot `n+1` after the builder reveals the execution block for slot `n`.
- Builders for slot `n+1` verify the IL and make bids for slot `n+1`.
- The block proposer of slot `n+1` selects the builder's bid for slot `n+1`.
- Attesters for slot `n+2` verify that the execution block for slot `n+1` satisfies the IL and is valid, providing close to an extra slot time due to delayed execution.

#### FOCIL in ePBS (Next Slot Version)
- The block proposer of slot `n` selects the builder's bid for slot `n` after verifying the execution block for slot `n-1`.
- The IL committee for slot constructs the IL for slot `n+2` after the builder reveals the execution block for slot `n`.
- Builders for slot `n+2` verify the IL and make bids for slot `n+2`.
- The block proposer of slot `n+2` selects the builder's bid for slot `n+2.
- Attesters for slot `n+3` verify that the execution block for slot `n+2` satisfies the IL and is valid, providing close to an extra slot time due to delayed execution.


## IL Contentions

ILs may compete with initiatives as the following:

**Shorter Slot Time Contentions with IL**: With shorter slot times, ILs may not be constructed and fulfilled on time. A proposer that cannot fulfill an IL results in a liveness fault. One way to address this is to extend the IL satisfactory rule to the next slot or to multiple subsequent slots, but this approach introduces risks of denial-of-service (DoS) attacks and more transaction invalidation concerns. There is a trade-off here.

**Higher Gas Limit Contentions with IL**: With a higher block gas limit, it takes longer to verify the block, which reduces the time available to construct the IL after verifying the block. Additionally, with a higher IL gas limit, it takes longer to propagate and verify the IL, reducing the time available to fulfill the IL by building the block.

**DVT Contentions with IL**: Distributed Validator Technology (DVT) requires more exchanges between validators before signing. This process includes beacon chain duties such as attesting, proposing, and submitting ILs. These additional exchanges require time, and there is a need to ensure that the IL, especially in more complex forms, does not make DVT operations impractical.

**AVS Contentions with IL**: Active Validator Service (AVS) also require more actions from validators. The specific details depend on the AVS implementation, but generally, requiring more time from validators to perform certain tasks can create contention with fulfilling IL obligations.