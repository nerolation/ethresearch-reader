![stretched_image|690x218](images/owUTgyw8PAPlRvKtg3n8ZC2gfoE.png)
^*Attesters, Execution Proposers and Includers in the wild*

***by [Thomas Thiery](https://x.com/soispoke), - January 31st, 2025***

*Thanks to [Julian](https://x.com/_julianma), [Barnabé](https://x.com/barnabemonnot), [Caspar](https://x.com/casparschwa), [Anders](https://x.com/weboftrees), [Justin](https://x.com/drakefjustin) and [Connor](https://x.com/ConorMcMenamin9) for discussions, ideas, feedback and comments!*

***Disclaimer**: The goal of this post is to spark conversation about potential ideas, proposals, and mechanisms for the future of staking on Ethereum. It should not be considered an agreed-upon position by the EF or the broader Ethereum research community. While the general trend toward separating core protocol duties is relatively well-documented and supported, the specific mechanisms discussed here reflect my personal views on directions worth exploring.*

*Also, reviews ≠ endorsements. This post expresses opinions of the author, which may not be shared by reviewers.*

# Introduction

On Ethereum, validators don’t “just validate”. They participate in consensus and cast votes, they build and propose beacon blocks and execution payloads, they participate in sync committees, they aggregate votes… Soon, they may also be asked to build and propagate [inclusion lists](https://eips.ethereum.org/EIPS/eip-7805), assess the amount of [MEV that should be burned](https://ethresear.ch/t/mev-burn-a-simple-design/15590/1) or the [timeliness of an execution payload](https://ethresear.ch/t/payload-timeliness-committee-ptc-an-epbs-design/16054) delivered by builders. Relying on a single tier of participation to perform all protocol duties ends up becoming impractical when asking single entities to meet conflicting demands like high performance and low hardware requirements to preserve decentralization. Today, we constantly face the fact that home stakers, while crucial for upholding the network’s censorship resistance and permissionless properties, also serve as a bottleneck to scaling (e.g., faster finality, increased gas limit, more blobs). 

In recent years, a trend has emerged to unbundle roles and duties. Proposals like [Proposer-Builder Separation](https://barnabe.substack.com/p/pbs) (PBS, also see [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732)), [Attester-Proposer Separation](https://www.youtube.com/watch?v=MtvbGuBbNqI) (APS), [Attester-Includer Separation](https://ethresear.ch/t/towards-attester-includer-separation/21306) all reflect efforts in this direction. This post, inspired by [Rainbow Staking](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683?u=barnabe) and other [posts](https://notes.ethereum.org/@vbuterin/staking_2023_10#Protocol-and-staking-pool-changes-that-could-improve-decentralization-and-reduce-consensus-overhead) on [two-tier](https://notes.ethereum.org/@mikeneuder/goldilocks) [staking](https://notes.ethereum.org/bW2PeHdwRWmeYjCgCJJdVA), aims to propose a holistic approach to safely match core protocol roles with core protocol duties by defining the desired properties for each tier of staker and proposing potential mechanisms for selection and reward.

# General idea

All participants belong to a **single, unified pool** of stakers. Each slot, three different roles are chosen from this pool:

1. **Attesters**
2. [**Includers**](https://ethresear.ch/t/towards-attester-includer-separation/21306)
3. [**Execution Proposers**](https://ethresear.ch/t/exploring-sophisticated-execution-proposers-for-ethereum/21386)

*These three roles are non-exhaustive: protocol participants can also be selected to be part of the sync committee, to aggregate attestations, or to be the beacon proposer (which was left out here because it’s still unclear to me where it best fits in this new unbundled world…). But in this post we choose to focus on attesters, includers and execution proposers given the potential impact of separating their core duties.*

Each staker must explicitly opt into the role(s) in which they wish to participate. They may choose to take on one, two, or all three roles, as long as they meet the associated capital requirements. Each protocol participant can mix and match these roles (e.g., serving as both an attester and an includer) and decide how to allocate their capital and efforts based on their preferences (such as contributing to the network’s censorship resistance), constraints (such as hardware requirements), and level of sophistication.

By unbundling responsibilities into three tiers, the protocol more closely aligns each role with its core duties. This structure allows each actor to specialize—enabling execution proposers to deliver more performance without compromising the decentralization of the attester set and the security they provide, or the censorship resistance properties maintained by includers. It also provides a robust “baked-in” failsafe mechanism by allowing participants to step in and fulfill other roles if needed. The goal is to achieve and maintain a balance between specialization and integration to preserve the overall system coherence.

![Screenshot 2025-01-31 at 09.27.56|690x487](images/72Ce4xS8wQzG8w7jAvJ57vf5ZDY.png)
> Figure 1. This Venn diagram illustrates the three tiers of participants—**Attesters** (yellow), **Includers** (green), and **Execution Proposers** (blue)—and shows how they can overlap. The outer circle denotes the broader set in which all participants operate, and the size of the squares represent the amount at stake for each protocol participant.

# Roles and Participants

In this section, we outline the **desired properties**, **capital requirements**, the **selection** and **reward mechanisms**, as well as the **failsafe mechanism** for the three tiers of participation**.**

*Note: These proposed mechanisms and requirements represent promising avenues to explore, rather than serving as a definitive or agreed-upon choice.*

## **Execution Proposers**

Execution proposers are responsible for proposing a valid execution payload to the rest of the network. They have the final say over transaction inclusion and ordering, provided they include all required IL transactions. We expect these entities to maintain advanced infrastructure to run (or outsource) complex MEV extraction strategies, possibly manage pre-confirmations, and handle delegated stake (see selection mechanism section below). Explicitly relying on sophisticated parties to handle the execution payload gives us the potential to drastically scale and increase the chain’s performance (e.g., achieving higher throughput) without introducing more centralization for the already sophisticated (out-of-protocol) builder market. At the same time, we can implement checks and balances to (1) shield other roles from centralizing forces and (2) use clever mechanisms and incentives to avoid over-centralization of the execution proposer set.

### **Desired properties**

- *Performance and reliability*: Ideally, execution proposers are able to reliably provide services requiring large capital and hardware requirements to potentially build and propose valuable blocks, provide pre-confirmations, download and propagate blobs across the network, etc.
- *Avoid over-centralization*: While we expect the execution proposer set to be somewhat centralized by nature, we want to prevent situations where a very small number of entities dominate execution-proposing rights. Such scenarios could lead to undesirable outcomes like monopolistic pricing and would be problematic from both a memetics and ethos perspective.

### **Capital requirements**

- *In protocol:*
    - *Small to Medium (e.g., `32 ETH`) —* To qualify as an **execution proposer**, a participant must have a stake of at least `32 ETH`, allowing to disincentivize misbehavior, such as liveness faults, via missed slots penalties.
- *Out-of-protocol:*
    - *Large —* Execution proposers will most likely need to gather the necessary capital to pay their bids, execute advanced MEV strategies (e.g., non-atomic arbitrages) and offering additional services such as pre-confirmations.

### Selection mechanism: Delegation-Based Tullock Contest (DBTC)

In a [Tullock contest](https://www.chapman.edu/ESI/wp/GeneralizedTullockContest-Sheremeta.pdf), participants expend resources to increase their probability of winning a valuable “prize.” Here, the prize is the right to propose execution blocks and capture MEV (Maximal Extractable Value) plus priority fees. Execution proposers compete to attract delegations from other parties called delegators (e.g., attesters and includers, or potentially any ETH holder) by sharing a portion of their earnings. The probability of being selected to produce a block is proportional to the total stake delegated to each proposer.

**Crowding-out effect and equilibrium**

When a proposer offers higher returns, it initially draws many delegators. This influx of stake can dilute *per-delegator* rewards, driving some delegators to switch to smaller proposers that offer a better yield on a per-unit basis. Over time, this dynamic encourages competition, reduces profit margins, and leads to an equilibrium reminiscent of a Tullock contest: multiple proposers coexist with comparable returns rather than a single dominant player.

***Key Assumption: Near-Constant Marginal Returns***

A crucial assumption in this delegation-based Tullock framework is that execution proposers’ profits exhibit **constant (or near-constant) marginal returns** with respect to their delegated stake. This ensures that once a proposer is “too big”, the marginal gain in per-delegator returns diminishes enough to nudge some delegators toward smaller or newer proposers.

- **If marginal returns increase** (e.g., due to exclusive order-flow deals or powerful MEV synergies), being bigger becomes disproportionately more profitable—potentially causing a winner-takes-all outcome.
- **If marginal returns decrease heavily**, the mechanism stops being incentive compatible, because participants could split their stake among multiple identities and earn more overall.

Maintaining near-linear (constant marginal) returns is therefore key to balancing competition, avoiding over-centralization, and preventing splitting.

Interestingly, it’s also worth considering the delegation part of the mechanism as an add-on to the Tullock contest, allowing delegators to direct delegations not solely on yield, but on broader considerations and preferences, including ethos and a commitment to decentralization across all levels of the Ethereum supply network. Unlike purely market-based mechanisms, the social and operational overhead of delegation makes it considerably harder for a proposer that has failed or misbehaved to regain lost delegations and trust.

> *Note: While other selection ideas—like [Execution Tickets](https://ethresear.ch/t/execution-tickets/17944) or [Execution Auctions](https://mirror.xyz/barnabe.eth/QJ6W0mmyOwjec-2zuH6lZb0iEI2aYFB9gE-LHWIMzjQ)—exist, the delegation mechanism is highlighted here for its novelty, and its potential to avoid over-centralization. Further research in this direction (h/t Conor and his [Appointed Execution Proposers](https://ethresear.ch/t/appointed-execution-proposers-because-the-proposer-you-know/19284) post) is needed to specify the details of this mechanism.*
> 

### **Reward mechanism:** *MEV and priority fees*

Execution proposers collect both MEV and priority fees from the blocks they build. They then share an fraction share of these rewards with their delegators, in proportion to each delegator’s share of the execution proposer’s total stake. By adjusting the share they offer, execution proposers can make themselves more or less attractive to new delegators. 

### **Failsafe mechanism**

- *Re-delegation*: The delegation-based selection system incentivizes stakers to seek higher returns but could also prevent the excessive concentration of execution-proposing rights. If a single execution proposer accumulates too much power—or if delegators lose confidence in their performance or integrity—delegators can reassign their stake to other candidates, preserving the network’s neutrality. We can imagine out-of-protocol services that dynamically manage delegations, allowing delegators to respond quickly to changes in  performance or trustworthiness. Transparency and publicly available dashboards (e.g., à la [L2beat](https://l2beat.com/scaling/summary)) would also play a crucial role in ensuring accountability, providing real-time insights into exeuction proposer performance and enabling more informed decision-making by delegators.
- *Attesters as fallback*: ****In the event that **no one** opts in to be an execution proposer, attesters (presumably, with a large amount at stake) can temporarily assume the block-proposing role by including at least transactions from includers’ ILs and a vanilla block built by an attester to ensure the chain continues producing valid blocks despite a lack of dedicated proposers, preserving both liveness and censorship resistance. It is worth noting that falling back on attesters might lead to some trade-offs in terms of performance (e.g., less valuable blocks, less blobs included per slot) which should be evaluated. Another option is to allow attesters with sufficient stake to opt in as a fallback option in case no execution proposer is available, provided they meet the minimum requirements for fulfilling this role.

## **Attesters**

Attesters secure the network by ensuring that both the consensus and execution information in proposed blocks are valid according to their view. The economic security they provide is determined by the amount of stake they put up, which exposes them to slashing if they misbehave. Their role is to vote for blocks that pass all validity checks, including being built on the correct head, containing valid transactions, and satisfying inclusion list (IL) conditions.

### **Desired properties**

- *Economic security***:** A *substantial* amount of stake (e.g., `20M ETH`) should *eventually* secure blocks proposed to the network, making it prohibitively expensive to attack or control more than one-third of the total stake.
- *Fast finality:* A *sufficient* amount of economic security should be attained shortly after a block is proposed (for instance, [within 3 slots](https://ethresear.ch/t/3-slot-finality-ssf-is-not-about-single-slot/20927)) to ensure fast, guaranteed settlement. Faster finality can be achieved using a combination of technical—[such as an optimally secure consensus protocol, more efficient signature aggregation, and validator capping](https://vitalik.eth.limo/general/2024/10/14/futures1.html)—and economic approaches like issuance capping and maxEB.
- *Diverse stake distribution:* Stake should be spread across multiple entities so that no single or small group can dominate the majority of attesting power. This safeguards against known attacks (e.g., 51% attacks) and reduces the risk of both correlated faults and commitment attacks. One way to preserve a diverse stake distribution is to ensure participants with smaller stake (e.g., solo stakers with `32 ETH`, potentially down to `1 ETH` in the future) can can still participate in securing the network under normal conditions and serve as a failsafe if larger-stake attesters are go offline.
- *Shielded from centralization forces* like [timing games](https://arxiv.org/abs/2305.09032): Attesters shouldn’t be incentivized to deviate from honest participation in consensus—for example, by strategically delaying their votes to collect issuance rewards.
- *Robust to commitment attacks*: Attesters should be well-protected against bribery or extortion attempts that might coerce them into deviating from their honest commitments, ensuring the integrity of consensus outcomes.

### **Capital requirements**

- *Variable (e.g., f*rom `1 ETH` to `2048 ETH`).
- *Heavy* — Capital is staked, locked upfront, and put at risk of being slashed (e.g., for attesting to different head blocks).
- **Selection mechanism:** *Threshold selection (see [Orbit SSF post](https://ethresear.ch/t/orbit-ssf-solo-staking-friendly-validator-set-management-for-ssf/19928) for more details)*
    
    The Orbit threshold selection mechanism is used to attain high levels of economic security as quickly as possible while allowing inclusive participation to ensure a diverse stake distribution.
    
    1. Define a stake threshold $T_{\text{att}}$ (e.g., `1024 ETH`).
    2. Participants who opt in are:
        - With $S \geq T_{\text{att}}$: Always selected as attesters, leveraging their substantial stake for network security.
        - With $S < T_{\text{att}}$: Selected with probability $S / T_{\text{att}}$, allowing smaller stakers to participate proportionally.
    
    This selection mechanism ensures guaranteed participation by large-stake attesters with probabilistic inclusion of smaller-stake attesters. Interestingly, this selection mechanism for attesters and [staking more generally can also be viewed as a Tullock contest](https://www.youtube.com/watch?v=xIhMWcZqcQ0), in which stakers pay capital and operating costs (“all pay”), the prize is issuance rewards (for attesting), and the winning probability is proportional to their stake.
    

### **Reward mechanism**

Attesters earn issuance-based rewards for securing consensus and ensuring economic finality, proportional to their stake (again, see [*Orbit SSF post*](https://ethresear.ch/t/orbit-ssf-solo-staking-friendly-validator-set-management-for-ssf/19928)). Importantly, the shape and properties of the [issuance curve](https://ethresear.ch/t/practical-endgame-on-issuance-policy/20747) to reward attesters should be designed to interact synergistically with attester capping/rotation. 

### **Failsafe mechanism**

- Rewarding attesters via issuance provides robust guarantees to attract a “sufficient” number of participants to secure the protocol.
- By allowing includers—or smaller-stake participants in general (e.g., with a balance of at least `1 ETH`)—to opt into attesting, the protocol lowers barriers to entry and ensures more participants can step in to preserve liveness and safety if the set of large-stake validators is insufficient.
- In extreme circumstances, execution proposers could also be relied upon to maintain block finality and secure the chain; however, this would be an undesirable outcome because it risks concentrating attesting power in the hands of a few already well-capitalized actors.

## **Includers**

[Includers](https://ethresear.ch/t/towards-attester-includer-separation/21306) are responsible for upholding the network's censorship resistance by constructing inclusion lists (ILs) of transactions pending in the public mempool. In doing so, they constrain sophisticated execution proposers by specifying a set of transactions that must be included in blocks for those blocks to be considered valid.

### **Desired properties**

- *Geographic decentralization*: Ensure that the set of actively participating includers is distributed across multiple geographic regions, network topologies, or jurisdictions. This reduces the likelihood that any single region or entity can censor specific transactions, thereby preserving the network’s neutrality and permissionlessness.
- *Unlinkability*: Ideally, includers can participate in improving the network’s censorship-resistant properties and uphold chain neutrality without publicly revealing their preferences via the specific transactions included in their lists. This could be achieved using a combination of linkable ring signature schemes and anonymous broadcast protocols to protect their identities.

### **Capital requirements**

- *Low (starting from* `0.1 ETH`) — A minimal stake requirement lowers barriers to entry to encourage a diverse pool of distributed includers, while requiring some nontrivial stake helps deter Sybil attacks and could potentially be used to disincentivize malicious or unwanted behavior using penalties, or ejection mechanisms.
- *Light* — Low-friction user experience (no deposit or withdrawal queues when opting in to be an includer).

### **Selection mechanism: Random**

The protocol selects $N$ includers (e.g., 16 based on the current [FOCIL](https://eips.ethereum.org/EIPS/eip-7805) specifications but potentially more in the future) each slot using a weighted random mechanism. Each participant who has opted in to be an includer and meets the minimum stake threshold $T_{\text{incl}}$ (e.g., `0.1 ETH`) is assigned a weight proportional to their staked amount above $T_{\text{incl}}$.

### **Reward mechanism**

Includers could be rewarded using:

- An independent **transaction fee mechanism** (e.g., “inclusion fees”—see the [Towards Attester-Includer Separation](https://ethresear.ch/t/towards-attester-includer-separation/21306) post for more details). These fees can be distributed among includers who add transactions to their inclusion lists, enabling the network to self-regulate based on the current level of censorship: If many transactions are being censored, users can raise inclusion fees, thereby increasing the cost of censorship. As these higher fees are distributed among includers, more individuals are incentivized to participate in creating inclusion lists, ultimately enhancing Ethereum’s censorship resistance.
- **Issuance**, to ensure the protocol rewards participants that contribute to the network’s censorship resistance. This would involve selecting the appropriate [properties for the shape of the issuance curve](https://ethresear.ch/t/practical-endgame-on-issuance-policy/20747) and may include mechanisms like [stake ratio targeting](https://ethresear.ch/t/endgame-staking-economics-a-case-for-targeting/18751) to get a fixed number of includers.
- **No rewards**: Another alternative is to rely on the altruistic behavior of includers to build inclusion lists. While this might initially seem unappealing—since ideally, participants should be rewarded for honestly performing protocol duties—it becomes sensible when aiming to design a mechanism that preserves includers' privacy. Rewarding includers based on their contributions inherently weakens the unlinkability property. Moreover, by allowing includers to remain private and participate only on an opt-in basis, we may eliminate the need for rewards altogether. This approach relies on a genuinely altruistic set of includers, enhancing privacy without the trade-offs associated with incentives.

### **Failsafe mechanism**

- If insufficient includers are available (e.g., because inclusion fees are very low), the protocol can allow other stakers (e.g., attesters) to fill the gap. This guarantees template blocks from transactions in inclusion lists continue to be built, and preserve censorship resistance properties are upheld by the protocol.

# Conclusion

By unbundling execution proposing and block building (**execution proposers**), participating in  consensus (**attesters**), and preserving censorship resistance (**includers**), **3TS** gives each protocol participant the flexibility to choose a role—or multiple roles—that align with their preferences and requirements. This separation not only increases network resilience—by allowing different roles to step in if another group becomes underrepresented—but also unlocks more performance (e.g., by explicitly relying on sophisticated parties to build and propose execution payloads) and encourages participation from diverse stakeholders, from large-scale operators to small community members. The result is a mechanism designed to scale execution and achieve fast finality without having to trade-off security and censorship resistance even under adverse conditions. **Although additional details and implementation research are still needed**, I hope ideas from **3TS** can serve as a stepping stone for the future development of Ethereum staking.

# Things to look out for and future research

Drawing participants from a unified set using specific selection mechanisms for each tier leads to greater complexity from a mechanism design perspective, as we would need to carefully consider how roles and incentives interact with one another (in addition to designing robust independent mechanisms). However, approaching core protocol design from first principles using a more holistic approach (e.g., matching core protocol roles to core protocol duties with baked-in failsafe mechanisms) can also serve as a forcing function, encouraging teams working on different aspects of the protocol to collaborate and coordinate their efforts. This could lead to new synergies and more elegant mechanisms than those attained through uncoordinated, specialized efforts for each role.