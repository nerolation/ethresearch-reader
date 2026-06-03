*Co-authored by [Conor McMenamin](https://x.com/ConorMcMenamin9) & [Lin Oshitani](https://x.com/linoscope), both [Nethermind Research](https://www.nethermind.io/nethermind-research).*

***TL;DR***

*We outline a framework for analyzing protocols that seek to enforce timely-fair exchange of preconfirmations. Within this framework, we outline clearly dominant timely-fair exchange protocol designs. We discuss the feasibility of these optimal protocols with respect to existing L1 and L2 designs, and apply our framework to existing preconfirmation protocols.*

***Acknowledgements & Disclaimers***

*This article has received funding from the [PBS Foundation](https://pbs.foundation/). Many thanks to [Davide Rezzoli](https://x.com/0xseiryu), [Ellie Davidson](https://x.com/ellierdavidson), & [Christian Matt](https://x.com/ccpamatt) for their helpful reviews. Any views expressed are those of the authors, and do not necessarily represent Nethermind, PBSF, or the reviewers.* 

# Introduction

Preconfirmations (preconfs) have emerged as a topic of interest within the Ethereum ecosystem as a path to providing faster confirmation times for users, resembling the near instant user-experience of Web2. For preconfs to take hold, there needs to be an incentive for block proposers to pay the opportunity cost of confirming state earlier in their proposal slot and become *preconfirmers*. This is as opposed to the status quo of building blocks just in time at the end of the proposal slot. This incentive will come in the form of fees, where users specify a time preference for a preconf to be provided, and preconfirmers choose to accept the fee or not in exchange for satisfying the time and execution preference of the users. 

This document is focused on understanding the design space of ensuring preconfs can be provided in a timely manner according to user preferences. We define preconfs as follows: 

**Definition 1: Preconfirmations**

A transaction preconfirmation is a commitment to a transaction’s inclusion or execution before the transaction is included in an L1 proposer-signed L1 block.

It needs to have a chance to be submitted to L1. For an L1 preconf, this could mean being preconfirmed by: 

- an L1 proposer,
- someone delegated to preconfirm on behalf of an L1 proposer,
- a builder with some chance of winning an auction for the right to build a block to be proposed by the L1 proposer e.g. [mev-commit](https://docs.primev.xyz/v1.0.0/get-started/welcome-to-primev).

L2 preconf designs can be given by any of the above, especially in the case of [based rollups](https://ethresear.ch/t/based-rollups-superpowers-from-l1-sequencing/15016) and [based preconfs](https://ethresear.ch/t/based-preconfirmations/17353). However, L2 preconfs are typically given by a centralized sequencer specified by the L2’s governance with exclusive rights to propose L2 blocks on L1.

Regardless of who can provide the preconf, users need some guarantee that an entity with the ability to meaningfully preconfirm a transaction will provide the preconf. [As certain preconfs/ preconf protocols result in less revenue for a designated proposer vs simply confirming transactions](https://research.lido.fi/t/analysing-expected-proposer-revenue-from-preconfirmations/8954), users will likely need to incentivize proposers to preconfirm transactions. This is especially true in protocols where proposers are permissionless, with no obligation to provide preconfs. Solutions being considered to incentivize proposers to preconfirm transactions depend on *timely fair exchange* of preconfs. The rest of this document focuses on this property of timely fair exchange; what it is, how it is enforced, when it holds, and when it does not. 

As independent interest, we demonstrate how fair exchange of transactions can be achieved in [repeated-game](https://ocw.mit.edu/courses/6-254-game-theory-with-engineering-applications-spring-2010/5a158a7558165d0e22b5b27fcfa01713_MIT6_254S10_lec15.pdf) settings without a trusted third party, [a known impossibility in once-off games.](https://www.cs.utexas.edu/~shmat/courses/cs395t_fall04/pagnia.pdf) Although the fair exchange guarantees provided within our framework are based on incentives, these incentives are directly proportional to the costs to the entity confirming transactions for breaking fair exchange. These costs can be arbitrarily high. This becomes apparent when the entity providing preconfs is playing a repeated game with consistent positive payoffs for providing fair exchange, and/or one negative “doomsday” payoff for deviating. These incentives correspond to collecting fees for providing fair exchange, and having large token holdings whose value is tied to trust in the underlying blockchain respectively. Any once-off incentive to deviate bounded by these costs then becomes irrational. This is in-line with game-theoretic results like [Folk’s Theorem](https://faculty.haas.berkeley.edu/stadelis/Game%20Theory/econ160_week6.pdf).

### Organisation of the Article

We start by introducing the concept of timely fair exchange, followed by the introduction of a framework with which to consider and compare timely fair exchange solutions. This framework describes the components needed for any timely fair exchange protocol, as well the key properties and desiderata of any such protocol. With this framework in hand, we use it to identify optimal solutions to the timely fair exchange protocol depending on the design constraints of the underlying blockchain. We then apply our framework to both existing and prospective preconf protocols, including a discussion on the general suitability of gateways as an L1 preconf solution. 

# Timely Fair Exchange

In [traditional literature](https://dl.acm.org/doi/pdf/10.1145/266420.266424), the fair exchange property is defined as follows:

**Definition 2: Fair Exchange**

When two parties exchange digital items (e.g., electronic contracts, payments, or signatures) either both parties receive the expected items or neither does.

However, as we have seen in the introduction, for preconfs, the *timeliness of the exchange* is key. To capture this intuition, we introduce a property called *timely fair exchange*, or TFE for short:

**Definition 3: Timely Fair Exchange (TFE)**

When two actors exchange digital items (e.g., electronic contracts, payments, or signatures) either both parties receive the expected items or neither does. *Furthermore, the notification on the exchange should happen within some target time range, target, specified by one of the parties*.

The exchanged items in TFE are the preconf tip, provided by the *user*, and the preconf itself, provided by the preconfirmer. Furthermore, the target time is specified by the user in the request for preconf.

## TFE Actors

There are three actors to consider in all TFE preconf protocols:

- **User**: The entity who is requesting the timely preconf.
- **Preconfirmer**: The entity providing the preconf. In this article, we assume that preconfirmers are rational, choosing actions that maximize their expected utility over some specified time horizon. The effectiveness of a particular punishment depends on whether the preconfirmer is a:
    - **One-shot preconfirmer**: anonymized, permissionless, and/or only preconfing for a small, fixed number of preconf slots.
    - **Repeated-game preconfirmer:** well-known, permissioned, and/or expected to participate in the protocol for a large number of preconf slots/indefinitely.
    
    Although these are multi-dimensional categorizations, they are only intended for broad-stroke purposes. Within these categorizations, the Ethereum validator set is typically described as one-shot, as validators are currently elected to [expected to propose 1 block once every 140 days](https://proposalprobab.web.app/) while [the current waiting time to join or exit the validator set is less than 1 day](https://www.validatorqueue.com/). The template for repeated-game preconfirmers are centralized sequencers on L2s, while [delegated gateways on L1](https://ethresear.ch/t/becoming-based-a-path-towards-decentralised-sequencing/21733) are likely repeated-game, although details on gateway designs are still emerging.
    
- **Overseer**: The entity (or entities) monitoring the TFE with some set of actions that can force or incentivize the preconfirmer to provide TFE. Within the classification of “overseer”, many overseer designs are possible. The overseer—whether a single entity or a group—can be implemented in two ways: formally, with explicit designation in the protocol, or informally, without explicit designation, as described below.
    - **Formal**:
        - Decided at rollup genesis.
        - Elected by governance.
        - Elected through a token-holding requirement e.g. Proof-of-Stake, for alignment with one or both of:
            - the preconf protocol.
            - the underlying consensus protocol.
        - An implicit overseer through some form of intersubjective slashing, where the validators of the underlying consensus protocol can coordinate to slash a malicious preconfirmer. See [here](https://a16zcrypto.com/posts/article/the-cryptoeconomics-of-slashing/#section--13), [here](https://www.blog.eigenlayer.xyz/eigen/#:~:text=Intersubjectively%20attributable%20faults%20are%20a%20set%20of%20faults%20where%20there%20is%20a%20broad%2Dbased%20agreement%20among%20all%20reasonable%20active%20observers%20of%20the%20system%2C%20e.g.%2C%20data%20withholding.%C2%A0), and [here](https://dba.mirror.xyz/UTPfxWe65dYrUu_RJX-5VkAJypFRyw3AZh6m0dRXYZk) for more details on intersubjective slashing. This type of solution is only really needed for overseer-based L1 preconf TFE. As the appropriateness of coordinating L1 validators for slashing is more of a philosophical debate than a technical one, we omit further discussion of this technique from this article.
    - **Informal**: Overseers that are not explicitly designated within the protocol. For example, they are:
        - Users, namely wallets or L2 full nodes acting on users’ behalf, track preconfirmers and/or propagate messages to other users when TFE is suspected (***user monitoring*)**.

[The reason for needing an overseer comes from a legacy impossibility result](https://dl.gi.de/server/api/core/bitstreams/133e8d8c-bf3e-4290-87be-b55e64fc9821/content) that says TFE between untrusting preconfirmers and users cannot be guaranteed without the introduction of an overseer for mediating disputes. With this impossibility in mind, any TFE solution introduced in this document will leverage either:

1. An overseer who is trusted. We refer to such solutions as satisfying **trusted TFE.**
2. Untrusted but economically rational overseer. We refer to such solutions as satisfying **economic TFE.**

These properties of trusted or economic TFE say nothing about the extent to which the overseer can affect the censorship and liveness of the underlying consensus protocol, or the exact incentive of a rational preconfirmer to behave honestly. The exact classification of these properties are explained on a protocol-by-protocol basis, and summarized in the proceeding section.

### **Why would a rational preconfirmer deviate from TFE in economic TFE protocols?**

The incentive for a preconfirmer to deviate from TFE comes from the change in value of the underlying transactions or state-access being preconfed with respect to time. Namely, certain types of MEV such as [CEX-DEX arbitrage](https://arxiv.org/abs/2208.06046) have been proven to grow in expectation with respect to time. More than this, as the size of the mempool grows, so too does the combination of transaction orderings, which is also a source of value for proposers and preconfirmers with the ability to delay confirming transactions until the last possible moment. 

# Properties of TFE Solutions

Two key properties determine the effectiveness of a TFE solution:

- **Punishment**: What trust assumptions or economic mechanisms ensure TFE holds as expected for the user?
- **Liveness Dependency on Overseer**: What additional trust assumptions or risks related to censorship and liveness are introduced by the overseer?

## Punishments

All TFE punishments are triggered by a TFE violation, with violations corresponding to the preconfirmer violating the target time range of a preconf request. The possible strength of a TFE guarantee almost directly corresponds to the strength of punishment, which we outline in approximate order of strength (from strongest to weakest) below. 

1. **Real-time Punishment** A permissioned overseer processes all preconf requests and enforces that preconfs corresponding to each request satisfy TFE. This can be done according to the following:
    a. A preconf is valid if and only if the overseer signs for the preconf.
    b. Requests must be forwarded to the preconfirmer by the overseer.
    c. Preconf tips are valid if and only if the overseer signs for the preconf.
2. **Ex-Post Punishment:** 
    a. **Slashing:** The preconfirmer loses some predetermined amount which is set out by the preconf protocol. Although violations imply that one or more requests are not TFEd, users gain indirect protection of TFE because a rational preconfirmer will avoid risking their staked collateral by violating TFE. Requires a permissioned overseer to mediate TFE violations.
    b. **Blacklisting:** The preconfirmer is blacklisted from preconfing for a specified duration. Requires a permissioned overseer to update the blacklist. 
    c. **Short-term orderflow loss:** If the preconfirmer violates TFE, the preconfirmer loses preconf orderflow from users for the remainder of their current preconf slot (which can span over multiple Ethereum consensus slots). This orderflow loss can be triggered by user monitoring, or some permissioned overseer.
    d. **Long-term orderflow loss:** If the preconfirmer violates TFE, the preconfirmer loses preconf orderflow for all future preconf slots. Again, this orderflow loss can be triggered by user monitoring, or some permissioned overseer.

We have ordered these Ex-Post TFE Penalties in such a way that any protocol implementing penalty $2.x$ can also implement $2.(x+1)$, $\forall x \in \{a,b,c\}$ , with minimal additional protocol changes e.g. any protocol with permissioned entities capable of $b$., blacklisting a preconfirmer, can use those permissioned entities to signal to users and wallets to stop sending $c$., short-term, and $d$. long-term orderflow to the offending preconfirmer. 

## Liveness Dependency on Overseer

This property of TFEs aims to identify the exposure that a preconf protocol and the underlying blockchain protocol have on the Overseer. Although the threat of impacting liveness can be used to deter misbehaviour of the preconfirmer, it may also change the censorship and liveness properties of the chain for which the preconfs are being provided.

A TFE which puts the Overseer on the critical dependency path for liveness would deem a TFE protocol unsuitable for deployment on a protocol with a strict liveness requirement.  

![image|690x212](images/6p2TpNOrm1nalDw0mTUlKkqsM9o.png)
*A possible scale for comparing the liveness dependency of an overseer signature.*

For simplicity, in this document we avoid future qualification of liveness dependency beyond “liveness dependency” or “no liveness dependency”. 

# A Framework for Comparing TFE Solutions

With the properties and categorizations of the previous section in hand, we are now equipped to compare preconf protocols based on their strength of punishment and category of preconfirmer. Recapping the components we’ve outlined already, TFE solutions must define the following components. Highlighting in **bold** represents the ideal implementation of the respective component, all else being equal:

1. **Overseer Definition**:
    a. Is the Overseer formal?
        -   **No:** No need to govern and subsidize the overseer.
        - Yes: Governance and/or subsidizing is needed to select and oversee the overseer.
    b. (For specific implementations) How can the overseer identify & report TFE failures?
2. **Enforcement & Punishment**: What punishments are imposed on TFE violators? We have classified these punishments as:
    a. Real-time enforcement
    b. Slashing
    c. Blacklisting
    d. Short-term orderflow loss
    e. Long-term orderflow loss

For each TFE solution, we are primarily interested in two properties. Highlighting in **bold** represents the ideal satisfactions of the respective property, all else being equal:

1. **Effectiveness of punishment:** Is the punishment expected to be effective at guaranteeing TFE? We try to keep the satisfaction of this property as a tertiary variable:
    a. **High:** punishment is very effective. 
    b. Medium: punishment can be parameterized to have High or Low effectiveness, and exact implementation details will be important.
    c. Low: punishment is not effective. 
2. **Liveness Dependency on Overseer:**  Can the overseer affect the censorship resistance and liveness of the underlying blockchain?
    a. **No:** Ideally, there should be no liveness dependency on the overseer.
    b. Yes: A dependency exists, which is less desirable.

Before defining specific protocols, we now provide a high-level understanding of how each TFE enforcement mechanism performs in the presence of One-Shot and Repeated-Game Preconfirmers.  To do this we, for each combination of proposer type and enforcement mechanism, we specify a triple that describes:

**(** *1. Liveness Dependency on Overseer,*
*2. Need for a Formal Overseer*
*3. Effectiveness of Punishmen*t **)**

| Punishment | Repeated-Game Preconfirmer | One-shot Preconfirmer |
| --- | --- | --- |
| Long-term orderflow loss | (1. **No** , 2. **No** , 3. **High**) | (1. **No** , 2. **No** , 3. Low) |
| Short-term orderflow loss | (1. **No** , 2. **No** , 3. **High**) | (1. **No** , 2. **No** , 3. Low-Medium*) |
| Blacklisting | (1. **No** , 2. Yes, 3. **High**) | (1. **No** , 2. Yes, 3. Low) |
| Slashing | (1. **No** , 2. Yes, 3. **High**) | (1. **No** , 2. Yes, 3. Low-**High****) |
| Real time enforcement | (1. Yes, 2. Yes, 3. **High**) | (1. Yes, 2. Yes, 3. **High**) |

*Table 1: Analysis of the combinations of proposer type and enforcement mechanism. The **bolded** entries indicate the broad-stroke preferred satisfaction of the respective property, that is:*
*1. **No liveness dependency on overseer.***
*2. **No requirement for formal overseer.***
*3. **High Effectiveness of Enforcement & Punishment.***

**depends on expected value of remaining orderflow in preconf slot.*
***depends on slash amount.*

## Optimal TFE Solutions within our Framework

If we focus only on the tuple entries all in bold, there is one general class of TFE solution deployable today that satisfies all properties optimally. This is “*repeated-game preconfirmers with short-term and long-term orderflow loss*” in Table 1. 

For L2s, centralized sequencers elected by L2 governance are ideal candidates for this. On L1, introducing a repeated-game preconfirmer in the presence of a decentralized validator set acting as proposers is not so obvious. We postpone the discussion of gateways, a potential implementation of repeated game preconfirmers on L1, to the discussion section.

![image|690x397, 75%](images/fQ4mszx3uxANod4GD06Cniym69g.png)
*User monitoring for Centralized Sequencer L2s.*

Focusing on L2s, a centralized sequencer elected by L2 governance is “maximally aligned” in the same way that we envision a governance-elected overseer would be. We can be very confident a centralized sequencer won’t violate TFE because, in the presence of user monitoring, doing so risks the exodus of users and the devaluation of sequencer/governance token holdings: maximal long-term order flow loss in our framework.

However, centralized sequencers create a single point of failure along the critical path for short-term censorship and liveness. While this failure mode is acceptable within the TFE framework, centralized sequencer L2 users must resort to a delayed inbox for sequencing, potentially resulting in delays of [24 hours](https://docs.arbitrum.io/how-arbitrum-works/transaction-lifecycle#bypassing-the-sequencer) or more, depending on the rollup’s [delayed inbox design](https://docs.optimism.io/stack/transactions/forced-transaction).

What, then, are the optimal solutions in an environment without centralized sequencers?

## Optimal TFE Solutions for Preconfirmations without Centralized Sequencers

We now outline the key environments in which preconfs are to be used outside of centralized sequencer setups, and the most appropriate/effective TFE solutions for each.

### **L2 Preconfirmations with a Decentralized L2 Proposer Set**

This setting includes based L2 protocols, such as [Taiko](https://taiko.xyz/) and [Surge](https://www.surge.wtf/). 

**Recommendation:** Formal overseer with slashing capabilities. This corresponds to the “*one-shot preconfirmer with slashing*” case in Table 1.

**Why?:** High effectiveness of enforcement mechanism, no liveness dependency on overseer, overseer can be chosen by rollup governance to be maximally aligned with the long-term success of the L2.

![image|656x500, 75%](images/sHibH535FSqXiiBRD1s3H4BGvKs.png)


Let’s go over the components:

- **Overseer:**
    - **Who:** The overseer can be a single TTP, many TTPs, opted-in preconfirmers, independent AVSs or opted-in validators. The overseer is recommended to be governed by the rollup governance, as the rollup is the one incentivized to provide good UX in exchange for short-term revenue loss.
    - **Failure Detection Mechanism:** The overseer will form a consensus on the timely release of the preconfs.
- **Enforcement & Punishment**:
    - If the timely release did not happen, then the consensus of the committee can be sent to wallets as a warning signal, or posted to L1 to either:
        - Blacklist the preconfirmer.
        - Slash the preconfirmer.

**Properties:**

- **Strength of Guarantee**
    - As a user, any preconf request you send only has economic guarantees of preconf of TFE. However, as long as the overseer committee is honest, the preconfirmer should be incentivized to uphold TFE to avoid slashing.
- **Liveness Dependency on Overseer**
    - None, as slashing is only retroactive.

### **L1 Preconfirmations**

Unlike in the case of L2 preconfs, there is no obvious recommended protocol for L1 preconfs as each brings different tradeoffs. As such, we make two recommendations based on the following requirements

1. **“Fast-track” recommendation**: We want to enable and incentivize L1 preconfs immediately, albeit with the introduction of a formal overseer who is not elected by the underlying protocol.
2. **“Slow-yet-steady” recommendation**: Rather than introducing a formal overseer into the L1 block-building pipeline, we wait until the research on gateway delegation and/or attestor-proposer separation matures. At that point, “guardrails” (discussed in the Appendix) can be implemented to prevent monopolization, and the combination of user monitoring and preconfirmer reputation can serve as the TFE solution.

**“Fast-track” recommendation:** Utilize one or more external overseer protocols to enforce slashing for TFE violations. The description of this protocol is identical to the protocol described in the previous section: **L2 Preconfirmations with a Decentralized L2 Proposer Set**, albeit with a less obvious design for the formal overseer.

**Why?:** High effectiveness of enforcement mechanism, and no liveness dependency on overseer.

**Why Not?:** Open questions regarding the implementation of the formal overseer on L1.

![image|656x500, 75%](images/j9yb2wNXYDInF5xlvIpEBGWMAM5.png)
*Formal L1 overseer designs are more complex than their L2 counterparts, without the ability to leverage governance or a native aligned token whose value will change dramatically with overseer misbehaviour. Instead, overseers will probably need to be reputable semi-trusted entities. It is not clear if such a design is suitable for enforcing sequencing preferences on L1.*  

**“Slow-yet-steady” recommendation:** Utilize some form of informal user-monitoring of TFE to identify and signal TFE violations to the wider community.

**Why?:** No liveness dependency on the overseer, as well as no requirement for a formal overseer.

**Why Not?:** Low effectiveness of enforcement mechanism without repeated-game preconfirmers.

![image|690x397, 75%](images/fQ4mszx3uxANod4GD06Cniym69g.png)
*User monitoring has limited effectiveness in the current one-shot preconfirmer paradigm of L1. However, this may change if the L1 proposer role transitions to being higher resource, reputable, and importantly **repeated game**, as is promised through Attestor-Proposer Separation.* 

Let’s go over the components:

- **Overseer:**
    - **Who:** The end-users of the preconf protocol.
    - **Failure Detection Mechanism:** Locally monitor the timely releases of preconfs. In practice, the monitoring will be done either by their wallets or the full nodes they are connected to.
- **Enforcement & Punishment**:
    - Stop sending user orderflow to preconfirmer if a TFE violation is detected.
    - Hurt reputation of preconfirmer for non-preconf orderflow.

**Properties:**

- **Strength of Guarantee**
    - As a user, the preconf request you send won’t have a TFE guarantee. However, the threat of the Punishment mechanism as stated above provides some economic guarantee that the preconfirmer upholds TFE. The more valuable the orderflow the preconfirmer would lose through the enforcement mechanism, the stronger the TFE guarantee becomes. TFE guarantees through user monitoring are stronger when preconfirmers have reputation, are likely to be elected again, as well as when requests are earlier in the slot, as these all entail higher opportunity costs for breaking TFE than the alternatives; no reputation, unlikely to be elected to preconfirm again, little to no orderflow remaining in the preconfirmers slot.
- **Liveness Dependency on Overseer**
    - None.

## Applying Our Framework to Existing Protocols

We outline some of the most well-known preconf protocols in use/proposed for use today, and how these protocols fit into our TFE framework.

## Mev-commit

[Mev-commit](https://docs.primev.xyz/v1.0.0/get-started/welcome-to-primev) is described as follows.
![image|690x285, 75%](images/sT7FtHBciG0e2h1BKTbDQdmXPQm.png)
*The committee in mev-commit receives preconfs from the preconfer, and reaches consensus on the timestamp to determine the preconf tip to be paid to the preconfer from the user. The committe may also be used to slash the preconfer in case the preconfer reneges on a provided preconf.*

Let’s go over the components:

- **Overseer:**
    - **Who:** In mev-commit the overseer is the [chain/committee responsible for reaching consensus on the satisfaction of preconf requests](https://docs.primev.xyz/v1.0.0/concepts/mev-commit-chain/chain-details). Initially, the committee members are whitelisted validators running proof-of-authority consensus, [but there are plans to include any restaked validator who chooses to opt in](https://docs.primev.xyz/v1.0.0/concepts/mev-commit-chain/chain-details#progressive-decentralization).
    - **Failure Detection Mechanism:** The committee forms consensus on whether preconfs are released on time or not.
- **Punishment**:
    - Preconf tips degrade based on how late the preconf is provided.
    - If TFE is violated e.g. a preconfirmer reneges on a preconf, [preconfirmers can be slashed](https://docs.primev.xyz/v1.0.0/concepts/rewards-and-slashing/rewards-and-slashing#slashing-for-broken-commitment).

**Properties:**

- **Strength of Guarantee**
    - Currently, the slashing amount for violating preconf request conditions in mev-commit is [low, approximately equal to the tip being paid.](https://docs.primev.xyz/v1.0.0/concepts/rewards-and-slashing/rewards-and-slashing#slashing-for-broken-commitment) Within our framework, this slashing amount is more comparable to short-term orderflow loss than a disincentivizing slashing amount e.g >1 ETH. Although there are p[lans to implement an arbitrarily high slashing amount](https://primev.xyz/whitepaper), such a design has not been implemented yet.
- **Liveness Dependency on Overseer**
    - **Preconf liveness dependency:** Yes. If the overseeing committee has a liveness issue or starts censoring, then preconfs can not be settled.
    - **General transaction liveness dependency:** No. The preconfirmer has no obligation to utilize mev-commit, and can source normal transactions from outside mev-commit.

## Espresso

[Espresso](https://docs.espressosys.com/network/learn/the-espresso-network) is not necessarily constructed to handle TFE, although it can be easily adapted to enable TFE. We now describe the Espresso architecture and how it can handle TFE.

![image|690x285](images/sT7FtHBciG0e2h1BKTbDQdmXPQm.png)
*The committee in Espresso receives preconfs from the preconfer, as in mev-commit. Unlike mev-commit, the Espresso committee is required to sign-off on a transactions for the transaction to be considered valid for consensus. If TFE breaks, or a block does not match the provided preconfs, the Espresso committee will not sign for the block and the block cannot be proposed for consensus.*

Let’s go over the Espresso components:

- **Overseer:**
    - **Who:** The overseer is a committee of opted-in restaked validators.
    - **Failure Detection Mechanism:** The committee will form a consensus, and the consensus will agree on whether the preconf was released on time or not.
- **Enforcement & Punishment**:
    - If the TFE is violated, then the L2 transaction itself cannot be included in an L2 block, as the quorum certificate from the overseeing committee is a requirement for the L2 block’s validity.

**Properties:**

- **Strength of Guarantee**
    - As long as a Byzantine majority of the committee are honest, users are ensured that transactions will not be executed unless there is a timely release of the corresponding preconf.
- **Liveness Dependency on Overseer**
    - **Preconf liveness dependency:** Yes.
    - **General transaction liveness dependency:** Espresso has two possible designs for rollups opting into Espresso preconfs. These are with or without an escape hatch in the case of a liveness failure (too much time has passed since a rollup block was submitted to L1).
        - Without the escape hatch, general transactions have a liveness dependency on the overseeing committee.
        - [With the escape hatch](https://docs.espressosys.com/network/learn/the-espresso-network/internal-functionality/light-client#escape-hatch-functionality), eventual liveness of transactions is maintained. However, short term liveness (liveness before the escape hatch time limit) and censorship resistance is dependent on the overseeing committee.

## L1 Gateway Designs

[Gateways are expected to be sophisticated, reputable entities that L1 proposers can choose to outsource to.](https://ethresear.ch/t/becoming-based-a-path-towards-decentralised-sequencing/21733) Gateways are almost definitely classifiable as repeated-game preconfirmers due to the investment needed to be sophisticated, technologically-advanced, and reputable entities. Although this may seem theoretically similar to centralized sequencers on L2s, the current lack of a forced inclusion mechanism in the face of a misbehaving gateway makes the enforcement mechanism fundamentally different. This is particularly apparent with respect to the enforcement of TFE, and the corresponding effectiveness of enforcement. 

If user-monitoring is used for overseeing TFE from a gateway, users currently would have no alternative mechanism to submit transactions to L1 in the face of a misbehaving gateway. This problem becomes critical in the face of a monopolizing gateway, which is a distinct possibility given the centralizing nature of the role (described in the Appendix).

With this in mind, it appears that for gateway TFE, or any subjective requirement from a gateway to be enforced, a formal overseer is needed.  [Actively validated services](https://docs.eigenlayer.xyz/eigenlayer/overview/) (AVSs) are viable candidates for implementing such an overseer. However, a formal overseer with the ability to subjectively slash L1 preconfirmers (including proposers) is a [contentious design area](https://ethresear.ch/t/the-risks-of-lrts/18799?utm_source=chatgpt.com). The extent to which a formal overseer should be allowed to subjectively slash L1 preconfirmers is unclear, and beyond the scope of this work. Furthermore, we believe a more viable path to achieving repeated-game preconfirmer guarantees on L1 is through the adoption of some form of [Attestor-Proposer Separation](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683), another open area of research. 

# Conclusion

The design space for TFE solutions is always developing, in much the same way that the L1 and L2 space is always developing. This article establishes a framework for understanding, evaluating, and comparing TFE solutions. One of the core takeaways from this framework is the need for any TFE solution to specify the overseer, how the overseer enforces TFE, and how the overseer can affect censorship and liveness of transactions on the underlying blockchain.  

For rollups, we recommend TFE solutions that use “skin-in-the-game” overseers who have a lot to gain or lose depending on the success of (or exodus from) their rollup. Such overseers are perfectly placed to handle the subjective nature of timely fair exchange of preconfs. 

For L1, there is no clearly superior TFE solution to recommend. In the current L1 design with permissionless validators doubling up as proposers, formal monitoring is likely needed. Who would emerge as a trusted formal overseer, and how large their punishment capabilities should be are unclear. Our main recommendation with respect to L1 preconfs and TFE is to implement guardrails needed to protect the censorship and liveness of the L1 against the emergence of dominant proposers and gateways.  

# Appendix

## Extended Gateway Discussion

Under the current L1 design of proposers elected pseudorandomly from the validator set, gateway selection by these proposers would almost definitely resemble a “marketplace of gateways”, where gateways compete over the expected amount of revenue they can promise proposers; effectively an ahead-of-time auction. 

Competition on proposer revenue depends on both gateway sophistication (block-building & MEV-extraction capabilities, risk tolerance, connectivity, infrastructure in general), and reputation to ensure users send the gateway their orderflow. Once elected, a gateway gains exclusive access to provide execution preconfs. This creates a self-sustaining flywheel of:

reputation → orderflow →block-value → profitability → election probability→reputation…

This is a centralizing system:

1. The ahead-of-time nature of the auction means gateways are [competing on average proposer revenue in the long run](https://arxiv.org/pdf/2408.03116). 
    a. Over any period of time, there can only be one gateway with the highest average proposer revenue. Although the gateway with the highest expected proposer revenue for preconfirming a slot may change eventually, this will not change over short and medium time-frames (months to years), as a result of the time it can take for competitors to gain technological superiority. This has been seen repeatedly in modern high frequency trading markets (discussed [here](https://www.econstor.eu/bitstream/10419/86769/1/11-076.pdf), [here](https://www.sciencedirect.com/science/article/abs/pii/S138641811300027X), and [here](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2388265)), where speed and execution quality are comparable, if not directly related to the requirements of gateways .

    b. Unless smaller gateways can either persuade users to reserve their orderflow exclusively for them—even if that means delayed execution—or convince validators to delegate to them despite offering lower revenue, any gateway marketplace will ultimately become a winner-takes-all market.
2. New entrants are required to make significant technological investments to compete with a dominant gateway. This creates a technological arms race that can only be played by a small number of high-resource individuals. 

In this winner-takes-all paradigm, L1 gateway solutions most closely resemble the centralized sequencer L2s classification. Individually rational L1 proposers would choose the highest paying gateway. This leaves a single entity sequencing the entire L1, which creates a clear censorship and liveness dependency. The most profitable gateway can arbitrarily choose to censor individuals, or even stop producing blocks e.g. during maintenance. As long as the dominant gateway remains more profitable than their nearest competitor, users are forced to send transactions to the gateway, or get sequenced in a considerably worse condition (e.g. wait for the next proposer not opted in to the gateway).

### Defending against Monopolizing Gateways (assuming Gateways are adopted)

There are guardrails that can be put into place to limit the negative consequences of the winner-takes-all nature of gateways, some of which we list below:

1. **Inclusion lists:** Inclusion lists would greatly limit the power of a dominant gateway to censor and affect liveness. Even still, TFE would only be enforceable with some way to explicitly punish the gateway (through a formal overseer, see next point), or reducing gateway orderflow. Given a dominant gateway, reducing orderflow would mean migrating to another blockchain ecosystem.
2. **Formal Overseer:** Given a dominant gateway emerges, user-monitoring on its own is likely not strong enough to enforce TFE violations, given the current lack of alternative ways to submit transactions to L1. A formal overseer with the ability to blacklist or slash gateways may be an acceptable protection. However, as mentioned earlier in the article, it is not clear how a formal overseer would be chosen as the mechanism with which to govern L1 sequencing. Diversity of L1 overseers/tiered L1 overseers, each with their own slashing capabilities, might be an interesting area of research in this regard.
3. **Acceleration of Attestor-Proposer Separation:** Although not a direct guardrail, attestor proposer separation is an in-protocol implementation of the out-of-protocol gateway delegation on which gateways would depend. Any in-protocol solution would isolate the decentralized attestor set from the profit-maximizing nature of proposing. Any proposer election mechanism in this future would need to have in-protocol guardrails in place to handle a dominant proposer emerging.

In conclusion, L1 gateway solutions may seem acceptable in the short-term. However, without clear protections in place to protect against a monopoly gateway sequencing L1, gateway preconf solutions should be adopted with considerable caution.