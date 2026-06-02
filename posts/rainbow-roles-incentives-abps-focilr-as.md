*Thanks to [Roberto](https://x.com/robsaltini), [Thomas](https://x.com/soispoke), [Barnabé](https://x.com/barnabemonnot) and [Francesco](https://x.com/fradamt) for feedback.*

# 1. Introduction

## 1.1 Background

A great deal of research has been conducted on potential improvements to Ethereum's consensus layer. [Fork-choice enforced inclusion lists](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870) (FOCIL) has the potential to improve censorship resistance by allowing *includers* to list transactions that should be included in the next block. The FOCIL [EIP-7805](https://eips.ethereum.org/EIPS/eip-7805) foregoes includer incentives due to their complex interactions with proposer incentives. Designing includer incentives remains an active research objective ([1](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870#user-bidding-textpayment-and-textreward-rules-9), [2](https://ethresear.ch/t/towards-attester-includer-separation/21306)).  [Proposer--builder separation](https://ethereum.org/en/roadmap/pbs/) (PBS) aims to detach the more specialized role of block building from block proposing, with a current objective of [enshrining](https://hackmd.io/@potuz/rJ9GCnT1C) such a mechanism at the protocol level (ePBS). It is also desirable to "burn" the MEV by letting the block builder pay for the right to propose the block, and various proposals to this end have been made ([1](https://ethresear.ch/t/mev-burn-a-simple-design/15590), [2](https://ethresear.ch/t/sealed-execution-auction/20060)). An alternative to PBS: [attester--proposer separation](https://www.youtube.com/watch?v=MtvbGuBbNqI) (APS) can also be used for burning MEV ([1](https://ethresear.ch/t/execution-tickets/17944), [2](https://mirror.xyz/barnabe.eth/QJ6W0mmyOwjec-2zuH6lZb0iEI2aYFB9gE-LHWIMzjQ)). In this variant, the protocol selects an execution proposer for proposing the execution payload of the block, and this proposer has [featured](https://ethresear.ch/t/three-tier-staking-3ts-unbundling-attesters-includers-and-execution-proposers/21648) in recent "rainbow" designs. [Rainbow staking](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683) can in general be understood as the moniker and framework for [unbundling](https://ethresear.ch/t/exploring-sophisticated-execution-proposers-for-ethereum/21386#p-52051-unbundling-design-philosophy-1) the various roles that the staking set should assume. 

## 1.2 Overview

In this post, the limits of a maximally unbundled staking set are explored, examining potential roles and the incentives required to coordinate them. The beacon proposer becomes a separate role that attesters can opt out of through *attester--beacon proposer separation* (ABPS), presented in Section 2. A fee is taken out for assuming the role using a dynamic pricing auction (DPA) that adapts with the supply of prospective beacon proposers. This fee will match the MEV under equilibrium, thus burning it from a macro perspective. Stakers opting out of the role will see their associated reward variability eliminated, whereas remaining stakers will not. 

Section 3 introduces *FOCIL with ranked transactions* (FOCILR) that allows Ethereum to reward includers for their duties while remaining incentive compatible. The mechanism improves censorship resistance by making it costly for the proposer to stuff the block to exclude highly ranked transactions, potentially leveraging collective includer incentives to this end. It is possible to let very small stakers assume the includer role, and the supply of excess includers can be used to regulate a small regular fee taken out.

Section 4 describes *attester--separation* (AS), by which attesters of the finality gadget (FA) and of the dynamically available chain (AA) can be split up, opening up for stakers with varying capital levels and risk appetite. The potential design is reviewed both from a consensus and economics perspective. The DPA presented in Section 5 can be used also for the includer fee and AS. But AS is presumably best incentivized via multiple reward curves according to principles presented in Section 6---either using separate independent curves (Section 6.1) or relative reward curves (Section 6.2). 

Figure 1 shows two of the rainbow constellations that can be created with the mechanisms presented. In the left pane is ABPS + FOCILR, with the proposer and includer fee calculated using a DPA. In the right pane is ABPS + FOCILR + AS, which further splits attesters into FAs and AAs. In this example, the proposer fee is again set by a DPA, but fees and rewards for other roles are instead set using multiple reward curves. A minimum (subject to further analysis) staking balance is indicated for each role, as well as rough targets for the relative amount of stake.

![Figure 1|690x455](images/jxsVR3gT5w3o11l3hpfunqQE2ku.jpeg)


**Figure 1.** Two potential rainbow constellations involving beacon proposers, attesters, and includers, with hypothetical minimum admissible balances for the different roles. Rainbow incentives are used to set the relative amount of stake for the roles at desirable levels.


# 2. ABPS

## 2.1 The role of the beacon proposer

The beacon proposer proposes the [beacon block](https://eth2book.info/capella/part3/containers/blocks/) containing attestations and related updates to the beacon state as well as the [execution payload](https://eth2book.info/capella/part3/containers/execution/#executionpayload) (the "execution block"). It has an integral role in growing the chain and is selected from the attester set proportional to stake, to uphold decentralization and protect against Sybil attacks. Therefore, the beacon proposer "belongs" to the attester set, and its duties are sometimes referred to as attester duties. Constructing the execution block to extract maximum value is a rather specialized endeavor, so the beacon proposer often enlists block builders through [MEV boost](https://github.com/flashbots/mev-boost) to build and eventually propagate the blocks. Formalizing this separation of duties is the topic of [proposer--builder separation](https://ethereum.org/en/roadmap/pbs/) (PBS). 

While the beacon proposer is relieved of sophisticated duties in PBS, it will still acquire most of the MEV from the block through payments from builders. This complicates issuance policy because the expected yield varies over time with the level of MEV, making it difficult to enforce some specific desirable equilibrium quantity of stake. In fact, such an [equilibrium](https://ethresear.ch/t/properties-of-issuance-level-consensus-incentives-and-variability-across-potential-reward-curves/18448#h-3-consensus-incentives-11) may require negative regular rewards, forcing Ethereum to implement a staking fee. The rise in [reward variability](https://ethresear.ch/t/properties-of-issuance-level-consensus-incentives-and-variability-across-potential-reward-curves/18448#h-4-variability-in-rewards-for-solo-stakers-12) from MEV negatively affects stakers who cannot pool their rewards. Therefore, it could be desire to combine PBS with a mechanism for [burning the MEV](https://ethresear.ch/t/mev-burn-a-simple-design/15590), rather than see it befall the beacon proposer.


## 2.2 Attester--beacon proposer separation (ABPS)

Attester--beacon proposer separation (ABPS) enforces a target proportion of beacon proposers relative to attesters, for example 3/4, 7/8, 15/16, or 31/32. A shift away from the target leads to a shift in the beacon proposer fee, encouraging stakers to join or leave the beacon proposer set, such that the target level is restored. Section 5 describes how a dynamic pricing auction (DPA) can be used for setting the beacon proposer fee. The separation of beacon proposers from attesters thus burns the MEV from a macro perspective, as further discussed in Section 2.2.1. The impact on censorship resistance is discussed in Section 2.2.2. Section 2.3 presents how stakers move in and out of the beacon proposer set by broadcasting `RoleChange` messages.

### 2.2.1 MEV burn

Through ABPS, the MEV is essentially burned---at least from a macro perspective---by taking out a regular recurring fee from all stakers that assume the beacon proposer role. The stakers that are the most sensitive to reward variability have the option to opt out of beacon proposals, thus giving them the ability to continue attesting without suffering from variability in rewards. In fact, ABPS pushes down reward variability more than regular [MEV burn](https://ethresear.ch/t/mev-burn-a-simple-design/15590) at two levels:
* *Micro level* -- stakers that opt out as beacon proposers also opt out of receiving proposal consensus rewards, which is the largest source of reward variability after MEV. 
* *Macro level* -- beacon proposers will under equilibrium need to pay for (almost) all MEV they can realize; there is no residual of builder tips after any attester deadline. 

In fact, ABPS will also "burn" the proposer consensus rewards, because beacon proposers will account for these rewards when the equilibrium fee is established (this effect has been [predicted](https://ethresear.ch/t/burning-mev-through-block-proposer-auctions/14029/3) in a similar context before). Note however that the incentive to propose is not altered by burning the consensus reward (see also Section 7.3).

To, e.g., mitigate timing games and make it costly to censor transactions by refusing to propose, the protocol might wish to take out a penalty for missed proposals. With ABPS, a larger penalty becomes more palatable, because stakers can opt out of the beacon proposer role if they find it too risky. The opportunity to opt out can however only be offered to a part of the staking set, so as to not jeopardize Sybil resistance. It is *only* this part of the set that derives the micro-level benefits, whereas macro-level benefits are still derived by all. The expected yield among stakers permanently opting out will likely be slightly lower under equilibrium, because beacon proposers will want compensation for variability and higher risks, etc.

### 2.2.2 Censorship resistance

Beacon proposers are drawn from the staking set to promote Sybil resistance and censorship resistance. Herein lies one potential downside of ABPS: the stakers that decide to opt out of the beacon proposal role might generally belong to a more decentralized part of the full set. Thus it must be expected that the beacon proposer role becomes a little more centralized than the attester role overall. A parallel can here be drawn to the current discourse around requirements imposed on beacon proposers, how it affects censorship resistance, the viability of remedies such as the `max_blobs` flag ([1](https://hackmd.io/ljsmwo6QQ8i3zqToZUPs2A#On-raising-the-blob-count-in-Pectra), [2](https://ethresear.ch/t/max-blobs-flag-economic-perspective/21798)), etc. But ABPS takes things further by allowing stakers to fully opt out, while putting them on an equal footing economically. A separate mechanism for ensuring censorship resistance at the execution layer, such as FOCIL (or potentially FOCILR presented in Section 3), will then become even more important. Stakers opting out of beacon proposals will still be includers in FOCIL, in fact, they can be given an increased probability for selection to the includer role if desirable.

Something that also is worthy of further discussion is whether ABPS upholds sufficient censorship resistance at the consensus layer, focusing here on the role of the beacon proposer in collating the beacon block and steering the fork choice. Such a discussion would also be useful for establishing the proportion of attesters that must be beacon proposers. A related topic is if all beacon proposers should attest. Figure 1 indeed illustrated some beacon proposers as non-attesters, but it is probably reasonable to mandate all beacon proposers to also attest. This allows honesty assumptions applied to the attester set to also translate to the beacon proposer set, as explored more deeply in Section 4 that deals with attester separation. 

### 2.2.3 Minimum validator size

If all beacon proposers must also attest, then the requirement on their minimum size $s_\text{min}$ will be bounded by the $s_\text{min}$ of attesters. Otherwise, the bound on $s_\text{min}$ is determined by the amount the protocol wishes to slash an equivocating beacon proposer, which is ultimately determined by the damage caused by one such equivocation. A potential benefit of ABPS when attester duties are not mandated is thus that it can allow stakers with less ETH to participate in a key role for consensus formation. In Figure 1, beacon proposers have a lower $s_\text{min}$ than attesters to reflect that their size will not significantly affect network load. As indicated in the right pane of Figure 1, attesters can also be further divided (see Section 4), in which case beacon proposers can be mandated to also attest to the available chain.

### 2.2.4 Auction mechanism

Section 5.1 illustrates the beacon proposer DPA. As previously mentioned, the protocol might wish to take out a penalty for failed block proposals, which ABPS makes more palatable. However, the regular DPA in Section 5.1 is zero-bounded, and cannot enforce an equilibrium if the penalty is set so steep (under low MEV), such that stakers only are willing to take on the role if the fee is changed to a small reward. To rectify this, the $t$-bounded DPA described in Section 5.2 could instead be used. It bounds the fee at some negative value (a small reward). However, when a DPA is applied, a penalty $x$ for failed beacon proposals is roughly equivalent to a reward $x$ for a successful proposal---proposers will compensate for the rise in expected rewards by paying a higher fee under equilibrium, and the incentive to propose is roughly the same. If successful proposal rewards are instituted instead of failed proposal penalties, the zero-bounded DPA of Section 5.1 will be sufficient.

## 2.3 Entry and exit to the beacon proposer set

Validators move in and out of the beacon proposer set by gossiping a `RoleChange` message over the peer-to-peer (p2p) network. These are propagated by other participants if the validator $v$ has an eligible size $s_v>s_{\text{min}}$ for the role and meets other conditions, e.g., holding any other roles mandated alongside the new one. There is a small fee for updating one's role $r_\text{fee}$. This fee is taken out, e.g., log-proportional to stake (see the Appendix) and burned. Validators also have the ability to provide a tip $r_\text{tip}$ with the `RoleChange` message to encourage the current beacon proposer to include it in the beacon block. Each beacon block has some maximum space for `RoleChange` messages, which need not be substantial.

Stakers on Ethereum are subjected to a delay when entering and exiting their stake. One source of delay is the [`MIN_VALIDATOR_WITHDRAWABILITY_DELAY`](https://eth2book.info/capella/part3/config/configuration/#min_validator_withdrawability_delay) that ensures that any proof of slashing can be surfaced before a validator has exited. It would seem preferable to not apply such a delay when moving in and out of the beacon proposer set and instead look for any proof of slashing during `MIN_VALIDATOR_WITHDRAWABILITY_DELAY` also for validators not currently in the beacon proposer set. 

Another source of delay is the churn limit. However, this limit is primarily in place to curb fluctuations in the attester set and arguably need not be applied when moving in and out of the beacon proposer set. As a result, it can be ignored here. For attesters it must be applied, making `RoleChange` messages more tricky to implement for attester separation discussed in Section 4. To move in and out of the attester set, validators could then instead be required to do a regular entry or exit and stipulate their desired role upon entry. It might be possible to allow attesters to the available chain to also shift roles using `RoleChange` messages, if the attester set is split up as discussed in Section 4, but it could increase complexity.

Beacon proposers are currently selected during the update to the RANDAO, 32-64 slots before the actual proposal. Therefore, validators entering the beacon proposer set cannot be immediately selected for proposal, and the protocol will also need to wait before taking out the fee until the slot at which the new entrant is eligible for selection. Likewise, the fee must be taken out for exiting proposers up until and including the last slot that they had been eligible to be selected for, at the time of exit. All exiting proposers should be queued for exit and not exited until that slot. However, the fee update of the DPA should immediately account for new `RoleChange` messages included in a block, as well as any relative shift to the target associated with validators entering or exiting the overall staking set. It seems reasonable to have logic in place stipulating that an exited validator cannot enter directly again with eligibility for the next epoch. This would ensure that validators do not strategize to first exit upon missed selection, and then enter in time for the next selection, bringing down the fee in the meantime from dynamic price shifts. They would however still incur a cost $2r_\text{fee}$ for this strategy.

Could censorship of `RoleChange` messages be expected? If so, members of the current FOCIL committee could be assigned the additional task of gossipping `RoleChange` lists (RLs), handled similarly to ILs. The goal would be to force beacon proposers to include `RoleChange` messages that have been widely observed. It is however not clear that such an RL committee would be required, given that the DPA presented in Section 5.1 can be designed to give low time sensitivity of inclusion and that validators can be given a small reward for each included `RoleChange` messages. If RLs can be avoided, the fork choice will be subjected to fewer conditional requirements and less logic, which is preferable.

# 3. FOCILR

## 3.1 Overview and starting assumptions

Fork-choice enforced inclusion lists ([FOCIL](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870/)) allows *includers* to force transactions into blocks, thus boosting Ethereum's censorship resistance. The $n$ (e.g., 16) randomly selected includers post inclusion lists (ILs) of txs, which are observed by attesters at an IL deadline around 3 seconds before proposal. Attesters confirm that the proposer adheres to a locally de-duplicated IL aggregate of these lists (the $\text{IL}_\text{agg}$) by attesting to the block. The *proposer* (a term used in this section to refer to the entity responsible for the execution payload, currently the beacon proposer) can however fill the block to render the ILs irrelevant, thus gaining the ability to then censor txs. This is something that FOCILR addresses.

Various strategies for incentivizing includers have been suggested in the past ([1](https://ethresear.ch/t/towards-attester-includer-separation/21306#p-51884-inclusion-fees-9), [2](https://ethresear.ch/t/the-more-the-less-censored-introducing-committee-enforced-inclusion-sets-comis-on-ethereum/18835#appendix-1-reward-distribution-model-8), [3](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870#user-bidding-textpayment-and-textreward-rules-9), [4](https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422)). Rewarding includers is however rather tricky due to how it may shift incentives and/or degrade UX; in the case of FOCIL when the block is full. Therefore, the [FOCIL EIP-7805](https://eips.ethereum.org/EIPS/eip-7805) opts to not incentivize includers. If being an includer requires any additional compute, the choice to ignore assignments can marginally reduce a validator's cost. More importantly, the proposer wishes to be as unconstrained by the inclusion lists as possible to extract as much value as it can. This is an incentive for [commitment attacks](https://ethresear.ch/t/fun-and-games-with-inclusion-lists/16557#commitment-attacks-on-forward-inclusion-lists-3) where the proposer commits to [share marginal MEV](https://ethresear.ch/t/towards-attester-includer-separation/21306#p-51884-costs-of-censorship-7) with includers if they do not post an IL that constrains the block. Even if the number of includers is rather high so that the attack will not stop all ILs, there can still be marginal value in stopping some of them, particularly if the ILs are restricted in permissable size and includers have some variation in which txs they list. 

Furthermore, the includer role could be assumed by users with small balances who wish to stake to improve Ethereum's censorship resistance. Includers are not constrained by networking considerations like attesters, and a minimum balance of for example 0.125 ETH ($2^{-3}$) should be feasible. But since only the includer role could be offered to these participants, the reality is that very few will participate without incentives. If there are no incentives, a reasonable approach is to make the role mandatory for all attesters and beacon proposers, ensuring as big a pool of includers as possible.

Given the focus on rainbow incentives in this post, it seems relevant to come up with a tenable incentive mechanism for FOCIL. Such a mechanism should ideally have the following properties:

1. Further strengthen censorship resistance by making it difficult for proposers to control the content of the block when it is full.
2. Retain a good UX for transactors.
3. Not further incentivize transactors to keep txs out of the mempool.
4. Never make it profitable to create fake transactions.

## 3.2 FOCIL with ranked transactions (FOCILR) 

### 3.2.1 Problem definition

In FOCIL, the $\text{IL}_\text{agg}$ cannot be used for dictating which txs must be included in a full block, because there is no mechanism for ranking txs. The proposer can therefore [stuff](https://ethresear.ch/t/fun-and-games-with-inclusion-lists/16557#block-stuffing-in-forward-ils-2) the block to censor txs. Given that includers can be rendered irrelevant by the proposer, it also becomes [problematic](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870#user-bidding-textpayment-and-textreward-rules-9) to reward them for their services. An improved IL mechanism should impose a ranking of txs in the $\text{IL}_\text{agg}$, define its purview within the block, and add an incentive compatible reward function.

It should be clear why the lack of a ranking function makes it impossible for FOCIL to exclude any specific tx in the $\text{IL}_\text{agg}$ when the $\text{IL}_\text{agg}$ contains more txs than what can fit within the block. The reason for why this condition extends to full blocks regardless of txs in the $\text{IL}_\text{agg}$ is that the $\text{IL}_\text{agg}$ is formed locally by each attester at the IL deadline, when some ILs may not have reached them, while still having reached the proposer. If attesters were to require proof that a tx was listed in an IL, proposers could always make sure that their preferred txs are listed. The majority of the beacon proposers belong to staking service providers (SSPs) that will have access to at least one includer if there are 16 includers per slot. Proposers without direct access could instead pay includers for that service.

If priority fees are awarded to includers, FOCIL becomes incentive incompatible, because proposers will then have an [incentive](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870#user-bidding-textpayment-and-textreward-rules-9) to circumvent the includers by stuffing the block, and transactors forced to settle with the proposer out-of-band. The natural [countermeasure](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870#user-bidding-textpayment-and-textreward-rules-9) to out-of-band settlement---to redirect priority fees to proposers when the block is full---cements block stuffing as a viable proposer strategy. In conclusion, the problem is that attesters have no agreed-upon incentive-compatible way to determine which txs that should be included in the block when not all prospective txs of the $\text{IL}_\text{agg}$ (including those that can be added by proposer-run includers) fit inside of it.

### 3.2.2 Ranking functions

To address the underlying issue, FOCIL with ranked transactions (FOCILR) will now be described. It forces the proposer to include "appropriate" txs from the $\text{IL}_\text{agg}$ by calculating a canonical ranking of each listed tx. Define appropriate criteria for inclusion as the number of ILs specifying a tx ($l$) and the priority fee ($f_p$). The txs can then be ranked in three ways:

1. *From $l(\text{tx})$, with $f_p(\text{tx})$ as a tiebreaker*: The $\text{IL}_\text{agg}$ is then sorted in descending order based on the number of ILs listing a tx. Txs with an identical number of listings are further sorted according to priority fee in descending order. 
2. *From $f_p(\text{tx})$, with $l(\text{tx})$ as a tiebreaker*. The $\text{IL}_\text{agg}$ is then sorted in descending order based on priority fee. Txs with an identical priority fee are further sorted according to the number of ILs listing a tx in descending order. 
3. *From a combined measure such as $f_p(\text{tx})\times l(\text{tx})^q$, with $f_p(\text{tx})$ as a tiebreaker*. The $\text{IL}_\text{agg}$ is then sorted in descending order based on the combined measure. The variable $q$ in this example regulates the balance between $f_p$ and $l$. When $q$ approaches 0, the combined measure approaches a pure ranking by $f_p$, and when $q$ approaches 1, it instead approaches a pure ranking by $l$. Txs with an identical combined measure can further be sorted according to priority fee in descending order.


If two txs cannot be separated from the given criteria, *the tx hash can act as a second tiebreaker*, with unconstrained ordering under a hash collision. The ranking functions are further analyzed in Section 3.4. Ranking by $l$ raises the most concern, whereas option (2) and (3) seem more favorable. Note that the ranking is not enforced for tx ordering in the actual block, it strictly regulates inclusion in the block.

### 3.2.3 Gas threshold

The ranking creates a way for all parties to agree on appropriate txs to include when the block is full. The proposer is then no longer allowed to ignore the $\text{IL}_\text{agg}$, and must include txs from the sorted list at least up until (but potentially excluding) the tx that pushes the cumulative gas above some gas threshold $g_t$. This threshold is set as a proportion $g_p$ of the gas limit $g_l$: 

$$
g_t = g_p\times g_l.
$$ 

If $g_p$ is set too low, there can still be an incentive to stuff the block to take control over the remaining $(1-g_p)\times g_l$ of gas. For this reason, setting $g_p=1$ might seem like a reasonable option. However, such a threshold might also be needlessly restraining, and may slow down settlement of more time sensitive high-priority txs (with priority indicated by $f_g$) arriving after the IL deadline when the block is full. Setting $g_p<1$ reduces the pressure on proposers to integrate with includers in order to create more favorable lists. Furthermore, if $g_p=1$ and all includers collaborate (or some high proportion when ranking by $l(\text{tx})$), they can instead "censor" the proposer during full blocks. An appropriate setting might be $g_p=3/4$.

The $g_t$ is applied to the ranked $\text{IL}_\text{agg}$ regardless of whether the block is full or not, allowing the proposer to drop lower-ranked txs in near-full blocks. This is more neutral and prevents all reasons for block stuffing. If $g_p<1$, block stuffing might otherwise still be favorable whenever the preliminary $\text{IL}_\text{agg}$ consumes more than $g_p\times g_l$ of gas while remaining txs in the mempool do not fill the block. This would give proposers (and by extension builders) with access to exclusive order flows an (additional) advantage: they can fill the block without paying to create dummy txs, to squeeze in, e.g., more txs arriving to the mempool after the IL deadline. Thus, in conclusion, any ability to skirt the $\text{IL}_\text{agg}$ should not depend on if the block is full. Instead, the block must contain at least $g_t$ gas of txs from the $\text{IL}_\text{agg}$, if such txs are available, but there is no requirement for more txs than that.

### 3.2.4 Additional proposer and attester duties

The proposer stipulates which includers that listed each tx using a bitlist---a requirement for a correct reward calculation. Attesters confirm that there are no omissions in the bitlist by attesting to the block and are instructed to accept the proposer's stipulation regarding any IL they did not observe---as long as that IL originates from an includer that they did not observe any other ILs from. Should they have observed only a conflicting IL from this includer at the time of attesting, but not the IL that the proposer based its bitlist on, they should not confirm the block. The proposer makes sure to propagate the ILs it bases its decisions on, to minimize the risk that it is tricked by an equivocating includer. Attesters are per the original FOCIL specification instructed to ignore such ILs, but the proposer is not held accountable if it incorporates an otherwise valid IL from an equivocating includer. 

For each unobserved IL, attesters ensure that its total stipulated tx listings do not exceed the allotted bytesize of an IL. If the reward function is by $p_f$ and $u<1$ (Section 3.3.2), the proposer also specifies active includers, which attesters confirm with their block attestation as long as there is no explicit conflict with their observations.

## 3.3 Reward functions

The ranking functions described in Section 3.2.2 is complemented by a reward function for incentivizing includers. Two types of reward functions are considered: rewards from issuance with magnitude guided by the tx base fee, or rewards from the tx priority fee. 

### 3.3.1 Issuance guided by the base fee

The reward can be set as a fraction $k$ of the basefee $b$ paid for the tx: $r=kb$. This equation lets includers earn a fraction of the fair market price of the transaction. A primary reason to set rewards according to the market price is to ensure that there are no incentives to create dummy transactions just for rewarding includers, while at the same time not introducing any new inclusion fee or disrupting the flow of the priority fee, which will go to the proposer with this reward function. If there is a fixed reward for includers per tx and the base reward drops low enough, includers could coordinate such dummy transactions just to fill up the block and increase the includers' rewards. Thus, the variable $k$ is bounded, and must adhere to $k<1/n$ when there are $n$ includers. A typical value for $k$ could be 1/512 when there are 16 includers, rewarding includers with a maximum of 1/32 of the total base fee. 

This type of reward should not be interpreted as affecting the burn or Ethereum's inflation rate. Any increase in issuance from FOCIL rewards could be offset by a decrease in issuance for other roles, or by taking out a fee for the FOCIL role. The base fee is simply used to derive an accurate value for censorship-resistance services provided by includers. The fraction $k$ should further be sufficiently low to not encourage gainful manipulation of the EIP-1559 mechanism.

It can be noted that includers are not rewarded for uniqueness in their listed txs. If uniquely included txs provide the includer with higher rewards, then transactors might partner with specific includers and send txs privately, so that they can share in the profit of unique inclusion. This degrades trustlessness in the protocol. Furthermore, the proposer can always assign more unique listings to includers it controls or includers who are paying for that service, leveraging its "last look". Includers might then hand over responsibility to the proposer to maximize rewards, degrading trustlessness and censorship resistance of the FOCIL mechanism (yet the last look might also be valuable for non-unique rewards, to ensure that the IL has good coverage). Rewards weighted by uniqueness could also potentially disincentivize includers from [propagating txs](https://ethresear.ch/t/the-more-the-less-censored-introducing-committee-enforced-inclusion-sets-comis-on-ethereum/18835/2). To not reward uniqueness seems particularly relevant when rewards come from issuance. The priority fee on the other hand originates from the transactors themselves. 

### 3.3.2 Priority fee

The priority fee is currently used to motivate the proposer to include a tx in the block---but when includers list a tx, the proposer is forced to include it anyway. As stipulated in [Option 2](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870#user-bidding-textpayment-and-textreward-rules-9) of the FOCIL post, the priority fee could therefore be given to the includers whenever the tx is in the $\text{IL}_\text{agg}$, and to the proposer otherwise. However, if the proposer receives nothing from txs in the $\text{IL}_\text{agg}$ and the block is full, it can seek to insert its preferred transactions in the $\text{IL}_\text{agg}$ at the last second via an includer it pays or controls. High priority fees can be kicked back to the transactor from the proposer, allowing inserted txs to be the highest ranked when ranking by $p_f$ or by a combined measure, at no additional cost. When rewards derive from the priority fee, some additional compensation for unique listings might be acceptable---after all, the fee must be distributed to someone. But given concerns of a trustful advantage, it is still reasonable to only do so moderately, and to at the same time develop a mechanism for collectively rewarding active includers whenever the $\text{IL}_\text{agg}$ has broad coverage. 

To account for the presented issues and promote incentive compatibility, a slightly more refined division of the priority fee is here presented. It concerns only the situation when the tx is in the $\text{IL}_\text{agg}$---otherwise the priority fee is still given to the proposer. First, set aside 

$$
\omega_pf_p
$$ 

to the proposer, leaving 

$$
f_p^+ = (1-\omega_p)f_p
$$ 

to be further distributed. Here, $\omega_pf_p$ gives the proposer an incentive to abide by the $\text{IL}_\text{agg}$ generated by includers it does not control. Give each includer that listed the tx 

$$
f_p^+\frac{u(n-1)}{(un-1)l + n(1-u)},
$$

where $n$ is the total number of includers and $l$ is the number of includers listing the tx. The variable $u$ regulates the extent to which the protocol favors unique listings, while also defining the proportion of $f_p^+$ given to a single includer listing a tx (the outcome at $l=1$). This variable should be in the range $u \in \left[\frac{1}{n}, 1\right]$. When $u=1$, unique listing are maximally rewarded. The expression simplifies to 

$$
f_p^+\frac{u(n-1)}{l(un-1) + n(1-u)}
=f_p^+\frac{(n-1)}{l(n-1) + n(0)}
=\frac{f_p^+}{l}.
$$

If $l=1$, the includer gets the whole $f_p^+$, if $l=2$, the two includers each get $f_p^+/2$, etc. When $u=1/n$, the protocol does not premier uniqueness at all. The expression simplifies to 

$$
f_p^+\frac{u(n-1)}{l(un-1) + n(1-u)}
=f_p^+\frac{(n-1)/n}{l(0) + n-1}
=\frac{f_p^+}{n}.
$$

Each includer will always get $f_p^+/n$, and if not all includers list a tx, the remaining $f_p^*$ will be further divided as described in the next paragraph. Setting $u$ somewhere in between the extreme points seems reasonable. For example, when $u=1/3$, a single includer gets around 33% of $f_p^+$, if there are two includers they get 26% each, three get around 21% each, etc, with the remaining $f_p^*$ still left to be distributed. Note that the expression has been defined such that if $l=n$, the reward for each includer always becomes $1/n$, regardless of the setting for $u$ (this is by design and as intended).

Define an includer as "active" if at least one of its listed txs was included in the block. If less than, e.g., half of the includers were able to insert a tx in the block, an includer will also be counted as active if it simply posted a valid IL. This condition will be observed by attesters as a natural part of their FOCIL duties, and noted in the block by the proposer for attesters to confirm. The reason for the backup condition of valid ILs is that the proposer otherwise could turn all includers inactive by replacing every tx that goes into the block from the $\text{IL}_\text{agg}$ using the kickback strategy. This however requires substantial private orderflow or many txs coming in after the IL deadline. 

Of the remaining rewards, 

$$
\omega_if_p^*
$$ 

is given in equal share to all active includers, and 

$$
(1-\omega_i)f_p^*
$$ 

given to the proposer. Here, $\omega_if_p^*$ can be regarded as the collective incentive, which distributes value to active includers if many txs with a high $p_f$ end up in the $\text{IL}_\text{agg}$ and block. If the proposer tries to insert its preferred transactions by providing kickbacks to the transactors, these txs will leak value to active includers. A lower $u$ facilitates such leakage. Likewise, an includer trustfully relying on the proposer to maximize its uniqueness rewards will see the collective rewards fall when the $\text{IL}_\text{agg}$ misses txs it could have surfaced independently. On the other hand, a higher $u$ makes it more costly for a proposer that wishes to censor a tx to convince an includer to not list it. It will also give includers an individual profit motive for broadening the coverage of the $\text{IL}_\text{agg}$.  Section 3.5 specifies possible settings for the outlined variables.

### 3.3.3 No reward function

It is possible to not incorporate rewards to includers, adopting a version of FOCILR that strictly enforces a ranking during full blocks. This can still strengthen censorship resistance by restricting the freedom of the proposer to decide which txs that goes into a full block. However, there is no monetary incentive for includers to list txs, and the proposer will not leak value if it enlists aligned includers and kickbacks priority fees to alter the ranking. The kickback strategy is rather esoteric and might not materialise in practice. It can however potentially be addressed by burning some proportion of the priority fee in full blocks, ensuring that artificially inflated priority fees come at some cost.

## 3.4 Analysis of ranking and reward functions

To understand the benefits or drawbacks of the different options, includers' potential valuation function of txs will now be examined.

### 3.4.1 Considerations when ranking is irrelevant

The FOCIL EIP [stipulates](https://eips.ethereum.org/EIPS/eip-7805#il-committee-members) a maximum size of 8 kB of raw txs per list, with txs ordered by priority fee and included up to this limit. Consider now the optimal inclusion criteria from the includer's perspective in FOCILR when there are more than 8 kB of txs available to select from. 

Stipulate the expected reward from getting a tx included as $r$ and its size as $s$ bytes. The includer will then in its scoring function attach a value $v$ to a tx according to its reward per byte, ordering and selecting txs by

$$
v = \frac{r}{s}.
$$

Calculating the expected reward of a tx can be rather complicated. Consider first the simple scenario where unique contributions to the $\text{IL}_\text{agg}$ are not premiered and the ranking function is irrelevant because the total gas consumed by the block will stay below the threshold $g_t$. If the includer accrues some proportion $\dot{f}$ of the priority fee or base fee (both proposed in Section 3.3), the expected reward of a tx will depend on the gas $g$ consumed by the tx: $r=g\dot{f}$. The equation for the valuation of a tx is therefore

$$
v = \frac{g\dot{f}}{s}.
$$

Thus, even if the includer accrues some proportion of the priority fee, it will not simply select txs based on priority fee, because there is an opportunity cost of selecting txs that take up relatively more space in the list. The includer is focused on "rewards per byte" and will select txs based on this measure if inclusion is certain and the IL will be filled. If the IL will not be filled, all txs will simply be selected.

The situation is somewhat complicated when unique contributions to the $\text{IL}_\text{agg}$ are premiered. In this case, the expected rewards from a tx is adjusted by accounting for expected uniqueness (reviewing already observed ILs and accounting for patterns in tx inclusion observed during previous slots). The adjusted expected value when accounting for bonuses relating to uniqueness (if any) will be denoted $v'$. Three points can here be mentioned regarding rewards for uniqueness: 
1. They individually incentivize includers to facilitate a broad coverage in the $\text{IL}_\text{agg}$. When the reward function is by priority fee but without uniqueness rewards, there is only a collective incentive for this. In regular FOCIL without incentives, broad coverage would need to be faciliated by a [local inclusion rule](https://meet-focil.vercel.app/il-flooding-in-focil/) that relies on randomness.
2. They provide additional reasons for includers to wait close to the IL deadline, both for observing others' ILs and shielding one's own IL.
3. The proposer will have the ability to review all available ILs and finetune ILs under its control to optimize uniqueness rewards. It might even offer this as a service to includers it does not directly control, which might in the end lead to reduced censorship resistance (as discussed in Section 3.3.1).

### 3.4.2 Considerations when ranking by $f_p$

When txs of the $\text{IL}_\text{agg}$ consume more than $g_t$ gas, the ranking function will determine which txs that are included in the block and thus influence expected rewards. The includer will still prioritize txs with a higher $v'$ when it is certain that the tx will be included in the block. However, if there is uncertainty about a tx, the includer will seek to establish a probability of the tx being included when calculating the expected reward. This will then depend on the ranking function. When ranking by $f_p$, a tx with a higher $f_p$ but lower $v$ could thus still be prioritized.

### 3.4.3 Considerations when ranking by $l$

Consider now ranking by $l$. Just as previously, $v'$ dominates for txs that are certain to be included (yet uniqueness and a high $l$ are of course rather contradictory). For other txs, probability of inclusion depends on what other includers settle on, with equilibria emerging gradually. If the reward function allocates the priority fee and uniqueness is not premiered, includers will likely gravitate towards ranking by $v$, which maximizes total rewards, acting as a dominant strategy. It is also possible that the simpler option of ranking by priority fee wins out. Furthermore, a tx that has been in the mempool longer is more likely to be selected, ceteris paribus, and txs coming in close to the deadline will be rather unlikely to be selected. 

If the reward function allocates the base fee, the time of arrival of a tx will be relatively more important, but includers might still account for the priority fee. There are two reasons for this: (1) if $g_p<1$, then there will still be some txs allocated by the proposer, who will tend to prioritize txs with high priority fees (or txs that indcue MEV, which includers by extension should also select for); (2) the proposer might commit to reward includers that prioritize txs with higher priority fees (since it will accrue these in this scenario). Importantly---regardless of reward function---if the maximum size of the IL allows for txs that consume more gas than $g_t$, a single includer dropping some otherwise high-ranking tx might be sufficient for it to be excluded from the block. Such a combination of conditions (ranking by $l$, low $g_t$ relative to IL size) would therefore be unsuitable. 

At the same time, smaller ILs are restrictive to the includer. Ideally, includers would be allocated so many bytes in their list that they can fill them with raw txs up to the gas limit. This would simplify the decision-making process and improve censorship resistance. But as noted, it requires that ranking is not strictly by $l$. Large SSPs could, with ranking by $l$, benefit over smaller stakers. They can make sure that all their lists are identical, and will therefore have better guarantees of at least some inclusions for all of their selections. If uniqueness is premiered, it will be less influential, given that expectation of getting included rises with $l$. The last look of the proposer can also be more influential, particularly if it has control over several includers. There will be many knobs the proposer can turn to maximize value extraction while letting preferred txs win.

## 3.5 Baseline specification


Among the discussed options, what could be a reasonable baseline specification? Ranking strictly by $l$ raised the most concerns in the analysis. There is the potential to extract slightly higher rewards for bigger SSPs, including additional value that can be extracted from the last look of the proposer. There is also the potential for weak censorship during times of congestion when includers drop otherwise appropriate txs, thus pushing down their $l$. Ranking by $f_p$ or a combined measure therefore seems more promising. Given that ranking by $f_p$ is simpler, it is can be suitable as a baseline. 

Both reward functions presented in Section 3.3 seem reasonable. Going by the base fee will however be a bigger change both in terms of required protocol changes and UX. For one, it will essentially eliminate the need for a priority fee for txs posted to the mempool. Under equilibrium, this might however make transactors willing to pay an ever so slightly higher base fee for inclusion. Going by the base fee might also require developers to keep $k$ low to prevent manipulation of the EIP-1559 mechanism.

Thus a suitable baseline is to base both ranking and rewards on the priority fee. Proposed settings for the reward distribution are $\omega_p=1/8$, $\omega_i=1$, and $u=1/3$. This gives 1/8 of the priority fee to the proposer, boosts unique inclusions moderately, while retaining a strong collective incentive for active includers. Setting $u$ closer to $1/n$ alleviates concerns of a trustful advantage when favoring unique contributions to the $\text{IL}_\text{agg}$. Setting $u$ closer to 1 will on the other hand make it more costly for a proposer that wishes to censor a tx to convince an includer to not list it. A reasonable setting for regulating the gas threshold $g_t$ could be to set $g_p = 3/4$. It is also desirable to allow ILs to have a large bytesize under the baseline specification.

As shown in Figure 1, the proportion of excess includers relative to attesters could be regulated by taking out a fee for assuming the incentivized includer role. This allows stakers with small balances to also assume the role, while at the same time letting their decision to do so help price the role. Mechanisms that can be used for regulating the size of the includer set are presented in Section 5 and 6.2. Given that rewards for includers will not be particularly large, it might however be reasonable to simply let the includer set expand without attaching a fee to the role.

# 4. Attester separation 

*Special thanks to  [Roberto](https://x.com/robsaltini), [Barnabé](https://x.com/barnabemonnot) and [Francesco](https://x.com/fradamt) for feedback on this section.*

## 4.1 Split attestation roles

Attesters currently attest to the available chain by casting LMD GHOST head votes, and finalize the chain by casting FFG source and target votes. They are the backbone of Ethereum consensus and will remain so in the future. This section will analyze the implications of splitting the attester roles both on consensus formation and in terms of how the different roles could be incentivized. Some stakers will thus be finality attesters (FAs) who attest to the finality gadget by casting FFG votes, while others will be availability attesters (AAs), who attest to the dynamically available chain by casting LMD GHOST votes.

Splitting the roles allows for the removal of the slashing condition from AAs. This does not preclude any countermeasure to AA equivocation, such as forced exit, but limits the overall monetary loss that AAs can be subjected to. Stakers can then take on or delegate AA services without risking slashing. Setting aside potential consensus degradation, this seems like a clear benefit for the protocol. For example, staking service providers can offer services best suited to the risk appetite of individual users, and individual stakers can likewise opt for a risk level they are comfortable with and have the resources for. Another potential benefit is that Ethereum might actually benefit from more AA stake as a form of Sybil resistance, whereas FA stake can utilize slashing to punish misbehavior. The division into FAs and AAs is an active area of research, with the idea broached by [Barnabé Monnot](https://x.com/barnabemonnot) and to be further analyzed in a forthcoming post by him.

## 4.2 Consensus considerations under split attestation roles

By splitting the roles, some consensus assumptions are upended. Consider an SSF implementation without subsampling that still contains an available chain voted on by AAs and a finality gadget voted on by FAs (most parts of the discussion will apply at present as well). It has been [established](https://ethresear.ch/t/reorg-resilience-and-security-in-post-ssf-lmd-ghost/14164) that with a honest majority of online AAs in LMD GHOST with [view-merge](https://ethresear.ch/t/view-merge-as-a-replacement-for-proposer-boost/13739), the chain attains reorg resilience. But how would this reorg resilience be affected  under network synchrony if honesty assumptions for the AA set do not extend to the FA set? 

Currently, all validators are both AAs and FAs. It is therefore generally taken for granted that if >1/2 of the AAs are honest participants and follow the fork choice, then >1/2 of the FAs will be honest and follow the *same* fork choice for establishing viable checkpoints. Assume instead that AAs and FAs can be very different, such that the proportion of honestly participating AAs says much less about the proportion of honestly participating FAs. In such a scenario, the FAs could finalize a checkpoint on a branch that is not currently the head of the chain, even if all AAs consider that branch inferior, forcing the AA set to switch branches---assuming that they must always build on top of the latest justified block. A honest majority of online AAs will then *not* ensure reorg resilience, when treated in isolation. 

It is desirable to have to make as few honesty assumptions as possible.  How much additional stake weight could be added to the AA set, if FAs should not be able to directly finalize a checkpoint conflicting with the fork choice of an honest majority of AAs? All FAs are in this scenario imposed to also perform AA duties. It turns out that the AA set can then at most expand by 1/3 of additional stake. To see this, assume that all newly added AAs honestly follow the fork choice and the stake grows to 4/3 of its original size (the FA set has size 3/3). Among the 4/3, say that 2/3 are honest and 2/3 are dishonest such that the balance is even. In this case, 1/3 of the original joint set must be honest. An honest majority of AAs will thus imply at least 1/3 of honest FAs, which is enough to prevent finalization. Here, an "honest" FA refers to an FA that tries to finalize on a branch leading to the current head of the chain, in the honest AA set's view. 


A further complication is how the inactivity leak factors into the fork-choice. When the chain fails to finalize, honest FAs can have a conflicting checkpoint to the dishonest FAs, if the block root of their checkpoints differ. The dishonest FAs will then fail to finalize the conflicting checkpoint until the honest FAs have leaked out, ultimately allowing the dishonest FAs to finalize. At that point, honestly participating AAs are required by LMD GHOST to shift back to the branch with the newly justified checkpoint. These AAs are also the FAs trying to finalize the other branch, and the FAs must then also shift back, leading all parties to agree with the choice of the dishonest FAs. An *honest majority of FAs* is thus important in the long run, to stop FAs from overriding the AAs with the help of the inactivity leak. This requirement has not been important to focus on previously when all attesters are both FAs and AAs, seeing that it then is implied by the assumption of an honest majority of AAs. It is here singled out as an honesty assumption worthy of further focus.

A [separate option](https://ethresear.ch/t/sticking-to-8192-signatures-per-slot-post-ssf-how-and-why/17989#approach-2-two-tiered-staking-4) is to instead require both AAs and FAs to come to the same conclusion---that is to say requiring support by both 2/3 of FAs and 1/2 of AAs to finalize a checkpoint. There is however some uncertainty as to how this could best be achieved, since finalization is an async protocol and the available chain relies on synchrony. What could be explored is to require FAs to include---upon finalization of a checkpoint---a certificate of support by AAs. Such a certificate could perhaps consist of votes (not necessarily present in the associated blocks of the branch) signed by a sufficient percent of AAs at a sufficient depth.


## 4.3 Incentive design under split attestation roles

Setting aside remaining uncertainty about the viability of splitting the attester set from a consensus perspective, this subsection explores *how* it could be done from an incentives perspective, assuming the benefits outweigh the downsides. Indeed, outlining a specification could be an integral part of assessing whether the benefits are worth the trade-offs. In the current protocol, FA and AA duties represent different types of attestation votes. Attesters vote on the source and target of the finality gadget (the FA duties), and are for these services credited with $40/64=5/8$ of all protocol rewards. Attesters further vote on the head of the available chain and receive $14/64$ of the rewards for this duty. The sync-committee attestations---also a non-slashable duty---will in this post be grouped together with head votes, and they receive $2/64$ of the rewards. Thus, the AA duties provide $16/64=2/8$ of all rewards. But how should rewards be parceled out when each role is separate? A few different variants can be considered, here divided into three different classes: 

1. Use a reward curve that varies either with the quantity of FAs or both FAs and AAs. Keep the current balance in rewards (or set some new one), and:
    &nbsp;&nbsp;a. do not further affect the proportion of attesters in different roles; or
    &nbsp;&nbsp;b. change the reward balance in a hardfork if the ratio between roles is not satisfactory.
2. Use a reward curve that varies either with the quantity of FAs or both FAs and AAs, just as in (1), but then:
    &nbsp;&nbsp;a. enforce a specific proportion of AAs to FAs with a DPA; or
    &nbsp;&nbsp;b. use a relative reward curve that smoothly balances yield against the role-proportion.
3. Control the quantity of FAs and AAs independently, either with
   &nbsp;&nbsp;a. two separate DPAs; or
   &nbsp;&nbsp;b. two separate reward curves.

Option (1) cannot guarantee some specific relationship in the proportion of attesters assuming the two roles, other than by sacrificing long-term reliability in (1b). Furthermore, the shape of the reward curve is the same for both roles, with variation restricted to scale. Option (2) can achieve any desired proportion of FAs to AAs, but option (2a) is rather rigid. This can lead to a differentiation in yield between the roles that is undesirable. For example, the yield for AAs could be needlessly pushed down to zero or become too high if the supply of excess AAs is inelastic. Option (2b) is instead better at capturing the diminishing marginal utility of adding additional AAs beyond some limit, and can very well be designed such that it caps additional AAs to for example 1/3 in excess of FAs. Section 6.2 illustrates relative reward curves, using option (2b) as the primary example.

Option (3) allows for more granular control where each role is incentivized independently from the other. Once again, Option (3a) is rigid and can fail to produce a close-to-optimal equilibrium. Option (3b) can be suitable under circumstances where the relative proportion of two roles is less important and it is presented in Section 6.1. The protocol will with this setup not have control over, for example, how many FAs there are relative to AAs, which can break honest majority assumptions. But in the setup described at the end of Section 4.2, the protocol instead requires both 2/3 of FAs and 1/2 of AAs to finalize a checkpoint. Two separate reward curves are then perfectly fine, and arguably even desirable.

# 5. Dynamic pricing auction (DPA)

## 5.1 Regular DPA (zero-bounded)

The dynamic pricing auction (DPA) adjusts the yield for a role dynamically based on the supply of stakers for this role. The difference $\Delta$ between a target level and current level of stakers is used. The DPA target can be relative ETH level (e.g., beacon proposer stake relative to attester stake) relative proportions (e.g., proportion of beacon proposers relative to attesters), a fixed ETH level (e.g., targeting 30M ETH of stake weight for a role), or some proportion of the circulating ETH (e.g., targeting 25% of all ETH as stake weight for a role). A two-dimensional DPA has [previously been proposed](https://ethresear.ch/t/mev-resistant-dynamic-pricing-auction-of-execution-proposal-rights/20024) for facilitating a MEV resistant execution auction, differing in that the fee then was paid per proposal right, as opposed to being paid only for participation in the proposal lottery.

A DPA for the beacon proposer role will now be presented, which can be easiest understood as a proposer fee. The fee adjusts based on the difference between the desired proportion $\hat{p}$ of beacon proposers relative to attesters  and the current level $p$ (thus, targeting a relative proportion as previously defined).  If there is a surplus of proposers $p>\hat{p}$, the fee rises until some validators relinquish their proposer role. If there is a shortage of proposers $p<\hat{p}$, the fee falls until some additional validators take up the proposer role. The DPA adjusts based on the difference between the current and desired proportion: $\Delta p=p-\hat{p}$ (as an alternative $p/\hat{p}-1$ can also be used). The fee for the next slot $f_{0+1}$ will then change relative to the fee of the current slot $f_0$ by the linear function

$$
f_{0+1}= f_0(1+c\,\Delta p).
$$

This is similar to [EIP-1559](https://github.com/ethereum/EIPs/blob/ff5fc95c8f1adc8b5f8865536630e70e2817c99b/EIPS/eip-1559.md), with the constant $c$ regulating the rate of change. The baseline used for this example is to set $c=1$, which thus gives the baseline equation $f_{0+1} = f_0(1+\Delta p).$ This gives a moderately slow shift in yield, set to prevent censorship of `RoleChange` messages and avoid oscillations, while at the same time not changing so slowly that a large proportion of stakers feel compelled to leave or enter under drastic changes in MEV. That would be welfare degrading because it requires a large proportion of stakers to also adopt MEV strategies, make estimates of future MEV, etc. The fee $f_n$ after $n$ slots at some fixed $\Delta p$ can be defined as 

$$
f_{n}= f_0(1+c\,\Delta p)^n,
$$

and the relative change to the fee, specified for $f_0=1$, is

$$
f_{c}= (1+c\,\Delta p)^n.
$$

Figure 2 uses this equation to draw a map of the total change to the fee within various isotimes, with $\Delta p$ on the x-axis and $f_c$ on the y-axis. A second x-axis enumerates the corresponding change in ETH if 30M ETH of stake is currently attesting (corresponding to *relative ETH level* as defined in the first paragraph of this section). The isotime lines are drawn in 1-slot increments (green dashed), 1-minute increments (black dashed), 5-minute increments (solid black), and for 1 hour (solid brown). As apparent, when $c=1$ and $\Delta p$ corresponds to 2M ETH, the fee would be halved within two minutes. The change over one slot would however be rather minimal even at large $\Delta p$.

![Figure 2|690x452](images/wBxsQYYsQCsVjCdg8tw3Luxjzt0.png)

**Figure 2.** Change to the fee at $c=1$ within various isotimes under a fixed $\Delta p$ (x-axis) with $f_c$ on the y-axis. The blue axis labels indicate the change in ETH at 30M ETH attesting.

Figure 3 zooms in on a more narrow $\Delta p$, otherwise retaining the same properties of the plot. As apparent, the fee takes quite some time to adjust if only a few validators have shifted into or out of the beacon proposer role. For a more responsive fee adjustment, $c$ would need to be raised.

![Figure 3|690x453](images/f4t9R9SXfoEDUor2BlFlMG4Lh7.jpeg)

**Figure 3.** Zoomed-in view of the change to the fee at $c=1$ within various isotimes under a fixed $\Delta p$ (x-axis) with $f_c$ on the y-axis. The blue axis labels indicate the change in ETH at 30M ETH attesting.


The fee adjustment can be captured with time on the y-axis instead. To draw contour lines, the equation must first be reworked such that $n$ can be computed directly:


$$
\frac{f_n}{f_0}=\bigl(1 + c\,\Delta p\bigr)^n,
$$

$$
\ln\Bigl(\frac{f_n}{f_0}\Bigr)=n \,\ln\bigl(1 + c\,\Delta p\bigr),
$$

$$
n=\frac{\ln\bigl(\frac{f_n}{f_0}\bigr)}
{\ln\bigl(1 + c\,\Delta p\bigr)}.
$$

Figure 4 shows the resulting isochange map with a zoomed-in version in Figure 5. The constant was again set to $c=1$.

![Figure 4|690x452](images/xPxOH5pa8e9HjVgHELc91Etd4ef.png)

**Figure 4.** Proportional change $f_c$ to the fee under a fixed $\Delta p$ (x-axis) with time on the y-axis. The blue axis labels indicate the change in ETH at 30M ETH attesting.

![Figure 5|690x452](images/djT0eZim9tywYUKkSfjIP062OeV.png)

**Figure 5.** Proportional change $f_c$ to the fee under a fixed $\Delta p$ (x-axis) with time on the y-axis. The blue axis labels indicate the change in ETH at 30M ETH attesting.

One relevant concern with a DPA is the prospect of [cartelization attacks](https://ethresear.ch/t/reward-curve-with-tempered-issuance-eip-research-post/19171#h-54-cartelization-attacks-33), whereby stakers collectively try to keep the beacon proposer fee artificially low by restricting entry while such entry is profitable.

## 5.2 The $t$-bounded DPA

The $t$-bounded DPA is more appropriate than the zero-bounded DPA when there is a bound on the expected price that diverges from zero, specifically, when there is a bound situated at some threshold $t$. This section will explore the $t$-bounded DPA in the context of ABPS.

There is a specific form of censorship, wherein the proposer simply does not propose in lieu of proposing a block with txs imposed by FOCIL (that it wishes to keep out of consensus). Given that ABPS allows for somewhat more sophisticated beacon block proposers, a penalty could be charged for proposers that fail to get their blocks accepted, potentially because they were never proposed or proposed very late. However, if the MEV gradually falls, and the penalty is sufficiently high, then there is a risk that the equilibrium fee would need to be negative (a reward) to achieve a desirable level of beacon proposers. Otherwise, there will be insufficient stakers willing to take on the beacon proposer role. The previously proposed DPA does not allow for negative rewards and can be defined as "zero-bounded" (note that the mechanism will ensure that the slot update is bounded to $1+c\Delta p>0$, for separate reasons). 

Of course, it would be possible to simplify the initial equation to $f_{0+1}= f_0 +c\,\Delta p$, such that the price is affected equally regardless of its relative level (see Section 5.3). However, it is better in this specific example to have the price adjust on a relative basis but provide a lower bound at some (negative) threshold $t$ (calculated from the size of the missed proposal penalty and worst-case probability of missing proposals). The $t$-bounded DPA gives a nominally larger reaction during periods when the MEV is 1 ETH than when it is 0.01 ETH per block, which is desirable to avoid oscillations while still letting the fee change more rapidly at high magnitudes. Furthermore, it is desirable from a security perspective to bound the value that stakers can extract from the mechanism. The $t$-bounded DPA can be defined as

$$
f_{0+1} = t+(f_0 - t)(1 + c\Delta p),
$$

and thus

$$
f_{n} = t+(f_0 - t)(1 + c\Delta p)^n.
$$

Figure 6 shows the effect of a $t$-bounded DPA with $t$ set below 0, in comparison with a zero-bounded DPA, after $n$ slots with a fixed $\Delta p = -0.005$. The aggregate fee is shown on the y-axis, and $t$ was set such that the aggregate fee (per slot, across validators) is bounded at -0.03. Just as with a zero-bounded DPA, there needs to be a limit $t_l$ just above the threshold to ensure that the fee does not saturate close to 0.

![Figure 6|690x334](images/rP5nre49NvF4FcGw6r24Q5ytmTV.png)

**Figure 6.** The effect of a $t$-bounded DPA with $t$ set below 0, in comparison with a 0-bounded DPA, after $n$ slots with a fixed $\Delta p = -0.005$.

## 5.3 Two-sided DPA 

The two-sided open-ended DPA is defined as

$$
f_{0+1}= f_0 +c\,\Delta p.
$$ 

The fee $f_n$ after $n$ slots at some fixed $\Delta p$ then becomes 

$$
f_{n}= f_0 +n\,c\,\Delta p.
$$ 

The price is thus affected equally regardless of its relative level.

# 6. Multiple reward curves

The reward curve can generally be considered as a more sophisticated auction model, allowing the protocol to encode utility derived from stake participation in a more fine-grained manner. The idea is to specify the curve such that utility is maximized under any stake supply curve, assuming reasonable slopes of these supply curves. The reward curve can thus be [understood](https://ethresear.ch/t/practical-endgame-on-issuance-policy/20747#p-50642-h-31-the-role-of-the-reward-curve-8) as the expansion path that enforces preferred equilibrium points along any possible supply curve. Reward curves can always employ a [time component](https://ethresear.ch/t/faq-ethereum-issuance-reduction/19675#h-5-time-quantity-policy-35), as in the DPA, wherein the curve simply encodes the long-run demand curve. The DPA is in this case reduced to a [vertical reward curve](https://ethresear.ch/t/faq-ethereum-issuance-reduction/19675#why-not-dynamically-adjust-the-yield-with-a-mechanism-like-eip-1559-to-guarantee-some-fixed-target-participation-level-16), encoding the long-run utility function with potentially less sophistication.

This section deals with how multiple reward curves---pricing different roles---can be combined. If the proportional relationship between these roles is less relevant, *separate* independent reward curves can be suitable, as presented in Section 6.1. If the proportion of stakers assuming different roles instead matters to the protocol, *relative* reward curves can instead be applied, as presented in Section 6.2. 

## 6.1 Separate reward curves

Section 4.3 presented strategy (3b), using separate reward curves for setting the yield for the different roles. This can be suitable if the relative size of the different roles is of less importance. An example with separate reward curves for the FAs and AAs is shown in Figure 7. The purple reward curve is the one proposed in a [previous post](https://ethresear.ch/t/practical-endgame-on-issuance-policy/20747). It is decomposed into AA rewards (cyan) and FA rewards (red), using the current balance in rewards when forming the reward curve. Thus, the cyan curve corresponds to $2/8$ of the purple reward curve, representing sync-committee attestations and head votes, and the red curve corresponds to $5/8$ of it, representing source and target votes. 

A third reward curve is here indicated for the remaining $1/8$ in rewards for block proposals (grey). It is not envisioned as a reward curve in the same sense as the cyan and red one, but illustrate how the level of the *[micro rewards](https://eth2book.info/capella/part2/incentives/rewards/)* can be set for including attestations in the beacon block, for example based on the combined equilibria of the two curves. The *yield* (fee) for beacon proposers would still be set with a DPA. This captures the distinction between the incentive to assume a role and the incentive to perform the duties of a role, as discussed in Section 7.2.

![Figure 7|690x431](images/gRhd3Xc7YPDHJPJqLFl8AEP7KzH.png)

**Figure 7.** Separate reward curves for finality attesters (FAs; red) and availability attesters (AAs; cyan), with aggregate issuance indicated in purple.

The issuance yield under this setup is shown in Figures 8-9. In Figure 8, the supply curve is decomposed exactly as the reward curve. Stakers want precisely 2/5 of the FA rewards to also provide AA services. This example produces equilibria at the same deposit size, that readily translate to an aggregate equilibrium. However, if the roles are split up, the supply curves might look a bit different. In Figure 9, the supply curve for AAs is lower, due to the absence of slashing. This could happen if users are willing to build a money-lego on top of liquid staking tokens engaged as AAs. This illustrates how separate reward curves can be unsuitable when the protocol wishes to keep the proportion of stake underpinning different roles balanced, but suitable otherwise.

![Figure 8|690x481](images/sOo5VmZpVoI3lmEkXC4IRmdHpLa.png)

**Figure 8.** Separate issuance yield curves for FAs (red) and AAs (cyan), with aggregate issuance yield indicated in purple. In this example, the supply curves precisely match the decomposition of the reward curves, thus producing identical equilibria as for the joint curve.

![Figure 9|690x481](images/2Gj0iDv7D9kRi4A5u7VlY0Ub6GG.png)

**Figure 9.** Separate issuance yield curves for FAs (red) and AAs (cyan), with aggregate issuance yield indicated in purple. In this example, the supply curves do not match the decomposition of the reward curves, thus producing different equilibrium quantities of stake. The proposer curve is omitted, given that it would drift with the variation in equilibria.

While two different supply curves can be interesting to plot, the reality is that most stakers will probably wish to perform both services, just as today. The supply curves are therefore certainly not independent. The equilibrium for one role will affect the supply for the other. If rewards for FAs are shifted lower, imposing an equilibrium at a lower FA quantity, there will be fewer excess stakers willing to supply AA services. Should the AA rewards rise, more stakers will presumably be willing to also be FAs, and those rewards could thus fall while upholding some equilibrium. 

## 6.2 Relative reward curve (RRC)

Figure 9 in Section 6.1 illustrated that the proportion in one role might diverge from the proportion in another, when using separate reward curves. A way to instead keep the proportions within specific bounds---while at the same time not fixing them rigidly---is to use a relative reward curve (RRC). Start once again from the example of FAs and AAs. This time, assume that Ethereum's main reward curve is related only to the quantity of stake of FAs; this becomes the "leader curve". Further assume that all FAs are mandated to also be AAs. Two main variants of RRCs can be identified, setting either a proportional yield or an absolute yield for AA services. 

### 6.2.1 Proportional RRC

The RRC shown in Figure 10 offers a yield proportional to the leader curve for the role priced by the "follower curve", in this example stakers assuming AA duties. It is relative in both dimensions. On the x-axis is the proportion of excess AA stake relative to staked FA: 

$$
e_\text{AA} = \frac{D_\text{AA}}{D_\text{FA}}-1.
$$ 

On the y-axis is the yield assigned for excess AAs as a proportion of the yield assigned to validators performing both FA and AA duties

$$
y_p(e_\text{AA}) = \frac{y_i({D_\text{AA}})}{y_i(D_\text{FA},\,D_\text{AA})}.
$$ 

This means that the actual yield for stakers assuming only AA duties is set to

$$
y_i({D_\text{AA}}) = y_p(e_\text{AA})\, \times\,y_i(D_\text{FA},\,D_\text{AA}).
$$ 

The RRC is in this example generated from the equation

$$
y_p(e_\text{AA}) = y_0 - \frac{A\times e_\text{AA}}{l-e_\text{AA}},
$$

where $l$ sets the point where issuance yield goes to negative infinity, $y_0$ sets the initial relative yield, and $A$ determines the steepness of the curve. The RRC in Figure 10 uses $l=1/3$ reflecting the discussion in Section 4.2, $y_0=0.75$, and $A=0.5$. The zero‐point for the issuance yield can be derived by setting

$$
0 = y_0 - \frac{A\times e_\text{AA}}{l-e_\text{AA}},
$$

which gives

$$
e_\text{AA} = \frac{ly_0}{A+y_0}.
$$

The zero-point with the proposed values thus becomes $e_\text{AA}=0.25/1.25=0.2$. 

![Figure 10|690x374](images/camLSNExd5JKC5BT6uLrT3oizqd.png)

**Figure 10.** A proportional RRC that sets the yield of a follower curve for stakers performing only AA duties proportional to the yield of stakers performing both attester duties. The proportional RRC assumes that the leader curve can never go negative.

### 6.2.2 Absolute RRC

It can be noted that the equation for the follower-RRC must be attuned to the range of the leader curve. The proportional RRC in Figure 10 assumes that the leader curve will not approach a yield of 0, and not go negative. If the leader curve can go negative, an absolute RRC would instead have to be adopted. In this case, the simplest solution is to instead set the equation for the yield of stakers only assuming AA duties to

$$
y_i(D_\text{AA}) = y_i(D_\text{FA},D_\text{AA}) - \frac{A \times e_\text{AA}}{l-e_\text{AA}}.
$$

This produces an RRC similar to that of Figure 10, instead starting at 0 and then falling. This alleviates issues if the leader curve approaches 0 or changes sign. 

# 7. Conclusions and Discussion

The limits of a maximally unbundled staking set have been examined, focusing both on potential roles and the mechanisms that can be used for incentivizing them. This section will briefly review important features of these roles and mechanisms.

## 7.1 Improved censorship resistance

Both ABPS and FOCILR can help improve Ethereum's censorship resistance. With FOCILR, the proposer must adhere to the txs' ranking and is no longer able to unilaterally censor a tx when the block happens to be full. Block stuffing alone will as a consequence also be insufficient for unfilled blocks, because the proposer must replace the censored tx with a sufficient number of txs outranking it (with the help of one or several aligned includers). Depending on ranking function applied, this may be impossible or rather costly. In the baseline specification, the proposer must fund---or through private orderflow finance---the basefee for these txs. The priority fee paid to outrank the censored tx will further leak to all other active includers through collective incentives, ensuring that the proposer cannot recoup these fees. 

With ABPS, the ability to opt out of the beacon proposer role makes missed proposal fees (or successful proposal rewards) more appealing to implement, given that the impact on solo stakers is reduced. As a consequence, censorship of a tx by foregoing proposals can also be made costlier (in terms of a penalty or in terms of an opportunity cost of missed proposals coupled with a higher regular fee). Potential reduced censorship resistance at the consensus layer is however still important to consider.

## 7.2 Relationship between consensus mechanisms and incentives

The post illustrates how incentives can become part of consensus formation. With FOCILR, the priority fee can determine which txs that stay in under heavy load, and its redistribution to includers can be used for limiting the maneuvering space of the proposer. Another theme in the post is how requirements of the consensus mechanism (for example accountability or Sybil resistance) should be reflected in the incentives mechanism. If the consensus mechanism is fine with any relationship in the size of two roles, then separate reward curves can be used to set their yield. Otherwise, relative reward curves are more appropriate. 

If there is no need to slash missteps for a specific duty, it is generally beneficial to remove the slashing condition (as in AS). The protocol can then distribute less ETH to stakers taking on the non-slashed duty, given the reduced risk, to the benefit of all token holders. There is generally a benefit of reviewing the exact requirements that some specific role has. By making all consensus requirements explicit, it will be easier to realize them while getting the most "bang-for-buck" from the mechanism. Furthermore, the ability to opt out of a role (ABPS or AS) or opt into a role (being only an includer when holding a small balance) is what also allows Ethereum to price that role. 

## 7.3 Unbundling overall yield and consensus incentives

A recurring theme when designing incentives for beacon proposers, includers, and attesters is that *micro incentives* and *overall yield* can and arguably should be unbundled. Rewards (or penalties) tied to specific duties determine the incentive that someone in a specific role has to fulfill its *duty*, whereas the expected yield determines the incentive of assuming the *role*. 

An example is if an abundance of stakers are willing to be only AAs given the lack of slashing, and the protocol consequently must reduce the yield for this role so that the proportion of AAs relative to FAs does not grow excessively high. In this case, consensus rewards (corresponding to rewards for head votes) would also approach zero, and the incentive to properly perform duties would become very small. While the opportunity cost of being AAs might very well be close to zero---such that a low yield is required---the damage that can be done by willfully neglecting to fulfill duties can still be substantial. This is the same type of [issue](https://ethresear.ch/t/properties-of-issuance-level-consensus-incentives-and-variability-across-potential-reward-curves/18448#h-3-consensus-incentives-11) that comes up when trying to enforce a staking equilibrium in the presence of MEV.

Proper micro incentives are also important to starve off [minority discouragement attacks](https://ethresear.ch/t/properties-of-issuance-level-consensus-incentives-and-variability-across-potential-reward-curves/18448/11). A change in MEV (and thus the fee) should not affect the size of micro rewards accrued from beacon proposals, relative to the size of micro rewards for attesters. This ensure that the proposer and attester cannot harm each other by dropping attestation or proposals without also suffering a loss themselves. Furthermore, micro rewards for AA duties for stakers assuming both attester duties should be the same as micro rewards for AA duties for stakers only assuming AA duties. This is a general invariant that should be used for all rainbow implementations---that micro rewards are set identical for all parties assuming a role. A regular fee or reward---distributed regardless of duty performance---is instead used as a macro incentive. 

In essence, the right approach is to use a small regular fee or reward (the yield for the role) to attract participants or keep them out, while still keeping consensus micro incentives according to a separate schedule. 


----

# Appendix -- Properties and effect of $r_\text{fee}$

When prospective beacon proposers' estimate of the expected return fluctuates relative to each other, they will move in and out of the proposer set while $\Delta p$ can remain approximately at the 0 equilibrium. Consider instead the scenario when estimates move in tandem, such that a validator's position along the proposer supply curve remains fixed. This scenario lends itself to rudimentary analysis. Define the expected MEV of a slot for the marginal validator $v$ as $V_e$ and the expected value when accounting for its probability to be selected to propose the block as 

$$
V_e(v)= \frac{V_es_v}{pD},
$$

where $p$ is the proportion of beacon proposers and $D$ the overall deposited stake. 

Say that there is a temporary spike in MEV that will last $n$ slots, each with a fee of $f$ (kept fixed for simplicity) and with expected rewards $V_e(v)$. The marginal validator then has an expected value of 

$$
\Delta f = V_e(v)-f
$$ 

from being in the proposer set. When deciding to enter the proposer set, the marginal validator currently outside the set then faces the following calculus:

* A cost of $2r_\text{fee}$ for moving into and out of the proposer set.
* An expected value of $n\Delta f$ across the $n$ slots.
* The validators should then enter the proposer set if $r_\text{fee}<n\Delta f/2$.

This setup ignores that the marginal validator may already be subjected to frictions of a size just below $r_\text{fee}$ before the spike in MEV such that the calculus instead becomes closer to $r_\text{fee}<n\Delta f.$ The setup is further not considering how the actions of other stakers might affect the fee or expected value, but it can still be illustrative for a rudimentary analysis. Say that $n=100$, $s_v=1000$ ETH, $p=2/3$, and $D=30\text{M}$ ETH. If $V_e$ temporarily increased from 0.1 ETH to 0.3 ETH during the spike, the fee remains fixed, and $\Delta f$ was 0 before and after the spike, then the break-even $r_\text{fee}$ is derived by inserting the difference of $V_e=0.2$ into the full equation

$$
r_\text{fee} = \frac{n\Delta f}{2} = \frac{n}{2}\cdot\frac{V_es_v}{pD}= \frac{100}{2}\cdot\frac{0.2\times 1000}{(2/3)\times 30,000,000}=0.0005.
$$ 

If the initial condition is $r_\text{fee}<n\Delta f$, then the calculus instead becomes $r_\text{fee}<0.001$. The purpose of this analysis has been to illustrate how $r_\text{fee}$ introduces frictions in terms of switching costs. The aggregate switching fee taken out by the protocol will be accounted for by validators, who will be willing to pay a lower $f$ or equally require a higher issuance to maintain the same deposit size. Nothing is gained by the protocol from a high $r_\text{fee}$ in this regard. If it is desirable to see prospective beacon proposers react to the outlined spike in MEV over 100 slots, then $r_\text{fee}$ should be kept below the outlined break-even level.

Should the size of a validator affect its $r_\text{fee}$? The network load of a `RoleChange` message is the same regardless of the size of a validator, thus justifying keeping $r_\text{fee}$ the same. But smaller validators will then have to pay disproportionally higher fees, while all receive approximately the same value from switching role, raising fairness concerns. What will likely happen then is that bigger validators will be inclined to switch more often than smaller validators, and the value instead derived as better mobility. From the protocol's perspective, this equilibrium is beneficial if fairness concerns are ignored, given that it reduces the network load required to keep $\Delta p$ in equilibrium. What can be done is to reduce the advantage of bigger validators, while allowing them to retain some edge, such that stakers are encouraged to consolidate and switch with bigger validators, while still not being advantaged too much. For example, the fee could be log-scaled to validator size. It should further be noted that any benefits derived by big validators here can be offset by a lower individual consolidation incentive ([1](https://ethresear.ch/t/orbit-ssf-solo-staking-friendly-validator-set-management-for-ssf/19928#individual-consolidation-incentives-12), [2](https://ethresear.ch/t/consolidation-incentives-in-orbit-vorbit-ssf/21593#p-52518-h-3-force-distribution-f_2-for-individual-incentives-11)) if such incentives are required for effective consensus formation, raising welfare overall. 

Another question is if $r_\text{fee}$ should scale with $f$. The idea would be that validators generally make the decision to switch by reviewing $V_e(v)$, which will be equal to $f$ under equilibrium. If the long-run MEV falls (such that $f$ falls), then $r_\text{fee}$ should fall correspondingly to retain the same switching frictions (assuming variability in $V_e(v)$ also falls accordingly). An initial implementation can however ignore this complication, to keep things simple and review the outcome of a given $r_\text{fee}$. A tentative setting is then

$$
r_\text{fee}(v) = 10^{-6}\times\log_2(s_v).
$$

All tips $\tilde{r}_\text{tip}$ that are provided to the beacon proposers for including `RoleChange` messages are "internal MEV". The required $r_\text{tip}$ will normally likely not vary with validator size, given that the effort to include a `RoleChange` message is not greater when it originates from a bigger validator. However, when the reason for tipping is to avoid censorship, then tips will have to be proportional to size, given that the purpose of censoring is to keep some amount of stake outside or inside the proposer set.