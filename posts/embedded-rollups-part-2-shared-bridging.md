![image|690x394](images/dK0f8GSoeb5zdJwUO2YIelVQdwW.jpeg)
*A rare image of a rollup embedding another rollup*

*Co-authored by [Lin Oshitani](https://x.com/linoscope) & [Conor McMenamin](https://x.com/ConorMcMenamin9), both [Nethermind](https://www.nethermind.io/). Thanks to [Patrick McCorry](https://x.com/stonecoldpat0), [Chris Buckland](https://x.com/yahgwai), [Swapnil Raj](https://x.com/swp0x0), [Ahmad Bitar](https://x.com/Smartprogrammer), and [Denisa Diaconescu](https://x.com/_ddiaconescu_) for their feedback. Feedback is not necessarily an endorsement. This is the first part of a two-part series on embedded rollups.*

[Vitalik Buterin once said:](https://vitalik.eth.limo/general/2024/10/17/futures2.html)

> Imagine a world where all L2s are validity proof rollups, that commit to Ethereum every slot. Even in this world, moving assets from one L2 to another L2 "natively" would require withdrawing and depositing, which requires paying a substantial amount of L1 gas. One way to solve this is to **create a shared minimal rollup, whose only function would be to maintain the balances of how many tokens of which type are owned by which L2**, and allow those balances to be updated en masse by a series of cross-L2 send operations initiated by any of the L2s. This would allow cross-L2 transfers to happen without needing to pay L1 gas per transfer, and without needing liquidity-provider-based techniques like ERC-7683.
> 

In this article, we describe how embedded rollups achieve the concept of a minimal shared rollup without the need to commit proofs to Ethereum in every slot.

Don’t worry, we got you Vitalik.

# Introduction

In the [first part of this series](https://ethresear.ch/t/embedded-rollups-part-1-introduction/21460), we introduced the concept of *embedded rollups (ERs)*—rollups that are embedded within and shared among other rollups. When embedding an ER, a rollup stores and updates the ER’s state alongside its own, which gives the rollup a local read-only view of the ER’s state during execution. If multiple rollups embed the same ER, they can share this read-only state without relying on the L1 state or execution.

In this article, we describe how embedded rollups can be used to create a shared bridge between L2s embedding the same rollup. Such an embedded rollup enables fast and cheap interoperability between L2s, removing the need to execute transactions on L1 to send tokens from one L2’s state to another. This simple functionality has the potential to address one of the main concerns in Ethereum’s long term roadmap; [fragmentation of users and their liquidity among L2s](https://www.reddit.com/r/ethereum/comments/1bkai95/im_not_looking_forward_to_a_future_with/?rdt=59616) (check reference). 

## Issues with Existing Interoperability Solutions

Today, to move assets between L2s, you have some options, generally described by the following:

- **Slow Path via L1 Settlement**: Go through L1 by withdrawing from the source L2 and depositing to the target L2. This requires paying expensive L1 gas fees for each transfer, which is expensive.
- **Fast Path via Solver Networks**: Use third-party solvers who maintain liquidity pools across L2s. This approach becomes increasingly inefficient as the number of L2s grows since solvers must split their capital across all L2s, resulting in thin liquidity and poor pricing on less popular routes.
- **All-or-Nothing Dependencies:** This class of solution is exemplified by [AggLayer](https://polygon.technology/agglayer) and [Superchain](https://docs.optimism.io/stack/interop/explainer) approaches, where rollups are connected via a shared bridge and the execution of one rollup conditions on the execution of all other rollups in the bridge (with some caveats).To send tokens between rollups, rollup nodes are effectively required to run full nodes for all other rollups (or [trust third-parties to verify the execution of other rollups](https://docs.optimism.io/stack/interop/explainer)).

We can address all of these issues by creating a shared bridge through an embedded rollup. The embedded rollup maintains a single unified ledger of how many tokens of each type are owned by each L2. Each rollup in the shared bridge ecosystem is only required to maintain a local view of the embedded rollup state, without needing to verify anything about the execution of the other rollups embedding the embedded rollup. 

# Recap: Embedded Rollups

This section describes the core protocol that must be followed by a rollup embedding an embedded rollup, as [introduced in the previous article in this series](https://ethresear.ch/t/embedded-rollups-part-1-introduction/21460).

## Primer: Conventional Rollups

To consider how rollups can embed a rollup, let's first consider how rollups currently progress their state. For some conventional rollup $A$ with no embedded rollup, $A$ progresses its state according to the following protocol:

1. Update $A$'s local view of L1.
2. Read rollup $A$ txs from the rollup $A$ inboxes* on L1. Rollup $A$ *may* additionally read preconfirmed txs in the rollup $A$ inboxes on L1 provided by the sequencer(s) of Rollup $A$**.
3. Update rollup $A$ by executing the rollup $A$ txs.

**Notes:**

*Most rollups have [two inboxes](https://docs.arbitrum.io/how-arbitrum-works/sequencer), a delayed inbox and a sequencer inbox:
- a delayed inbox, which can be added to permissionlessly. After a delayed inbox window, transactions in the delayed inbox must be applied to state of the rollup.

- a sequencer inbox, which can only be updated by the sequencer. Sequencer inbox transactions are immediately applied to the state of the rollup in the order in which they appear. The sequencer inbox can pop transactions from the delayed inbox at any time before the delayed inbox window.

** The sequencers of rollup $A$, the $ER$, and the L1 can be distinct, shared or partially shared. Distinct, shared or partially shared sequencers all change the strength of preconfirmations from one sequencer to another.

## Recap: Embedded Rollup Protocol Description

Suppose rollup $A$ wants to embed a rollup $ER$. In this case, rollup $A$ progresses its state by the following:

1. Synchronize its local L1 node.
2. Retrieve rollup $A$ and rollup $ER$ transactions from rollup $A$ and rollup $ER$ inboxes on L1, along with their accompanying calldata or blobs.
    - Rollup $A$ *may* additionally read preconfirmed txs from the rollup $A$ sequencer and/or rollup $ER$ sequencer.
3. Update their local view of $ER$ by executing the $ER$ transactions.
4. Update rollup $A$'s state by executing the $A$ transactions.
    - These transactions may read from $A$'s local view of $ER$.

# Shared Bridging Using Embedded Rollups

Embedded rollups can be used to provide fast (almost instant) and cheap (no L1 transactions necessary) interoperability between L2s, without [fragmenting liquidity across L2s](https://www.theblock.co/post/308920/ethereum-layer-2-proliferation-causing-liquidity-fragmentation-concerns-analyst-says). The shared bridge implemented as an embedded rollup is described as follows:

## Depositing from L1 to an L2

When users want to get their tokens into an L2 in the presence of an embedded shared bridge rollups, they have two options:

1. Deposit through the native bridge (as normal):
    a. Users send their tokens to the L2 inbox contract on L1 .
    b. The L2 reads from the L1 inbox
    c. The L2 mints corresponding tokens to the user on L2.
2. Deposit through the shared bridge:
    a. Users send their tokens to the shared bridge rollup inbox contract on L1.
    b. The shared bridge rollup reads the inbox on L1, then mints corresponding tokens on the shared bridge rollup, creditting these to the L2 inbox on the shared bridge rollup. 
 c. The L2 reads their inbox on the shared bridge rollup, then mints corresponding tokens on L2, creditting these to the user on L2. 

![image|690x424, 100%](images/hX20llLq3jwfa9XxDdUk4L5WX0Q.png)

## Slow Path via Settlement

Moving shared bridge tokens from $A$ to $B$ through settlement has the following flow. For simplicity, we represent the L2s as $A$ and $B$. Importantly, given $A$ and $B$ both embed the same shared bridge, $SB$,  the flow from $A$ to $B$ is identical to the flow from $B$ to $A$.

1. $A$ submits an $A$ → $SB$  transfer request to their local $SB$ contract. The tokens in this transfer request are effectively burned in $A$.
2. $A$'s state root (containing the $A$ → $SB$ transfer request) settles to L1.
3. $A$'s state root is imported into $SB$ by being pushed to the $SB$ inbox contract on L1, which is then read by $SB$.
4. $A$'s state root is pushed to the $SB$ → $A$ bridge contract, unlocking the tokens corresponding to the $A$ → $SB$ transfer request.
5. A transfer message is sent by (or on behalf of) the user to $A$'s contract on the $SB$ rollup, where $A$'s tokens are stored. This messages proves that the user indeed sent a valid transfer request to the $SB$ contract on $A$. Note that this transfer message can be bundled or executed as part of the message from Step 4.
6. $SB$ updates its ledger, sending tokens from $A$'s inbox to $B$'s inbox.
7. $B$:
    a. Reads its inbox on $SB$, and mints corresponding tokens on $B$.
    b. These tokens are credited to the user on $B$.

Unlike the traditional slow path via settlement, **this requires no separate withdrawal or deposit transactions on L1**. 

Note that even if $B$ does not embed $SB$ into its state transition function, it is still possible for B to read $SB$ state roots on L1, and incorporate $SB$ → $B$ transfers without any L1 transactions. For this functionality, $B$ needs to wait for the shared bridge to settle a state root containing the $SB$ → $B$ transfer on L1. 
On one hand, this requires no changes to $B$'s state transition function, while on the other hand, transfer from $SB$ are now limited by the proving and settling time of $SB$ state updates.(H/T Paddy Mc)

![image|690x367](images/xCKoWSds1qGtzfyv8dmC4a2LNMu.png)


## Fast Path via Solvers (with Conditioning)

For faster transfers, Solvers can maintain their liquidity in the shared bridge, $SB$, and send tokens to target rollups on behalf of users, in exchange for receiving those tokens plus a fee via the slow path. This is a key improvement over legacy solver-based protocols that required fragmenting liquidity throughout individual L2s. Using this $SB$ liquidity, solvers can enable fast cross-L2 token transfers. 

### Fast Transfer Requests

To describe the fast path protocol, first an aside on fast (& slow) transfer requests, [originally introduced here](https://ethresear.ch/t/fast-and-slow-l2-l1-withdrawals/21161). Fast $A$ → $B$ transfer requests effectively send tokens via the slow path to $B$. However, the conditions for withdrawing those tokens are different to a conventional withdrawal via settlement. Fast requests give exclusive rights to the tokens eventually unlocked on $SB$ to the first Solver who submits a valid solution on $SB$ on behalf of the requester. A valid solution sends a specific amount of tokens to another address on $SB$ on behalf of the requester, as specified by the request. To withdraw tokens on $SB$ corresponding to a fast request on $A$, someone must prove that the request exists in a settled state root of $A$ , and that either:

1. a Solution was submitted, allowing the solver to withdraw, or 
2. a Solution was not submitted, allowing the user to withdraw.

Next, let's go through this protocol step by step in more detail.

### Protocol Description

As before, we assume we are moving tokens from a rollup $A$ to a rollup $B$, with both embedding the same $SB$.

1. User submits a fast (& slow) $A$ → $B$ transfer request on $A$, sending the tokens to be burnt at the $SB$ bridge contract on $A$. 
2. After observing a fast $A$ → $B$ transfer request in an $A$ batch, Solver executes a conditional solution as follows:
    a. A batch containing a fast transfer request is pushed to $A$'s inbox contract on L1.
    b. A hash of $A$'s batch containing the fast request is pushed to $SB$ inbox contract on L1.
    c. This hash is read from $SB$ ’s inbox on L1 and imported to $SB$.
    d. The solution is created by the Solver, conditioning its execution on the inclusion of an $A$ batch corresponding to a specific commitment e.g a hash of the $A$ batch containing the valid fast transfer request.
    e. The solution transfers tokens corresponding to the fast transfer request to $Bs inbox.
    f. The solution pushes a record of the valid transfer on $A$'s inbox on $SB$.
3. $B$ then:
    a. Reads its inbox on $SB$, and mints corresponding tokens on $B$.
    b. These tokens are credited to the user on $B$.
4. $A$'s state root (containing the fast transfer request) settles to L1.
5. $A$'s state root is imported into $SB$:
    a. By being pushed to $SB$ inbox contract on L1,
    b. Read by $SB$ from the inbox contract on L1.
6. $A$'s state root is pushed to $A$'s inbox on $SB$.
7. The Solver withdraws tokens from $A$'s inbox corresponding to the fast transfer request, proving that the request is present in the proven state root.
8. If no Solver submits a solution on $SB$, the user can withdraw the funds from the $SB$ → $A$ contract when the $A$ state root containing the request settles on L1.

![image|690x414](images/wprNvXncQTfYVcJZv6oOaJqrLBd.jpeg)

As mentioned in the protocol, solutions can condition execution on the existence of certain $SB$ or L1 transactions. For risk-free solutions (Solver gains tokens or nothing happens), Solvers can condition $SB$ solutions on the inclusion of $A$ batches on L1, as $SB$ reads from L1. In this way, if the Solver knows an included $A$ batch executes and results in a fast transfer request executing on $A$, the Solver also knows that when the $A$ state root is proven on L1, the tokens corresponding to the request will be made available on the $SB$ contract. If the $A$ batch is forked by the rollup sequencer and is not pushed to the L1 inbox, the condition for the $SB$ transfer will not be satisfied, and the $SB$ transfer will not execute.



### Supercharging the Fast Path with Preconfirmations

This protocol requires the batch containing a fast transfer request to appear on L1 before a Solver can execute the Solution on the bridge rollup. With no coordination between the L1 and rollup sequencers, Solutions cannot be generated until fast transfers are observed in a rollup batch on L1. This theoretically takes at least 12s for users to receive funds on rollup B, the time between observing an L1 block containing the batch, and generating a shared rollup batch containing a Solution. No bueno.

With preconfirmations, a rollup batch containing fast requests can be preconfirmed on L2 immediately after the requests are submitted to the rollup sequencer. More than this, this rollup batch can be preconfirmed on L1 with some coordination between the rollup and L1 sequencers. Even better, if the rollup is based, these rollup and L1 sequencers will be the same entity. In such a system, the Solver can generate their shared bridge solution conditioned on the preconfirmed rollup batch on L1. Finally, this Solution can be included in a shared bridge rollup batch and preconfirmed on L1 arbitrarily fast (immediately after the rollup batch). In summary, this means the user can receive tokens on the target rollup in the time it takes to generate and preconfirm 2 transactions on L1. 

As amazing as this sounds, this supercharged solution depends on several technological advancements that have not been fully deployed to this point; [Based rollups](https://ethresear.ch/t/based-rollups-superpowers-from-l1-sequencing/15016) and [based preconfirmations](https://ethresear.ch/t/based-preconfirmations/17353). These are active areas of research and development, with preconfirmations hopefully emerging on mainnet in the near future. Although sub-second dependent preconfirmations across many based rollups is infeasible with low-resource based proposers, high-resource preconfirmers (through gateways or [rainbow staking](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683)) may emerge to meet the demand of solutions such as the embedded shared bridge presented here. 

Solving without conditioning is also possible. Although we describe how solutions can be provided with conditioning, Solvers can also submit unconditional solutions. These unconditional solutions would depend on trust between Solvers and the sequencers of the rollups involved in the transfer request; that is, at least the rollup where the transfer originated, and the shared bridge rollup. This trust is simplified in some sense when a single sequencer is sequencing both the rollup where the transfer originated and the the bridge rollup, although this is not a requirement. 

## Embedded Shared Bridges in Practice

Shared bridging through an embedded rollup can be seen either as an add-on or a replacement to native bridges. This section lays out how this might happen for existing rollups, as well as some additional considerations for embedding rollups.

### No Embedding to Embedding

In this section, we consider what it means for cross-rollup composability with and without embedding the rollup into a rollups state transition function:

- No embedding; The state transition function of a rollup does not maintain a local view of the embedded rollup state. Instead, the rollup only reads embedded rollup state updates via proven state roots in the the embedded rollup contract on L1. These state roots can specify deposits to rollup bridge contracts on the embedded rollup.
- Embedding; The state transition function of rollups maintain a local view of the embedded rollup state. To advance the state of a rollup embedding an embedded rollup, the local view of the embedded rollup must be consistent with previous state updates, potentially with the requirement to advance the head of the local view of the embedded rollup for liveness.

### Native Bridge to Shared Bridge

Now we consider how tokens will be distributed between the shared bridge and the native bridges.

- No composability: all rollups keep their tokens in their own native bridges. Normal UX for rollup users. Moving tokens from rollup $A$ to $B$ must be done via an L1 transaction.
- With some demand for composability, some tokens are locked in native bridges, some in the shared bridge contract. Within the shared bridge rollup, tokens are either unlocked, or locked in one of the rollup contracts that exist on the shared bridge rollup. To go from rollup $A$ to rollup $B$, a user would need to acquire shared bridge tokens on rollup $A$ (distinct from native bridge tokens), then transfer those tokens to rollup $B$ via either the Fast or Slow path on the shared bridge. Then, when those shared bridge tokens get sent to rollup $B$ via the shared bridge contract, the user may either keep the tokens in their shared bridge form, or sell the tokens for native tokens on rollup $B$.
- Maximum composability: no tokens are stored in native bridges, and instead all tokens are stored in the shared bridge. As before, in the shared bridge rollup, those tokens can either be unlocked, or locked in one of the rollup bridge contracts that exist in the shared bridge rollup.

### Additional Considerations

For bridge security, tokens originating from a rollup’s native bridge will likely need to have a different representation than the tokens originating from the shared bridge. Otherwise, native bridge users may be forced to take on shared bridge user risk to withdraw their tokens if shared bridge token holders are able to withdraw through the native bridge, and vice versa.

Although “fragmentation bad” is the main qualm with existing solver networks, we omit a qualitative analysis of how bad this is vs. embedding a shared bridge. We encourage anyone interested to simulate such an analysis. Regardless of the costs of fragmentation in a competitive solver market, the shared bridge approach democratizes access to solving as Solvers have no settlement risk, making it accessible to non-professionals. 

In the Supercharging section, we mention that solutions in one batch of rollup transactions can condition on any batch preceding it on L1. Technically, this could be improved by enabling rollup transactions from different rollups to be intertwined in the same batch. With this (minor) advancement, chains of dependent cross-rollup transactions would be enabled. 

# Related Work

Embedded rollups have similarities to several different protocols, which we outline in this section. As we approach real-time proving, embedded rollups will blend closer and closer together with many of the solutions we outline. For now however, there are key differences between embedded rollups and existing solutions.

Suppose rollup $A$ wants to transfer funds to rollup $B$. In this section, we compare how existing interop solutions handle such transfer and compare with $ER$.

## [ERC-7755](https://ethereum-magicians.org/t/rip-7755-contract-standard-for-cross-l2-calls-facilitation/20776)

Rollup $A$ settles to L1, rollup $B$ imports the settled $A$ state root and reads the message. This method minimizes dependency between the executions of rollup $A$ and rollup $B$, as rollup $B$ only acts after rollup $A$'s state has been proven and settled. However, this process is slow because rollup $B$ must wait for the proving and settlement of rollup $A$'s state on L1, which can take a significant amount of time, equivalent to the slow-path using the embedded shared bridge.

## Aggregated Settlement

[Aggregated settlement](https://hackmd.io/@EspressoSystems/composability-circ?utm_source=preview-mode&utm_medium=rec#1-Aggregated-Settlement) enables synchronous composability between L2s by conditioning one rollup's settlement on the settlement of others. This allows a rollup to import messages from another, execute L2 blocks based on them, and later revert execution if the messages are found invalid by verifying the other rollup's state root at the shared settlement time. This protocol effectively enables synchronous composability between L2s by utilizing the fact that the L2s share a settlement layer.

However, this approach requires tight coupling of execution between rollup $A$ and rollup $B$, as the sequencer must execute both chains. Furthermore, it can cause "cascading" reverts of rollups in case the inbox-outbox mismatch is detected at settlement. In comparison, in our embedded rollup solution, although both rollups $A$ and $B$ embed $ER$ (they are coupled to $ER$), no coupling between $A$ and $B$ is introduced.

[AggLayer](https://docs.polygon.technology/agglayer/overview/)'s fast path and Optimism's [Superchain](https://docs.optimism.io/stack/interop/explainer) adopt this approach.

## Existing Solver-based Solutions

Our shared bridge solution utilizes solvers on the shared bridge rollup to facilitate composability, similar to protocols like [Across](https://docs.across.to/concepts/intents-architecture-in-across). However, traditional solver-based methods face issues with liquidity fragmentation because solvers need to maintain separate liquidity pools for each chain pair they support. This is particularly challenging for smaller chains with lower liquidity demands. In contrast, our bridge $ER$ solution concentrates all solver liquidity within the embedded shared bridge. This setup allows solvers to facilitate transactions across any combination of rollups embedding the shared bridge without moving their liquidity outside the shared bridge. Furthermore, solvers don't need to execute both $A$ and $B$. To facilitate an $A$ to $B$ transfer, solvers just need to maintain the state of $A$ and the shared bridge to transfer tokens to $B$, via $Bs inbox on the shared bridge.

## L3s

L3s using the L2 as a base layer can utilize faster block times of L2 than L1, by facilitating the state root passing of L3s in a much quicker way. However, L3 liveness will now depend on the L2’s liveness. In comparison, L2s interoperating via an embedded rollup inherit liveness from the L1. 

This solution is adopted by [ZKSync’s Elastic Chain](https://docs.zksync.io/zk-stack/zk-chains#how-hyperbridges-work) and [Arbitrum Orbit L3s](https://docs.arbitrum.io/launch-orbit-chain/orbit-gentle-introduction).

## Booster Rollups

Embedded rollups have a close similarity to [booster rollups](https://ethresear.ch/t/booster-rollups-scaling-l1-directly/17125). In booster rollups, each rollup maintains a local view of the entire L1 state, which can be easily accessed by any contract within the rollup. Similarly, embedded rollups function like booster rollups, but instead of "boosting" on top of the L1, they boost on top of another rollup. Implementations of booster rollups could potentially be adapted to achieve embedded rollups.

*If you are interested in topics like this and want to be at the cutting edge of protocol research on Ethereum, we’re hiring. [Apply through the website](https://job-boards.eu.greenhouse.io/nethermind/jobs/4466531101), or reach out to one of the co-authors ([Conor](https://x.com/ConorMcMenamin9) or [Lin](https://x.com/linoscope)) through Twitter. Let’s keep Ethereum great together.*