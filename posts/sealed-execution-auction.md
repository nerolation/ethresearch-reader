# Sealed execution auction

![Sealed execution auction|690x394](images/8QVkeltn8Rz45YyyzX6NHgYyPAO.jpeg)

By [Anders](https://x.com/weboftrees). 

*While working on the [dynamic pricing auction](https://ethresear.ch/t/mev-resistant-dynamic-pricing-auction-of-execution-proposal-rights/20024) I though of another way to hold the auction that also seems interesting. Posting a rough sketch here, although I am not yet certain of its viability. Thanks to [Justin](https://x.com/drakefjustin), [Barnabé](https://x.com/barnabemonnot) and [Terence](https://x.com/terencechain).*

## Introduction

In the process of enshrining proposer–builder separation ([ePBS](https://github.com/ethereum/EIPs/pull/8711)), it has been [suggested](https://mirror.xyz/barnabe.eth/LJUb_TpANS0VWi3TOwGx_fgomBvqPaQ39anVj3mnCOg) that attesting and execution proposing should be more fully separated. Proposals such as [execution tickets](https://ethresear.ch/t/execution-tickets/17944) (ETs) and [execution auctions](https://mirror.xyz/barnabe.eth/QJ6W0mmyOwjec-2zuH6lZb0iEI2aYFB9gE-LHWIMzjQ) (EAs) strive to allocate the right to propose execution blocks to entities other than the validators. This also facilitates [MEV burn](https://ethresear.ch/t/mev-burn-a-simple-design/15590). There have been concerns ([1](https://ethresear.ch/t/mev-burn-a-simple-design/15590/4), [2](https://ethresear.ch/t/mev-burn-a-simple-design/15590/23), [3](https://ethresear.ch/t/dr-changestuff-or-how-i-learned-to-stop-worrying-and-love-mev-burn/17384/3)) around insufficient early bidding in the MEV pricing auctions with a base fee floor used in EA. By [considering the staking metagame](https://ethresear.ch/t/burn-incentives-in-mev-pricing-auctions/19856), this issue is potentially resolved, but the resulting attester--builder integration can then by itself be [problematic](https://ethresear.ch/t/burn-incentives-in-mev-pricing-auctions/19856#risks-associated-with-attester-builder-integration-14). There is also a general concern that the decided-upon auction design will [induce MEV](https://mirror.xyz/barnabe.eth/QJ6W0mmyOwjec-2zuH6lZb0iEI2aYFB9gE-LHWIMzjQ), and no definite specification among [several alternatives](https://ethresear.ch/t/on-block-space-distribution-mechanisms/19764#preliminaries-12) for the auction design in ET. For this reason, it seems fruitful to explore an auction that facilitates true separation and does not induce MEV. One such mechanism recently proposed is the [MEV resistant dynamic pricing auction](https://ethresear.ch/t/mev-resistant-dynamic-pricing-auction-of-execution-proposal-rights/20024). In the context of Vickrey auctions of execution rights, [Timeboost](https://forum.arbitrum.foundation/t/constitutional-aip-proposal-to-adopt-timeboost-a-new-transaction-ordering-policy/25167) under consideration by Arbitrum can also be mentioned.

This post proposes a [Vickrey](https://en.wikipedia.org/wiki/Vickrey_auction) slot auction in two rounds to select a forthcoming execution proposer (akin to EA), referred to as a sealed execution auction (SEA). Staked builders make sealed bids for the right to propose an execution block. Bids are observed by attesters and then collated by the beacon proposer. In subsequent steps, builders reveal their bids, attesters observe the revealed bids, and the proposer once again collates them. The right to propose a forthcoming execution block is awarded to the highest bidder, paying according to the second-highest bid, with the payment burned.


## Auction

### Staked builders
Builders are staked at a level sufficient for the protocol to penalize them if they fail to reveal committed bids. The stake can also serve as a deposit account to pay for winning bids, or this account can be managed separately. 

### Sealed bids
Figure 1 gives an overview of the auction. In the first round, each builder has the opportunity to make one sealed bid over a public P2P layer. There might be a small fee for making a bid, as a further anti-Sybil measure. Attesters observe the sealed bids that have come in at time $T_1$. Around two seconds later, at $T_2$, the beacon proposer collates sealed bids (including any bids it finds after $T_1$), and broadcasts them in a structure. This structure may be a beacon block if the auction proceeds over two slots (see [Timeline](https://ethresear.ch/t/sealed-execution-auction/20060#timeline-15)). At $T_3$, attesters observe the structure and make sure that all previously observed bids at $T_1$ have been included. If the bids were included in a beacon block, they will attest to the block contingent on correct and timely collation. If not included in a beacon block and the proposer equivocates on the structure, the subsequent block must be rejected.

![Figure 1|690x347](images/xnuLVAFfql94liRdPoOXEXF395h.png)


**Figure 1.** Sealed execution auction. Staked builders submit sealed bids before $T_1$ and the proposer collates them at $T_2$. At $T_3$ attesters ensure that all bids they observed at $T_1$ are part of the collated structure. Builders unseal the bids after $T_3$ and attesters observe them at $T_4$. The proposer then collates bids in a beacon block at $T_5$ and attesters attests to the block at $T_6$ contingent on correct collation. The highest unsealed bid wins, paying a fee corresponding to the second highest bid. The fee is burned. Builders that did not unseal their bids are penalized.

### Revealed bids
In the second round, after the $T_3$ deadline, builders unseal their bids. They should not release before $T_3$, because then the proposer can collude with other builders to release a bid structure with some bids placed after other bids were revealed. However, they do not need to observe the proposer's structure before release, and can proceed right after the $T_3$ mark.

Attesters observe unsealed bids at $T_4$. The proposer collates all unsealed bids it can find, including them in the beacon block at around $T_5$. It may also include bids that were never unsealed, so that the associated builder can be penalized (this is a strict requirement in the single-slot design, because then the sealed bids have not been included in a previous beacon block). The highest bid is selected as the forthcoming execution proposer, and the second highest bid value is deducted from the winner's balance and burned. At $T_6$, attesters attest to the beacon block, contingent on a correct collation by the beacon proposer.

## Rationale

Collusion between builders and proposers to reduce the burn as in the MEV burn design is arguably resolved; without stakers actively burning each others' MEV revenue. 

* There is no longer a stable equilibrium to rely on for colluding parties, such as late bidding.
* The proposer no longer has leverage to punish early bidders by electing another builder.
* Chiseling at a cartel is trivial, simply by truthful bidding.
* Every bid fulfills a real purpose, as opposed to early bids in MEV pricing auctions.
* There is no avenue for discouragement attacks, since there is no substantial proposer revenue to remove.


## Penalization

Several actions must be penalized. If the proposer omits an observed sealed bid in the first round or an observed revealed bid in the second round, the proposer's block must be rejected by attesters. If the proposer fails to release the structure of the sealed bids in the first round or the revealed bids in the second round in a timely manner (reaching attesters before $T_3$ and $T_6$ respectively), the proposer's block must also be rejected by attesters. *Edit 18-07-24:* As mentioned in the previous section and also further discussed in the next, a builder that does not unseal its bid on time will be penalized. This is facilitated in Figure 1 by including the sealed bid in the beacon block.

It is possible that a builder made a mistake and will be unable to pay for its bid, if the bid is higher than its staked amount. This will be penalized by burning some proportion of the stake, for example corresponding to the amount of the actual winning bid, some fixed amount of ETH, or its entire stake. In any case, if its unbacked bid is the highest, the builder will not win the auction. The second highest bid will instead be selected as the execution proposer, paying the third highest bid, etc. If the bid underpinning the fee (normally the second highest bid) lacks funds, the bid below it will be set to underpin the fee.

## Builder--proposer collusion and possible remedies

A potential cause for concern is the following scenario: a builder determines that it would not like to unseal its bid (potentially after observing other builders' unsealed bids). It does not want to subject itself to a penalty, so it colludes with the proposer to have it miss the slot. Is this a cause for concern? This ultimately depends on if the builder benefits more by *not* revealing its bid than the proposer loses from a missed proposal. This could be the case when bidding for the right to propose the current or next slot, and the expected MEV falls drastically between bid commit and reveal (i.e., a [value-in-flight](https://mirror.xyz/barnabe.eth/QJ6W0mmyOwjec-2zuH6lZb0iEI2aYFB9gE-LHWIMzjQ) problem). Another potential cause for concern is if the value instead increases drastically. The proposer might then pose an ultimatum to the winning builder: "send me some part of expected profits, or I will fail to propose". A failed proposal would leave the builder without rights for the slot. An [ultimatum game](https://en.wikipedia.org/wiki/Ultimatum_game) emerges. The other builders might also be inclined to pay the proposer, in order to starve off competition, and the winning builder would then also need to pay the proposer to ensure it proposes.

While the outlined collusion scenarios may be a bit speculative, it can still be interesting to explore possible remedies. A few directions then spring to mind: 

#### 1. Penalize beacon proposers for missed beacon blocks

Proposers already lose out on revenue if they miss their block. However, this loss might not be a sufficient deterrent. It would therefore be beneficial to also penalize proposers if they miss their blocks. Otherwise, if the penalty applied to a builder is substantially higher than the loss from missed proposals for the proposer, that builder penalty will be less meaningful. Builders could seek to collude to let the proposer take the fall. In essence, if the value to the builder, its competitors, or the proposer, of having the builder not win the auction, is higher than the loss to the proposer of not proposing, then collusion or an ultimatum game may emerge.

#### 2. Require subsequent beacon proposers to conclude the auction 

Is it possible to have the next beacon proposer conclude the auction? This depends to some extent on the [Timeline](https://ethresear.ch/t/sealed-execution-auction/20060#timeline-15) of the auction. 

* **Single-slot design:** In the single-slot design, attesters do not signal if they rejected a block because of an incorrect initial structure, a late structure, or an incorrect or missing beacon block. A way to deal with this is that the next proposer presents the correct outcome of the auction, in its own view, and that the attesters of $n+2$ either reject or confirm the new block based on the proposed outcome. But this means that these attesters must also have tracked events in the previous slot as they unfolded, and any split views (e.g., from a rather late sealed builder bid) may persist for several blocks in a row. 
* **Two-slot design:** If the auction commences over two slots, there will be an agreed-upon set of committed sealed bids, or the first beacon block will have been rejected. The second step of the auction can then be concluded in a subsequent slot without requiring attesters to have observed the commit-phase. The requirement is to still have attesters make an observation of unsealed bids sometime before the proposer deadline. But that point need not necessarily be taken from the earlier slot. A benefit is that this might starve off split views.

One thing to note is that if a builder finds it worthwhile to pay the first proposer to not propose, in order to avoid revealing a bid without being penalized, it might be willing to pay also a second proposer for not proposing. However, the price will go up, and the number of potential collusion partners scheduled to propose in a row may not be too large. It should also be noted that when auctioning off rights for slot $n+i$, there is a requirement that the delay until the conclusion of the auction does not surpass $i$. In other words, it will only be possible to repeat a failed auction around $i$ times. Note that this requirement is also due to the fact that the order in which auctioned off execution rights are provided cannot be altered ex post, since the expected MEV for slots may vary.

#### 3. Skip the beacon proposal reveal

Is it possible to skip the beacon proposal reveal? If all bids are unsealed, the outcome will be evident to every participant. The mechanism can then be designed such that the winning builder safely can propose its block at the assigned slot, even if a proposer has not collated the outcome and presented a winner. The previous option 2 is focused on concluding the auction via a beacon proposal in time before the execution proposal, but the point here is that the auction does not need to be concluded by the proposer as long as the outcome is evident to the builder and can be verified by attesters when the builder proposes its block. The sealed bids must then have been included in a beacon block, as in the two-slot design. 

[Threshold decryption](https://en.wikipedia.org/wiki/Threshold_cryptosystem) via a committee of attesters (h/t Barnabé) is one option here. The bids are decrypted by a committee, and the winner made evident to the builders/forthcoming proposer and attesters. There would still be liveness concerns, but collusion would be more difficult. It can be noted that as long as all builders unseal their bids in a timely manner (even without threshold decryption), the winning builder can proceed with the proposal. Always penalizing builders that do not unseal their bids before $T_4$ could then seem sufficient, but the issue is that split views would emerge in potential designs. In any case, the outcome would also at some point need to be included in a block, to process payment and penalties.

#### 4. Auction of a future slot to reduce value-in-flight

The Vickrey auction is truthful, allowing builders to bid their true value at the commit deadline. Since value-in-flight is the most likely cause for collusion, auctioning off a slot further removed from the present will temper the issue.

#### Auctioning off multiple slots

Note that to avoid having a failed beacon proposal result in a missing execution proposal, there is also the option to sell the right to two execution proposals in the subsequent slot (with builders bidding their [inverse demand curve](https://en.wikipedia.org/wiki/Vickrey_auction) and paying according to the second and third highest bids).

## Timeline

This section presents two hypothetical timelines for the auction, either when only including unsealed bids in the beacon block (single-slot auction) or when including both sealed and unsealed bids in separate beacon blocks (two-slot auction).


### Single-slot auction

Example of a slot auction with a tight schedule enacted mostly during a single slot $n$, auctioning off execution proposal rights for a later slot $n+i$.



| $T_x$ | Time | Overview | Description |
| -------- | -------- | -------- |-------- |
| $T_1$ | 4s | **Sealed bid deadline**     | Attesters of slot $n+1$ observe all sealed bids. Builders must have broadcast them some time before this point to ensure eligibility. |
| $T_2$ | 6s | **Proposer collates bids**     | The proposer of slot $n+1$ releases a structure containing all sealed bids it can find. |
| $T_3$ | 8s | **Attesters observe collation**     | Attesters of slot $n+1$ observe the proposer's structure to ensure it contains all bids they had seen at $T_1$ and that the release of this structure is timely. |
| | | | | 
| $T_4$ | 10s | **Revealed bid deadline**     | Attesters of slot $n+1$ observe unsealed bids. Builders must have broadcast them some time before this point (but after $T_3$) to ensure eligibility. |
| $T_5$ | 0s (12s) | **Proposer collates in beacon block**     | The proposer of slot $n+1$ includes every unsealed bid it can find in the  block, also indicating sealed bids that were never unsealed. A winner is declared. |
| $T_6$ | 4s (12+4s) | **Attesters confirm collation**     | Attesters of slot $n+1$ confirm that the proposer fulfilled its role and collated bids in a timely manner by attesting to the block. |

Note that builders can unseal their bids directly after $T_3$. This should allow attesters of slot $n+1$ to observe revealed bids at 10s. However, if needed, the entire schedule could be pushed back slightly.


### Two-slot auction

Here is an example of a schedule for the two-slot auction:

| $T_x$ | Time | Overview | Description |
| -------- | -------- | -------- |-------- |
| $T_1$ | 10s | **Sealed bid deadline**     | Attesters of slot $n+1$ observe all sealed bids. Builders must have broadcast them some time before this point to ensure eligibility. |
| $T_2$ | 0s (12s) | **Proposer collates bids**     | The proposer of slot $n+1$ includes all sealed bids it can find in its beacon block. |
| $T_3$ | 4s (12+4s) | **Attesters confirm collation**     | Attesters of slot $n+1$ confirm that the proposer fulfilled its role and collated bids in a timely manner by attesting to the block. |
| | | | | 
| $T_4$ | 8s (12+8s) | **Revealed bid deadline**     | Attesters of slot $n+2$ observe unsealed bids. Builders must have broadcast them some time before this point (but after $T_3$) to ensure eligibility. |
| $T_5$ | 0s (12+12s) | **Proposer collates in beacon block**     | The proposer of slot $n+2$ includes every unsealed bid it can find in the  block, potentially indicating sealed bids that were never unsealed. A winner is declared. |
| $T_6$ | 4s (12+12+4s) | **Attesters confirm collation**     | Attesters of slot $n+2$ confirm that the proposer collated all unsealed bids by attesting to the block. |