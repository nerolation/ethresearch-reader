*Thanks to @swapnilraj, @linoscope, @barnabe, @Julian, and @jcschlegel for detailed back-and-forth in crafting this article. Thanks also to Michal Zajac, @quintuskilbourn,  and @JustinDrake for their comments on the idea. This work was funded by Flashbots. The views expressed are my own, and do not necessarily reflect those of the reviewers or Flashbots.*

# Introduction

This article introduces the concept of appointed execution proposers (AEPs), a proposer allocation protocol that allows validators in a committee-based consensus mechanism, e.g. proof-of-stake, to appoint specialized proposers to propose blocks on behalf of validators. AEPs joins a long line of protocols decoupling high-barrier requirements, e.g. execution-block building, large amounts of slashable stake, from low-barrier requirements e.g. beacon-block proposing, attesting. The protocols that we follow in this regard include [proposer-builder separation (PBS)](https://ethereum.org/en/roadmap/pbs/), [enshrined PBS](https://ethresear.ch/t/why-enshrine-proposer-builder-separation-a-viable-path-to-epbs/15710), [Execution Tickets](https://ethresear.ch/t/execution-tickets/17944), and [Rainbow Staking](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683).

AEPs can bootstrap onto any in-protocol proposer-market structure, e.g. Execution Tickets, ePBS, allowing validators to become opinionated about the entities responsible for proposing blocks. Through validator requirements, smaller market participants and users can be protected from the monopolization and malicious block-building practices that a free-market allows for, and/or incentivizes. This equates to [antitrust](https://competition-policy.ec.europa.eu/antitrust-and-cartels_en) and quality control. As such, AEPs provides the tools for Ethereum validators to ensure long-term sustainability of the Ethereum block-proposal market, its users, and the ecosystem as a whole.

Importantly, AEPs restricting the proposer market to the appointed set is conditional on the appointed set reaching a minimum size threshold. Below this threshold, AEPs reverts to the default permissionless proposer setting. By reaching this minimum size threshold, validators are deciding in no uncertain manner that they want to use the appointed proposer set. What’s more, even in AEPs’ default setting, the omnipresent threat of reaching the minimum size threshold serves as a deterrent for permissionless proposers from engaging in malicious activity; a nuclear non-proliferation agreement between validators and permissionless proposers (H/T @Julian).

AEPs builds on the status quo of permissionless-only block building on Ethereum. AEPs aligns the block-building process with the needs of the many (validators), channelling the previously unchecked desires of the few (competitive block-builders). By coupling AEPs with an in-protocol proposer market, Ethereum can improve on the benefits, and address the drawbacks of the free-market approach to block proposing. [The parallel here with free-markets is that some oversight of free markets is typically beneficial](https://www.investopedia.com/articles/economics/08/free-market-regulation.asp). Importantly, the regulators in AEPs are the permissionless validators who represent Ethereum, with scope for arbitrarily transparent and dynamic regulation.

AEPs allow validators to express proposer preferences beyond slashable stake requirements and on-chain behaviour. Validators can identify and reward/punish non-attributable good/bad behaviour, such as censoring/non-censoring, or even the timely provision of [preconfirmations](https://ethresear.ch/t/based-preconfirmations/17353)/lack thereof. Given the potentially lucrative nature of block proposing, and the ability for validators to rescind appointments from proposers at any time, appointed proposers have a strong incentive to perform honestly and earn their appointment.

# Terminology

*The protocol description omits specific numbers for key thresholds that are required to implement and deploy AEPs. We highlight these “gaps-to-be-filled” where they arise with a "*gap* :man_detective:". These gaps stand as key to-dos for a technical specification of AEPs.*

Unless otherwise specified, we assume that the underlying blockchain protocol is [Ethereum PoS](https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/). We borrow a lot of [terminology from the Execution Tickets proposal](https://ethresear.ch/t/execution-tickets/17944#definitions-2) because that article's target audience is ours too. Thanks for the cheese.

* **Slot:** A single iteration of the consensus protocol.
* **Validators:** Staked entities as per Ethereum. Validators are responsible for attesting to execution blocks, proposing and attesting to beacon chain blocks, specifying inclusion lists when elected as beacon proposers, and optionally voting to appoint execution proposers.
* **Beacon lottery:** A random process by which the beacon proposers (and possibly attesters) are selected from the validator set.
* **Beacon round:** The portion of the slot where the beacon block is proposed.
* **Beacon block:** The [BeaconBlockBody](https://github.com/ethereum/consensus-specs/blob/bf09b9a7c4a7b311e86823235815daf31b117574/specs/capella/beacon-chain.md#beaconblockbody) of today, sans the ExecutionPayload, but with an inclusion list.
* **Beacon proposer:** The validator selected as the proposer for a given beacon round (same as today).
* **Inclusion lists:** A list of transactions specified by the beacon proposer for inclusion in the execution block.
* **Execution round:** The portion of the slot during which an execution block is proposed.
* **Execution block:** The [ExecutionPayload](https://github.com/ethereum/consensus-specs/blob/bf09b9a7c4a7b311e86823235815daf31b117574/specs/bellatrix/beacon-chain.md#executionpayload) of today. This includes the set of transactions that get included on-chain.
* **Execution proposer:** The entity with the exclusive initial right to build and propose an execution block for consensus. Proposers may subsequently auction off the right to build blocks through a builder market such as [MEV-Boost](https://boost.flashbots.net/) or enshrined PBS.
* **Block-builders:** Entities who are delegated block-building rights by the execution proposer. The blockchain protocol requires the execution proposer to sign off on this delegation.
* **In-protocol appointed proposer requirements:** The core in-protocol requirement is *for proposers to receive appointment from validators controlling a specific minimum % of stake* :man_detective:. In-protocol requirements can also include *minimum slashable stake for proposers* :man_detective:, or more generally, any on-chain attribute that can be verified by a smart contract.
* **Out-of-protocol appointed proposer requirements:** These requirements are enforced out of protocol on appointed proposers, and can be arbitrarily strict or attributable.
* **Proposer Ejection:** At any point in time, validators can collect votes on behalf of the validator set to remove a proposer from the appointed proposer set. These votes can be forced on-chain through the inclusion list, or directly onto the beacon chain operation. If the ejection threshold is met, the specified proposer is ejected from the proposer set.
*  ***Target/Minimum number of appointed proposers* :man_detective::** The target number of appointed proposers dictates how many proposers each validator is expected to appoint. The minimum number of appointed proposers must be reached for the appointed set of proposers to begin proposing blocks. Below this minimum threshold, the default proposer selection mechanism is used.
* **Appointed proposer:** An entity who has met all in-protocol appointed proposer requirements. Given the minimum number of appointed proposers has been met, appointed proposers have the exclusive right to be selected as the execution proposer.
* **AEPs market:** This is the AEPs market-structure protocol for deciding which of the appointed proposers is the execution-block proposer for a given Ethereum slot. Examples include first-price [slot auctions](https://mirror.xyz/0x03c29504CEcCa30B93FF5774183a1358D41fbeB1/CPYI91s98cp9zKFkanKs_qotYzw09kWvouaAa9GXBrQ) and lottery-based [execution tickets](https://ethresear.ch/t/execution-tickets/17944).

## Protocol Sketch
**![|602x211](images/soKkNCQqIW0N2NKFHr4qVcuRiMc.png)**

**![|602x211](images/oSDZc7HPHhcgsZYJ7yJQcRL3Mll.png)**

AEPs introduces an appointed set of proposers who have the exclusive right to propose execution blocks. When the appointed set is below the minimum number of appointed proposers, a default execution proposer selection mechanism is used e.g. a second beacon-style lottery, a permissionless variation of the AEPs market.

Membership in the appointed proposer set requires an appointment vote from validators controlling *some specified minimum amount of stake* :man_detective:. Votes are included on-chain through the inclusion list. *Validators can vote to appoint a specific number of proposers per validator* :man_detective:. On top of the stake-vote requirement, there needs to be an in-protocol sybil resistance mechanism for candidates to be considered for election, such as a *minimum proposer stake* :man_detective:. The blockchain protocol is responsible for choosing its own adequately decentralized validator set. Apart from voting to appoint block proposers, validators are responsible for block validation and censorship resistance (either directly through some form of inclusion lists or indirectly through appointing non-censoring proposers).

Given inclusion in the appointed set, appointed proposers then participate in the AEPs market for the right to propose a block. *Some time before the desired block proposal time for a given slot* :man_detective:, the execution proposer for that slot is selected according to the AEPs market rules. [As in execution tickets](https://ethresear.ch/t/execution-tickets/17944#design-3), inclusion lists can be specified by the beacon chain which must be adhered to by execution proposers for execution block validity.

If [equivocation](https://ethresear.ch/t/payload-timeliness-committee-ptc-an-epbs-design/16054#builder-initiated-splitting-19)/liveness faults are observed in the appointed proposer set, validators can trigger an ejection procedure to eject an appointed proposer. This ejection procedure can be a message or set of messages force included on-chain through the inclusion list. Such a message could take the form of e.g. provable faults, or meeting *an ejection threshold of validator signatures* :man_detective:. If the *minimum number of appointed proposers threshold* :man_detective: is not met, the protocol falls back to the default proposer selection mechanism.

## Protocol Considerations

* As AEPs is agnostic to the exact market structure used for the AEPs market, we omit any details on proposer market implementation here. It is important to note that any on-chain market is non-trivial to implement. For example, the original execution tickets lack an exact specification of how/when entities enter the execution proposer market, and incentive analysis of the lottery mechanism on which it depends. For the purpose of AEPs’ intuition, one can envision a market based on a simple auction, a lottery, or a Harberger Tax based mechanism (such as proposed for block-building rights [here](https://collective.flashbots.net/t/value-capturing-based-rollups-with-based-preconfirmations/2884) and adapted for AMM access [here](https://arxiv.org/abs/2403.03367)). Access to the market (including or updating bids) is enforced through the inclusion list.

* The exact number of proposers that a validator can vote for appointment will depend on several factors. Some important ones are the desired target size of the appointed proposer set, and the lock-in of validators and/or validator votes (if validators can on-/off-board quickly, new validators may require a delay on when they unlock their vote).

* *Proceeds from the AEPs market should be shared among validators* :man_detective:, through some combination of a share of proceeds for all validators, the validators who appointed the winning proposer, and a burn. It is important that whatever distribution mechanism is chosen incentivizes rational validators to appoint honestly and is resilient to off-chain agreements between validators and proposers.
  * A naive implementation would be to share all proceeds paid by an appointed proposer back to the validators who voted for the proposer’s appointment. However, this may negatively impact the incentive for validators to appoint less competitive proposers.
  * An alternative implementation would be to burn all proceeds from the AEPs auction. As long as there is a reasonably high vote requirement to be appointed (ensuring votes are required from some % of validators not colluding with the proposer), off-chain agreements/bribes should be ineffective.
* To keep the appointed proposer set competitive and to protect against monopolies, rate-limits on the % of blocks that a single proposer can propose over a given time frame can be enforced, e.g. through taxes proportional to % of blocks produced. With rate-limiting measures, AEPs can gradually reduce dominant proposer bids in slot auctions and allow alternative proposers to propose blocks. This ensures one proposer cannot produce all of the blocks, which would effectively remove competition, and then allow the monopolist to extract rents. This is possible in AEPss as a consequence of the sybil resistance that is enforced on the proposer set through delegation. Without sybil resistance of the proposer set (achieved through the vote requirement and a target size), it is not clear if any in-protocol protection against centralization can be enforced.

* For the ejection threshold, too low of a threshold, and this could be used as a griefing vector by a malicious minority of validators, too high and the threshold won’t be responsive enough to remove malicious proposers. A traffic light system, with a low threshold to pause a proposer, and a higher barrier to fully eject a proposer might be interesting, although this requires further research.

* Examples of out-of-protocol proposer requirements include geo-distribution, commitment to respond to data availability sampling requests (i.e., act as a DAS provider), commitment to provide permanent data storage beyond data availability, commitment to run trusted hardware, commitment to provide timely preconfirmations; the possibilities are endless. These requirements are reflected through in-protocol vote requirements.

* This first iteration of AEPs leans quite heavily on inclusion lists. While other mechanisms for forcing votes, ejections, and market actions on-chain may be possible, inclusion lists simplify the explanation of AEPs.

# Appointing Execution Proposers vs. Not
![|690x460, 75%](images/1J6HE1dGtGYcVfEDR5BMSiwScRa.jpeg)


Validator inertia (doing nada) makes the AEPs protocol totally permissionless. If a minimum threshold of validators decides to appoint a proposer, this provides a clear signal that the validators prefer appointed proposers over permissionless proposers. This section explores why validators would choose one option over the other.

## Why would validators appoint proposers?

[Investopedia provides a nice introductory piece](https://www.investopedia.com/articles/economics/08/free-market-regulation.asp) on how some (validator) oversight can maintain healthy (proposer) markets that serve the public (blockchain users). To start this section, I quote the disadvantages of a totally permissionless “free market” as per the same article.
> - A competitive environment creates an atmosphere of survival of the fittest, leading businesses to disregard the safety of the public to increase the [bottom line](https://www.investopedia.com/terms/b/bottomline.asp).
> - Wealth is not distributed equally.
> - Greed and overproduction cause the economy to have wild swings ranging from times of robust growth to cataclysmic [recessions](https://www.investopedia.com/terms/r/recession.asp).

We now focus on blockchain-specific reasons why validators would appoint a proposer set. This section is split into primary and secondary reasons.

### Primary Reasons

* **Ability to mitigate/prevent multi-slot MEV.** If multi-slot MEV becomes profitable enough, we must assume that a permissionless set of actors will try to extract it. By appointing a set of distinct/accountable proposers, validators can either enforce rules on appointed proposers to propose blocks assuming they will not propose the proceeding block, or explicitly rotate out the proposer of slot $n$ from consideration in the market for slot $n+1$.
* **Improved proposer reputation and assurances (generally).** Having a set of appointed proposers provides the protocol and its users with higher guarantees of honest behaviour compared to a purely permissionless approach. Given the irrevocable effect that malicious behaviour can have on membership in the appointed set, proposers are strongly incentivized to propose blocks honestly/in an “aligned” manner.
* **Prevent uncontrolled centralization of the proposer market.** In any primary on-chain market-based approach to delegating block proposing, secondary markets will likely emerge to allow proposers to outsource certain specialized proposing roles and remain competitive in the primary market. Unfortunately, these secondary markets have clear incentives to maximize their own take of block proposal profits. This profit-capturing tug-of-war between the primary and secondary markets is a one-sided affair when the primary market is permissionless.
When given the opportunity to propose a block, permissionless proposers must be expected to source bundles from secondary markets that maximize the total value of the block. If certain secondary markets/market participants emerge as dominant, these dominant participants can extract rent from the primary market, dictate the format of blocks being built, and even dictate which primary market actors can ultimately compete in the primary market.
*Example 1.* Although the provision of preconfirmations may appear to be a net benefit to all, preconfirmations may turn out to be a loss-maker for execution proposers, for example due to sophisticated pricing and infrastructure requirements. Validators may need to enforce preconfirmation provision among appointed proposers until a critical mass of preconfirmation value is achieved.
*Example 2.* It is conceivable that a CEX-DEX arbitrageur/market may become so dominant that access to the CEX-DEX arbitrage allows a proposer to create higher value blocks than any proposer not accessing the CEX. This enables permissioning of the proposer set by the CEX, outside of the control of the blockchain protocol. In such a scenario, the CEX would be able to dictate who proposes blocks in a permissionless block-market structure.
* **Threat of engaging the appointed set may be enough.** We see the use of the appointed set as the most direct way to ensure a competitive proposer market long-term, while protecting against multi-block MEV and simplifying builder reputation-/-al benefits. However, these benefits may be outweighed by the desire of the community to keep the proposer market permissionless. AEPs effectively engages a nuclear non-proliferation agreement between validators and the proposer market, with the validators promising to keep the market permissionless if the proposers don’t engage in any/repeated malicious activity.
* **Bribes.** Receiving an appointment is highly valuable given the exclusivity, reputation, and potential for earnings it brings. Rational permissionless validators who receive more from appointing a proposer than not appointing must be expected to appoint. The protocol and its incentives, including any revenue distribution mechanism from the AEPs market, should be constructed given this potential from off-chain bribes.

### Secondary Reasons

* **Incentivization of non-attributable tasks.** Given the existence of an appointed set, there is a large incentive to join the set to gain access to block proposing. With this incentive, appointment of some/all proposers can be conditioned on the performance of non-attributable non-block proposing tasks which benefit the ecosystem.
* **Simpler auction process.** With a capped number of bidders and bidding demand, distributed auctions are simplified. [Sybil resistance is a thorn in the side of permissionless auctions.](https://arxiv.org/pdf/2301.12813.pdf). To paraphrase and simplify, auctions/lotteries may only be useful if there is a limited number of bidders/demand for bid inclusion is limited. Although censorship is still a concern in AEPs, the fixed number of bids with the added risk of attack attribution mitigates censorship concerns and simplfies the auction design space. 
* **Validators are hardware poor, but alignment rich.** It is possible that validatoors are perfect candidates to influence block proposing. Humans are still capable of doing things that machines and code cannot. If bad proposing practices emerge or are suspected, validators feel ideally placed to intervene on behalf of the protocol. This can take the form of reporting proposers for ejection, or appointing proposers more aligned with themselves/their vision for Ethereum.

## Why would validators maintain a permissionless market?

I start this section with the advantages of a completely free market as laid out in the Investopedia article quoted in the previous section.

> - It contributes to political and civil freedom since everybody freely chooses what to produce or consume.
> - It contributes to economic growth and transparency.
> - It ensures competitive markets.
> - Consumers determine what products or services are in demand.
> - Supply and demand create competition and ensure that the best goods or services are provided to consumers at a fair price.



* **Permissionless markets = more competition**. This is true at any given instant in time. However, over a long enough time horizon, a totally permissionless market may actually reduce competition ([see the numerous ongoing big tech lawsuits on monopolization](https://www.economicliberties.us/big-tech-monopolies-2/)). With more competition comes tighter profit margins and a brittleness of players to survive market shocks. It is not obvious that permissionless markets can replenish competitors following market shocks. Without competitors, there is no competition.

* **Validator strategies should only be encodable**. It is possible that validators should only be assumed to be able to hard-code their logic to remove subjectivity from validator tasks. This would restrict validator enforceability to attributable tasks. The key open question here is whether or not hardcoded rules can adapt to defend a decentralized system as well as a majority of its stake-weighted users. When the games that are harming the system ([censorship laws](https://www.coindesk.com/tech/2023/12/06/ethereums-censorship-problem-is-getting-worse/), off-chain agreements, cartelization, monopolization) are being played off-chain, this is particularly unclear.
* **Maintaining no in-protocol proposer requirements is simple and easy.** [Occam's Razor](https://en.wikipedia.org/wiki/Occam%27s_razor).
* **If it ain’t broke, don’t fix it.** It is possible that a permissionless proposer market best empowers the majority of users. At the very least, by creating big-node small-node separation, leveraging a decentralized small-node set regardless of the big node market structure should maintain/improve censorship resistance. This is the case made for execution tickets without AEPs.

# Food for Thought

![|500x500, 75%](images/8HDKlIHbfxiv0HWzJIzSzyABR0g.jpeg)
*Some will see AEPs’ optional restriction of block proposing to the appointed set as a no-go and a contradiction to the permissionless ideals of Ethereum.*


![|690x333, 75%](images/stzxllawqVGgRrTUKyBsDpntANA.jpeg)

*AEPs, like many others before, decouple validation from execution-block building and proposing. This protects the decentralization of the validator set. AEPs goes one step further, ensuring this decentralized set of protocol representatives can have a meaningful say in who should propose blocks, and what block-proposal standards should be adhered to. Making proposers accountable to the validators and users they represent might be as aligned as it gets.*