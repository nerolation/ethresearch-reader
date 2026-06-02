*Many thanks to Ansgar Dietrichs, Matt “Lightclients”, Toni Wahrstätter, Thomas Thiery, Davide Crapis, Dankrad Feist, Julian Ma, Vitalik Buterin, and others for discussions and comments on these ideas. Errors remain my own.*

---

In this post, we consider alternative proposals for *metering* and *pricing* blockchain resources. Many of these proposals were discussed previously (sometimes extensively), and our aim here is to provide a unified approach to consider their opportunities and trade-offs. This is the first step in a larger exploration which will require us to make precise the arguments presented below, but we hope to convince the reader that the framing is useful, and gesture at some of its features and instantiations.

A fee market finds users and the protocol coming to some allocation of resources via pricing mechanisms. These resources are provided by nodes, which either consume them during the act of producing a block or during the act of receiving, executing and/or verifying the contents of the block. We can differentiate between two approaches to obtaining a fee market:

- **Direct pricing:** A user brings their transaction to the protocol, which prices the resources used by the transaction and charges the user some protocol-determined price for their use.
- **Mediated pricing:** A party (say, a *broker*) buys a set of resources from the protocol and re-sells these resources to users who demand them. The brokers are responsible for ensuring their own budget-balance, and broker competition achieves efficiency under certain conditions.

From a first pass, the mediated view feels strictly worse: If we have access to direct pricing, why bother with a third-party mediating the interaction between users and the protocol? To see this, we consider two different ways to *meter* resources offered by the protocol to its users:

- **Transaction-level metering:** The resources used by a transaction are metered strictly within the context of the transaction, with no other information than what the transaction itself consumes.
- **Block-level metering:** The resources used by a transaction are metered within the context of the whole block, using information regarding what other transactions have consumed.

Note that we could be more or less granular than the two metering levels proposed above, but for the purposes of this post we focus on these two alone.

Metering and pricing operate at different levels. First, we must ensure that we have the correct measure of the resources used by a transaction or a block, as this tells us how much load we can put on the nodes of our network, by comparing the measured resources with our available budget of resources. The process of metering outputs a measure denominated in *gas*, *bytes*, *blobs* or any other such quantity.

Once the resources are metered, they should be priced, i.e., a user should be charged for the use of these resources, either as a way to remunerate the node(s) supplying these resources, when their provision is costly, or to indicate a higher willingness to obtain these scarce resources when multiple users are competing for them, or for both reasons (roughly, this is what the priority fee and the base fee indicate, respectively).

In this post, we present four case studies and discuss three claims:

> **Claim 1:** Block-level metering obtains in general better allocations of resources.
> 

We mean this in the sense that by using the whole information of resources consumed throughout the block, block-level metering loosens the budget constraint faced by users and block producers, allowing for more bang for our resource bucks. This sounds great, so how can we get block-level metering essentially for free?

> **Claim 2:** Block-level metering is very easy to pair with mediated pricing of resources.
> 

By introducing a broker responsible for buying “in bulk” the resources from the protocol, and letting the broker figure out the resource allocation which unlocks the biggest bang for their buck, the protocol need not concern itself with directly pricing resources. This gives us a generic method for unlocking scalability improvements via block-level metering.

> **Claim 3:** Some desirable allocations unlocked with block-level metering cannot be satisfyingly obtained with direct pricing of resources.
> 

The third claim is an open question. Block-level metering increases our feasible space of resource allocations, i.e., potentially allows for the creation of more blocks than transaction-level metering would otherwise allow for. Direct pricing means that the protocol has the ability to perform fair pricing, i.e., considering the context of the whole block’s allocation of resources, rebates and distributes the costs appropriately between all users served with the allocation. Can we always find *efficiently* a fair pricing rule? In some cases, which we will discuss below, this appears simple enough. Are there cases where it is not so?

After setting up some formalism, we’ll go on to discuss 4 case studies related to the claims we have made here.

## Machine cost models

The [Resonance](https://arxiv.org/abs/2411.11789) paper (Bahrani, Durvasula, 2024) gives us a good foundation to review some ideas that have been floating around for a while, and organise them under one coherent framework, so we borrow here some of the notation. In the paper, an abstract cost function is defined, which determines the metering used by the node. In this post, we unpack a bit this abstraction, to allow ourselves to compare different cost functions applied to the same machine.

We assume that there is a machine with some resource model, e.g., it offers computation, bandwidth and storage. A set of transactions $T$ requests resources from this machine. When some subset $X \subset T$ of transactions (assumed ordered for the purposes of this post) is run on the machine, the machine incurs a cost $c(X)$, which we can assume to belong to some multi-dimensional space of resources. The high-level argument of the present post is that by exposing positive externalities to its model of costs $c$, the machine is able to leverage these externalities to offer better pricing to its users.

For instance, as we’ll cover in the next section, take two identical machines A and B equipped with distinct cost models $c_A$ and $c_B$. Suppose $c_A$ encodes that machine A meters accessing a piece of state in some transaction without considering whether this piece of state was accessed in a previous transaction within the same block. Suppose $c_B$ does encode this in its metering, charging a lower amount of gas when a piece of state is accessed for a second time, even within the context of a different transaction. Then though machine A, being identical to machine B, *could* cache a piece of state during the execution of a whole block, machine A does not *meter* it as such, and thus thinks that its costs are significantly worse than those of machine B, which meters its ability to cache properly. When the costs are significantly worse, machine A must then inform its users that the operations they do should lead to higher resource consumption, and must price them as such.

We may introduce something akin to a [topology](https://en.wikipedia.org/wiki/Topological_space#topology) of cost models. Topologies are introduced to consider subsets of a set, with coarser topologies discriminating less precisely between "neighbourhoods" of points contained in the set. With a coarser topology, a machine cost model could gloss over differences in behaviour when two similar yet distinct operations are performed, e.g., it could consider that loading the same piece of state twice over two distinct transactions has the same properties and cost as loading two distinct pieces of state over two distinct transactions. A cost model with higher discriminatory power can price sequences of operations more accurately, being able to distinguish between two scenarios incurring different costs for the machine.

In our post, we assume that whenever we have a finer cost model, we can only improve our metering and lock in savings. We call some cost model $c_1$ coarser than some other model $c_2$ whenever for all possible allocations $X$, $c_1(X) \geq c_2(X)$, i.e., whenever $c_1(X)$ weakly Pareto-dominates $c_2(X)$, i.e., whenever $c_1$ meters an equal or higher resource use than $c_2$.

### Attempt of a proof of Claim 1

> **Claim 1:** Block-level metering obtains in general better allocations of resources.
> 

Note that our resource constraints typically come in two shapes:

- **Burst/flow constraints:** The current batch of resources being provided cannot exceed some limits, with limits given per resource. E.g., today, we do not expect to be able to propagate in time a block of size 100 MB.
- **Long-term/stock constraints:** Some resources such as history or state size accumulate over time, and so we aim to target some growth rate of these resources which is consistent with the capacity of nodes on the network.

In either case, but perhaps more so in the case of burst constraints, these limits bind the *chosen* cost model of our machines, e.g., tell us that we cannot use more than $g$ amount of gas. If the current gas metering schedule encodes a coarser cost model than it needs to, i.e., if machines on the network are actually able to implement a finer cost model, then we immediately obtain access to a larger space of possible allocations.

Indeed, suppose transaction-level metering $c^t$ is coarser block-level metering $c^b$, then for any allocation $X$, if $X$ is feasible under $c^t$, we have $L \geq c^t(X)$ for some vector of resource limits $L$. This implies that $X$ is also feasible under $c^b$ as $L \geq c^t(X) \geq c^b(X)$.

To prove Claim 1, we should prove that block-level metering is finer than transaction-level metering. Of course, this depends on how we set up $c^b$, but we could restrict our attention to metering schedules satisfying some properties, such as:

- For $|X| = 1$, i.e., when the block is made up of a single transaction, then $c^t(X) = c^b(X)$.
- For all $X$, we always find $\sum_{x \in X} c^t([x]) \geq c^b(X)$, where $[x]$ is a block with a single transaction $x$.

The latter is quite tautological, since we have $c^t(X) = \sum_{x \in X} c^t([x])$, by assumption that transaction-level metering uses only information within the context of a single transaction to meter the cost. So we just engineered a definition that gives us a proof of Claim 1.

What we are really trying to express is that **in the worst case, block-level metering does not worsen things, but at best, something is improved**. In other words, block-level metering may capture some positive externalities, but never captures any negative externalities. Negative externalities would happen if something happening in some transaction raised the marginal cost of something happening in a future transaction. In practice there could be some very weak negative externalities. Adding a new entry into the state could raise the cost of accessing another piece of state in a future transaction, as the size of the state has grown in the meantime, but this is such an insignificant increase that it could be ignored. Besides, the gas cost of accessing the state today is fixed to some value, and itself does not increase with the overall size of the state.

Note, we also haven’t defined what “better” means in Claim 1, but even a simple model such as assuming that each user has some value for their transaction being processed, would tell us that having many more allocations $X$ to choose from under $c^b$ means that we can find a more efficient allocation than under $c^t$, i.e., one that realises greater value.

## Piece 1: Block-level state warming

Block-level metering is sensible whenever the resource model of a machine benefits from interactions between transactions executed within the same block. For instance, if the resource model of a node caches any piece of state accessed in the current block for the duration of the block’s execution, then it makes sense to reflect this in the pricing of the state itself.

Ethereum already has such capabilities. Before a piece of state is accessed, it is “cold”. Accessing a cold piece of state costs a user 2100 gas for this access, in this case to read the value of the piece of state. If the state is accessed again within the same transaction, its cost is then 100 gas only, as the state is now “warm”.

However, once the transaction is done executing, this resets, and if the same piece of state is accessed in the next transaction, it is first accessed “cold”. This does not map well to the actual resource model of a node, which typically does keep a piece of state in the cache for the duration of the block’s execution, if not longer. By accurately pricing the fact that the piece of state is indeed “warm” when it is accessed again in the next transaction (if the machine can perform caching efficiently), gas savings are immediately obtained!

We’ll introduce some notation for this part and the remainder. A transaction is given by $t$, from some set $T$ of user-produced transactions. A node executes $X \subseteq T$, an ordered subset of transactions from the available set. The node then incurs (machine-)cost $c(X)$, which we can think of as some physical, real-world cost in the most optimised resource model available to the node, e.g., caching warm states over the course of a whole block instead of resetting the cache after every transaction.

Suppose we have two transactions $t_1$ and $t_2$ who access the same state. Generally, whenever we have two transactions whose execution in the same context yields a smaller cost than their separate execution in distinct contexts, we have the opportunity for savings:

$$
c([t_1, t_2]) < c([t_1]) + c([t_2])
$$

Here, we simply mean that warming the state in $t_1$ before accessing it again in $t_2$ while cached, incurs a lower cost to the node than warming the state in $t_1$, and warming it again to execute $t_2$.

In this case, direct pricing is fairly straightforward for the block-level metering of the transactions’ execution. We can simply split the costs between the two users, yielding:

$$
\pi_1 = \frac{c([t_1, t_2])}{2}
$$

$$
\pi_2 = \frac{c([t_1, t_2])}{2}
$$

where $\pi_1$ and $\pi_2$ are user payments. In this case, since the total cost is 2100 + 100, each user would pay 1100 gas (2200 divided by 2).

Finally, the idea of "block-level access lists" has also been discussed in the past (e.g., [here](https://x.com/jadler0/status/1235563508168904709) and [here](https://ethresear.ch/t/block-access-list/9357?u=barnabe)). In this model, the block producer is responsible with providing in, e.g., the block header, an access list declaring *all* the pieces of state that the block's execution will touch. If during the block's execution a piece of state is touched that was not declared, the block is considered invalid. This metadata helps the machine batch the loading of the relevant pieces of state *ex ante*, and the block producer could be charged for all the "cold" accesses performed by the machine during this initial load.

## Piece 2: EIP-7623 and gas sheltering risks

We now look at a case where transaction-level pricing creates a myopic incentive to exploit the semantics of a transaction in order to benefit from savings occurring within the context of that transaction.

[EIP-7623: Increase calldata cost](https://eips.ethereum.org/EIPS/eip-7623), by Toni Wahrstätter and Vitalik Buterin, was introduced to provide a different pricing rule for calldata, one of the resources consumed by Ethereum transactions. The pricing rule is set such that in the worst-case under EIP-7623, a transaction includes significantly less calldata than in the worst-case today. This is done by raising the gas cost of calldata past a certain point. However, recognising that calldata-heavy transactions do not harm adding further execution (the storage of calldata and execution being two somewhat orthogonal resources to provide), the pricing rule ignores marginal execution performed by the transaction once the calldata is “maxed out”. Precisely, the pricing rule is given by:

```python
tx.gasUsed = {
    21000
    + 
    max (
        STANDARD_TOKEN_COST * tokens_in_calldata
           + evm_gas_used
           + isContractCreation * (32000 + InitCodeWordGas * words(calldata)),
        TOTAL_COST_FLOOR_PER_TOKEN * tokens_in_calldata
    )
```

From this piece of code, the reader may be able to infer that once the second term in the `max` function overtakes the first term, the pricing rule charges the transaction based solely on the number of tokens in the calldata, i.e., roughly in the length of the calldata. In contrast, should the first term remain the highest of the two, then the transaction is not charged solely on the number of calldata tokens, but also based on its `evm_gas_used`. In other words, once enough calldata is charged to the transaction, the transaction “maxes out” and execution performed within the frame of the transaction is not charged.

This allows for “gas sheltering”, as noted by [wjmelements in the Ethereum Magicians thread](https://ethereum-magicians.org/t/eip-7623-increase-calldata-cost/18647/18) for the EIP. Namely, suppose that Alice requires a lot of calldata, while Bob wishes to pay for some gas. In some cases, Alice may find it profitable to “shelter” Bob’s transaction, by “bundling” the two transactions into a single meta-transaction.

Formally, suppose some cost model $c^t$ is equipped with EIP-7623. Then we would find that, if Alice’s transaction is $t_A$ and Bob’s transaction is $t_B$, and their concatenation into a single meta-transaction is $t_A || t_B$,

$$
c^t([t_A||t_B]) < c^t([t_A, t_B])
$$

In other words, the machine rewards Alice and Bob for combining their transactions into a single one, charging the overall execution less than the two executed separately in the same block.

Is gas sheltering an issue? If the cost model is sound, i.e., if it does make sense to allow a transaction maxing out calldata to execute at no marginal cost, then this is not great UX to allow users to benefit from such savings, as pointed out by wjmelements. On the other hand, for this specific case, Toni (Nerolation) argues that maxing out should be a rare enough case to not worry too much about gas sheltering becoming endemic.

Gas sheltering can be seen as a specific instantiation of mediated allocation, where some user must emit the meta-transaction combining intents or transactions from other distinct users. If this is where we end up, we may as well fully lean into this, and remove some of the issues inherent to meta-transactions. First, a meta-transaction is just a transaction, to the protocol, which cannot distinguish between a single user doing something and a bundle doing things on behalf of many more users. This means that the bundled user is at the mercy of the bundler, if they wish to benefit from cost savings. On the contrary, if the cost model could be achieved while keeping the bundled user’s transaction an actual transaction, the user could immediately benefit from inclusion lists to prevent their censorship.

Here too, block-level metering is valuable. We could make it such that if any transaction within the block maxes out on calldata, then some amount of execution gets unlocked for free, i.e., is not charged to the broker at the end when all is tallied. Under this cost model $c^b$:

$$
c^b([t_A, t_B]) = c^t([t_A||t_B]) < c^t([t_A, t_B])
$$

This yields a more granular cost model than one without EIP-7623, while removing the UX headaches of gas sheltering. Note that regardless of these possible UX issues, EIP-7623 still accomplishes its goals of limiting maximum gas used over execution and calldata dimensions. The UX issues are also not so important in a context where bundlers exist, who bundle ERC-4337 UserOps and seek these types of cost savings through amortising. See also the conclusion for more discussion on the relation between account abstraction and block-level fee markets.

### An aside: Gas smuggling

Note also [EIP-7778: Prevent block gas smuggling](https://eips.ethereum.org/EIPS/eip-7778), by Ben Adams, which tackles a related but separate issue. Gas smuggling occurs when a transaction is offered gas refunds for certain operations, e.g., setting the value of an account to zero or to an original value. Some of these operations lead to immediate cost reductions in terms of node resources, while others provide relief in the future, e.g., setting a storage slot to zero reduces the state size, making future accesses cheaper. If a transaction sets many slots to zero, there is a cost incurred *now* for writing this to the state, and benefits received *in the future*, which allows the sender to use more gas *now* from the refund, leading to loosened burst resource constraints.

The effects of EIP-7778 on the gas market depend on additional details of its implementation, namely on whether the EIP-1559 update rule uses the “burst gas” as metered by EIP-7778 (i.e., not counting refunds for benefits received in the future) or the “full gas” as metered today. If using the burst gas, EIP-1559 would “fill up quicker”. As an example, suppose half of our demand comes from transactions using only burst resources, i.e., transactions for which the “burst gas” metering is equal to the “full gas” metering. Suppose the other half of our demand are transactions obtaining half of their cost in refund, i.e., their “burst gas” measure is twice as large as their “full gas” measure.

| **Burst-only demand** | **Burst + refunds demand** |
| --- | --- |
| 7.5 million burst gas demanded | 7.5 million full gas demanded = 15 million burst gas - 7.5 million gas refunds
- Under the “full gas” update rule, the EIP-1559 mechanism would target some amount of gas provided over time, e.g., 15 million gas. In this case, all transactions in our demand could make it in sustainably, given that the measured full gas is equal to the target.
- Under the “burst gas” update rule, we’d now have an effective demand of 22.5 million burst gas units, meaning that we have congestion, inducing an increase of the base fee to recover 15 million units of burst gas provisioned by each block on average. Overall, this rule doesn’t make so much sense. The gas target of EIP-1559 is here to ensure that long-term constraints are maintained, e.g., that state growth occurs at a rate consistent with hardware targets. Using the burst gas to compare against the target then misses the point of accounting for actions participating towards maintaining long-term constraints, such as cleaning up state, in the comparison with the EIP-1559 target. This means that we’d undershoot our actual long-term resource provision targets.

## Piece 3: Block-level base fee

This one is not an instance of moving stuff around in the machine’s resource model, as in the previous example, but rather an instance of loosening constraints placed on the provision of resources by the *virtual* machine’s resource model. As a historical tidbit, the block-level version of EIP-1559 with block-level base fee was the first committed to specs. If memory serves me well, it was eventually decided to ship instead the transaction-level EIP-1559 instead of the block-level one, as the block-level version felt like an additive feature over transaction-level EIP-1559, and thus was deemed to merit its own separate EIP, which never materialised.

So what is the difference? Today, for its valid inclusion in a block, a transaction must declare a `maxFeePerGas` value superior to the `baseFeePerGas` quoted by the block. In other words, if a transaction is not willing to pay at least the base fee to enter the block, it simply cannot be included. This eliminated the use case of gas-less transactions, where fresh accounts could transact without any asset in their balance. This was [recently noted](https://youtu.be/EmkwyVe04kY?si=odrLHZxz9jZk2i_W&t=5144) by Hayden Adams (Uniswap) in a Bell Curve podcast recorded with Mike Ippolito and Hasu. [1]

It’s however possible to perform block-level metering of gas, requiring base fee to be paid in aggregate at the end of the block for all the gas consumed during the whole block, and “fix” this use case. By the end of a block, if the block uses $g(X)$ amount of gas, and the prevailing base fee is $p$, then we charge the block producer $g(X) \cdot p$. Up to them to figure out a way to have at least $g(X) \cdot p$ in their balance by the time the block’s execution terminates.

Compare this with transaction-level base fee, where the constraint is that should a user transaction consume $g(t)$ gas, then the user must be charged out of their balance at least $g(t) \cdot p$ (not accounting for the priority fees paid to the block producer). Loosening the constraint to a block-based ones recovers agency for the broker to include transactions as they wish, as long as they can cover their resource cost to the protocol. The protocol’s cost is $c(X)$, which it prices at $g(X) \cdot p$.

“Agency” is defined in a [talk](https://www.youtube.com/watch?v=qf51v48KhH0) by Maryam Bahrani, given at this year’s Devcon. While EIP-1559 has put us further from the “agentic” end of the spectrum, block-based base fee instead finds us in between the agentic end and EIP-1559, not quite fully unconstrained but less constrained than in the vanilla, transaction-level version of EIP-1559.

Doesn’t EIP-1559 lose then some of its salience as an oracle of market price to the users, who under the block-level base fee rule could enter while not actually paying the base fee out of their own pocket? In a sense yes. When there is enough room in a block for all transactions paying the base fee as well as those which the broker wishes to include at their own cost, there is no issue. When congestion is high however, a transactor declaring their willingness to pay at least the base fee could be “pushed out” by a more valuable transaction to the broker.

Overall, block-level base fee does not help us increase the gas limit or gas productivity, but may be a simple improvement to allow greater control by the block producer while retaining a fairly good oracle for congestion. Well, “simple” may not be entirely true. As I learned from Mr. Lightclients earlier in December, there is more than meets the eye here, given the decoupling of the CL and EL (see footnote [2]).

### An aside: Block-level base fee in “AMM-1559”

A type of mediated pricing was discussed in Vitalik’s “[Make EIP-1559 more like an AMM curve](https://ethresear.ch/t/make-eip-1559-more-like-an-amm-curve/9082?u=barnabe)” post. As Vitalik notes:

> Note that because of the nonlinearity of the burn, EIP 1559 would need to be adjusted. There are a few options:
> 
> 1. The proposer pays the burn and the full fees from the transactions (including the basefee component) go to the proposer. Note that this still requires an algorithm to determine how high the `basefee` is considered to be in transactions that specify their gasprice in the form `basefee + tip`. *[Barnabé’s note: this is mediated pricing with block-level base fee!]*
> 2. The transaction origin pays a basefee equal to the maximum it could pay (that is, the basefee at `excess_gas_issued + TARGET * SLACK_COEFFICIENT`), and then at the *end* of block execution, everyone gets refunded so that the end result is that everyone pays the implied average basefee (the “implied average basefee” is `(eth_qty(excess_gas_issued + gas_in_block) - eth_qty(excess_gas_issued)) / gas_in_block`; the refund is the difference between the originally paid basefee and this amount) *[Barnabé’s note: this is direct pricing with transaction-level base fee!]*

As my reply argues, the protocol performing direct pricing induces a trickier block building problem for the block producer:

> With the average implied basefee payment (or likely any basefee determination rule that depends on the number of transactions included in the block) there is a non-trivial optimisation problem for the miner to solve due to the interaction between the transaction `tip = min(premium, fee cap - basefee)` and the transaction `fee cap`. For instance, a high premium but low fee cap transaction may become less valuable to include in a larger block (with higher implied basefee), vs a low premium but high fee cap transaction. This was already noted to figure out how the transaction pool should be reordered and accessed under EIP-1559. There are likely good heuristics around this issue, in fact likely the same ones that transaction pools will use.
> 

## Piece 4: Block-level data availability

Our last case study relates to an idea discussed in several places by the community, including by Dankrad Feist in “[Commit to pre-state instead of post-state on the executable beacon chain](https://ethresear.ch/t/commit-to-pre-state-instead-of-post-state-on-the-executable-beacon-chain/8802)”. To the trained reader of protocol literature, the “free DA problem” seems to have plagued many of the most appealing proposals to fix various things. In particular, [block co-creation](https://x.com/barnabemonnot/status/1818922460722417932), where multiple parties act concurrently on the transcript of a block, has been identified as a valuable thing. However, there is an inherent tension between allowing the input of transactions into the ledger by many (hopefully uncoordinated) parties, and outputting a ledger that is valid from the merging of all inputs.

For instance, two parties may each add the same transaction, or two parties may add conflicting transactions, e.g., two distinct transactions from the same user with the same nonce. Should these transactions be written on-chain, a rational party could hope to publish an invalid transaction that, while not executed, obtains data availability as consensus is formed on the transaction’s contents. An invalid transaction may not be able to pay for the footprint of its data, as its balance could have been drained by a previous (valid) transaction from the same user. This is more generally an issue when the chain performs asynchronous execution, i.e., commits transaction *data* to the transcript before transactions are executed by the nodes later on.

There are partial solutions, e.g., never writing the invalidated transactions on-chain. In FOCIL, the transactions contained in the inclusion lists (ILs) are never written on-chain until they are delivered in a block. To ensure validity of the block and the satisfaction of the list by the block, transactions contained in the list but not included in the block are run to determine whether they *could* have been validly included. Thus, no invalid transaction is ever written on-chain. Problem solved.

But the FOCIL model is explicitly fork-choice driven, which has its own trade-offs, and one may prefer a model where all “mini-blocks” produced by the uncoordinated parties are written on-chain, before being executed by nodes who receive them. This would be important to have, for instance if it was decided to reward in-protocol FOCIL committee members based on their produced ILs. In this case, invalid transactions in the mini-blocks consume data availability, and should pay for it. [3]

More robust solutions exist, such as Monad’s [carriage cost](https://x.com/MonadWhisper/status/1851964344369619326). In this model, the users set aside some balance to pay for inclusion of their transaction, before it is executed and determined to be valid later on, a model of asynchronous execution. Though this solution lies closer to direct pricing, this represents a fairly drastic departure from the current account model of Ethereum, and so here too mediated pricing could help.

We compare here two cost models:

1. $c^t$, where an invalid transaction simply is not feasibly allocated, i.e., if $X$ contains some invalidity, then $c^t(X)=+\infty$ and can never be delivered under any resource limit.
2. $c^b$, where an invalid transaction requires some payment charged to the broker once all costs are tallied. This payment should roughly compare to the extra load incurred by the chain from the carriage of blocks containing more data coming from invalid transactions.

Then, for $X$ containing invalid transactions, we have $c^b(X) < c^t(X)$, i.e., $c^b$ is finer than $c^t$. By obtaining a cost model which allows for the inclusion of invalid transactions in the transcript (simply because it doesn’t outright rule them out), we also allow ourselves to consider block construction mechanisms which possibly rely on the inclusion of invalid transactions.

This doesn’t tell us what the UX of mediated pricing looks like, when a broker is charged for the cost of invalid transactions being part of the block, especially when there isn’t a single broker determining the allocation of transactions and resources. We offer some thoughts here, but there is clearly more work to do on these questions.

- In the simplest case, there is a single actor (the proposer) outputting a block over which they have full control in terms of its construction. If all nodes execute the transactions as they receive the block, they can simply reject the block as invalid if any transaction included by the proposer is invalid.
- If execution is asynchronous, we may validly accept a block containing invalid transactions into the transcript of the chain, and we then must charge someone for having made the transaction data available. This someone ought then to be the proposer.
- Obviously, this model is not so great if our wish is to keep the proposer unsophisticated, and responsible simply for including transactions into the transcript. If we want low-powered proposers on the network, but the ability to include many transactions into the chain (to be executed or verified by different nodes perhaps), we’d expect proposers to delegate the role of building their blocks to someone else. In other terms, we’d probably see the emergence of brokers who attempt to minimise the amount paid by proposers from the inclusion of invalid transactions. In the best case, the broker can simply make a block which includes no invalid transaction. If the broker cannot guarantee to not include invalid transactions, they pay for it themselves, while offering to the proposer the promised payment.
- Extending this model to a multi-proposer world could require different primitives, and it’s not clear to me yet which works best in this setting. If more than one proposer includes the (eventually) invalid transaction, the carriage cost could be paid out for as many proposers include this transaction [4]. In a mediated pricing framework for multiple proposers, it appears that the only solution is for each single proposer to be charged for the cost of their inclusion of an eventually invalid transaction, but this makes for a somewhat janky mechanism, where proposers are supposed to be uncorrelated yet incur much higher costs when this non-correlation induces them to invalidate each other’s transactions.

## Wat do

Hopefully, the four pieces above would have convinced you of two things:

- Block-level metering gives us access to better allocations of resources.
- Mediated pricing meshes nicely with block-level metering, if we’re not confident enough with figuring out the appropriate cost-sharing rules for direct pricing.

Equipped with this, we could look towards harder things to obtain, such as fee markets suitable for parallel execution (see e.g., [this thread from 2017](https://github.com/ethereum/EIPs/issues/648)). Ensuring proper allocation of transactions to threads is a hard problem, but we could outsource it to brokers who figure this out for the protocol. The protocol then only needs to meter costs according to a simple enough model accounting for parallelism, e.g., metering the worst-case for a block maxing out a single thread, vs metering less for a block packing more execution over two distinct threads, i.e., making better use of the resources exposed by the protocol.

There are counter-arguments to even trying for block-level metering. Some may argue that with the rise of account abstraction, we may soon see a block become virtually a single large transaction, and thus transaction-level metering and block-level metering become one and the same, making most of the points above moot as long as the cost model e.g., accounts for state caching or charges for the data of invalid transactions. And indeed, some of the questions we are discussing here are relevant to the setting of account abstraction, as one of our previous posts on “[Embedded fee markets](https://ethresear.ch/t/embedded-fee-markets-and-erc-4337-part-1/19542)“ argued.

There are also counter-arguments to mediated pricing. Yes, we already have a sophisticated supply chain behind the production of a block, but is it wise to overload it further with yet another responsibility? Here are some ideas: As long as inclusion lists keep ensuring good inclusion properties for users, there are not so many ways for a broker to abuse their position of resource allocators. One may argue that builders are already performing this function, by trading off certain transactions against others, e.g., MEV-carrying transactions against heavier blobs. Harnessing their savviness for competition towards the aim of a reduction in aggregate costs charged to the users, even as these costs may not find themselves as fairly redistributed as some idealised direct pricing, could still make us happy enough given the possible scaling benefits. We’d want to see enough competition to ensure that the surplus unlocked by smarter resource allocation by brokers isn’t monopolised by them, but we’d also expect the most efficient resource allocation to become table stakes soon enough given the history of searcher competition on these metrics.

---

[1] Note that there exists a way to circumvent this issue by using a third-party coordinator to originate transactions from the desired unfunded account, by funding the coordinator privately beforehand. Read more in the “[Gas Ticketing - A Backstage Pass to Ethereum Blocks](https://hackmd.io/@Nerolation/rkp8LyRUh)” proposal by Toni.

[2] The block proposer (a CL account) sets a `feeRecipient` variable to their EL address, assuming the `block.coinbase` role. If block-level base fee is allowed, the `block.coinbase` may be led to pay for the difference between `baseFeePerGas * block.gasUsed` and the sum of priority fees received from transactions included in the block, if they wish to sponsor transactions. In this case, without a more sophisticated mechanism, the block proposer could set an arbitrary `feeRecipient` to make some EL account (which the block proposer may not control themselves) pay for this difference. We’d require something like a signature from the declared `feeRecipient` address “agreeing” to be deducted from.

[3] Still, checking that the non-included transactions were indeed invalid is costly, and this cost is still not quite adequately charged.

[4] A payment or collateral lock-up increasing in the number of concurrent proposers has a similar flavour to the “[Censorship Insurance Markets for BRAID](https://ethresear.ch/t/censorship-insurance-markets-for-braid/20288)” proposed by Jonah Burian. This could be considered a case of mediated pricing, where the censorship risk is shifted from the user paying for it directly to the protocol, to a “censorship insurer”, loosening the individual user constraint in favour of an aggregate constraint borne by the insurer.