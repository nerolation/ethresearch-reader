# The Preconfirmation Sauna

*We are [Switchboard](https://switchboard.nethermind.io/), a Nethermind-backed team dedicated to answering the most pressing preconfirmation questions. Thanks to @swapnilraj,@tkstanczak,@Julian,@linoscope, and Michal Zajac for your helpful comments.*

***TL;DR:** Decentralized preconfirmers come with significant tradeoffs that will likely make them impractical for the forseeable future. The preconfirmation sauna creates a repeated game amongst permissionless preconfirmers which incentivizes trust, specialization within these tradeoffs, innovation, as well as user-focused preconfirmation policies. More than this, the sauna provides a common interface for all entities in the preconfirmation supply chain to interact, simplifying the preconfirmation process. We believe this set of sauna-related health benefits can unlock preconfirmations.*

In the short time that we as an industry have been thinking about preconfirmations, [more or less since November 2023](https://ethresear.ch/t/based-preconfirmations/17353), several teams have emerged to compete for the title of “the preconfirmation protocol”. This is despite almost no shared understanding or appreciation for how a preconfirmer should behave, or how this behaviour should be incentivized.
 
![image|690x388, 75%](images/h1drs3g3BOZxpvFX3hFT2bZWkKD.jpeg)


This article outlines Switchboard's vision for how this preconfirmation competition should play out: specifically, how it can be harnessed to encourage innovation without siloing off parts of the transaction supply chain, and how it can address technological barriers to preconfirmations including fair exchange (see Appendix for more details).

**Goal:** Leverage this emergent preconfirmation protocol competition to enable preconfirmations in what we call the preconfirmation sauna. 

**Non-goals:** 

- Engineer the preconfirmation sauna immediately. The sauna needs preconfirmation protocols just like the preconfirmation protocols need the sauna. Until these protocols emerge, the sauna remains a vision. The engineering specifications will develop as the needs of everyone in the preconfirmation supply chain becomes clearer. In this sense, we are waiting for the rocks to heat up before adding water.
- Confuse the preconfirmation sauna with [commit-boost.](https://www.youtube.com/watch?v=jrm4ZUoj9xY&list=PLJqWcTqh_zKHDFarAcF29QfdMlUpReZrR&index=13) Commit-boost is a mev-boost rewrite to allow L1 proposers to commit to certain restrictions on their blocks while still outsourcing partial block-building rights. We share their vision for a unified interface for proposer commitments, preconfirmations being a perfect example of a proposer commitment. The sauna isn’t just focused on a unified interface though; it brings competition, pricing policies, preconfirmer registration & slashing conditions, trust, etc. In that sense, commit-boost will depend on the sauna to make preconfirmations a reality. 


## The Multi-headed Hydra of Preconfirmations

The problem of offering preconfirmations is a multi-headed hydra. What makes a preconfirmer “good” or “bad” will depend on many factors including, but not limited to:

- Latency
- Throughput
- (Trusted) execution guarantees
- Privacy
- Cost
- Interoperability with other protocols
- Decentralization
- General trust
- Liveness/censorship resistance
- Ability to express intents

Most of these factors have trade-offs, so deciding on a single preconfirmation protocol which somewhat specializes in a subset of these criteria would be a mistake at this early stage of preconfirmation development. 

### Encouraging Competition

Beyond the warm fuzzy feelings we get from many permissionless preconfirmers, we need competing preconfirmers to incentivize competition and keep preconfirmation strategies honest and transparent. Although some preconfirmation guarantees require tradeoffs, e.g. cost vs latency, the benefits of repeated honest behaviour and its long-term access to the preconfirmation market/revenue has almost no trade-off considerations that come into play. Even in the fringe cases where malicious behaviour may have significant immediate profits for a preconfirmer, proposers can always opt-in to choosing entities whose reputational value dominates any such profits, e.g. Flashbots, Vitalik, etc. (even within this set of “trusted” entities, there will be other tradeoffs that must be considered).

This out-of-the-sauna trust will be necessary as the demand for high-throughput, low-latency preconfirmations likely means we need to delegate preconfirmations temporarily to high-resource and/or centralized entities/committees. In the sauna, misbehaving preconfirmers can be reported and deprioritized by users and proposers, creating a significant disincentive for preconfirmers to act maliciously. As such, users and proposers can immediately begin to depend on the subjective parts of the preconfirmation supply chain such as pricing policies and expected response times that are necessary for preconfirmations to become a reality now. 

## The flaw in existing approaches

The community has been semi-publicly focused on the infrastructure that enables a proposer to offer preconfirmations. There are 2 broad solutions in this regard:

- The based proposer commits to a specific preconfirmation protocol ahead of time. Most projects are looking at this. On its current trajectory, this is probably a “winner-takes-most” approach with each project trying to establish itself as the only game in town.
- The based rollup commits to a specific preconfirmation protocol ahead of time and this preconfirmation protocol is trusted to enable preconfirmations. If the preconfirmation protocol fails, liveness breaks.

The endgame for both of these approaches requires the user and the proposer to trust a single preconfirmation protocol indefinitely. We see it as unacceptable to depend on the honest behaviour of a single preconfirmation protocol preconfirming all transactions for Ethereum. 

If all of the preconfirmation flow is coming through one specific preconfirmation protocol, this removes competition and places an entity that can rent-capture between Ethereum and its users. More than this, it is unlikely that an emergent preconfirmation protocol could/should be trusted without strong technical guarantees, or viable alternatives for users and validators to switch to. In this sense, trust is a powerful property for emerging technologies that can bridge technological barriers to key problems. 

With respect to preconfirmations, one such problem that trust can address is the fair exchange of preconfirmation requests and responses. In the Appendix, we discuss how the trust generated through the preconfirmation sauna offers a viable solution to the fair exchange problem.



![image|690x462, 75%](images/aDgdzzzGuiRNNdWF6dVuKkWO8Iq.jpeg)
The current path to preconfirmations involves many protocols building by themselves, competing for a critical mass of validator adoption. Until that point, preconfirmation infrastructure will fragment until one emerges as dominant. This game ends with the best-backed/-connected protocol winning. This leads to an indefinite monopoly on the preconfirmation supply chain, which harms both competition and trust. 

# Enter the Sauna.

From [Wikipedia](https://en.wikipedia.org/wiki/Finnish_sauna): “Saunas are strictly egalitarian places: no titles or hierarchies are used in the sauna.” Business is often done in saunas. If someone is ever caught misbehaving, people can choose not to sauna with them again.

The preconfirmation sauna is completely agnostic to the preconfirmation protocols that exist within the sauna framework. To enter the preconfirmation sauna, preconfirmers and their respective protocols register as prospective preconfirmers in the system. Proposers then choose whichever preconfirmer(s) they like to delegate preconfirmation rights to. 

Although the intuition is that proposers would choose the preconfirmer paying the most for the opportunity, there are other factors at play. Proposers must trust the preconfirmer to broadcast all of the preconfirmations to the network ahead of/at block building time, depending on whether or not the preconfirmer is also the one building the final block. This is because preconfirmations almost certainly need proposer slashing conditions to prevent [safety or liveness faults.](https://ethresear.ch/t/based-preconfirmations/17353) As such, a proposer risks being slashed by choosing an untrusted preconfirmer. 

![image|690x382, 75%](images/evcWm05gUbqjWUZMRvyEV4OE1Gg.jpeg)
To enable preconfirmations we need healthy competition among protocols. Importantly, this competition should not be over fragmenting users and validators, but over the quality of preconfirmations being offered. Competition over improved preconfirmation guarantees not only creates an incentive to act honestly, but also an incentive to innovate. The vision of the sauna is to ensure permissionless access to the preconfirmation game, and to leverage the competition and trust that this permissionlessness brings. For this to happen, switching between protocols needs to be seamless for everyone in the supply chain. Although this probably requires some standards, standards aren’t a necessity. 



## Everyone to the Sauna.

If we want proposers and users to engage in specific preconfirmation protocols, we need trust. More than trust, there needs to be clear incentives for everyone to engage with one another.

1. **Proposers want to use the preconfirmer.** Proposers need to know that committing to a preconfirmation protocol will generate higher revenue than simply outsourcing building through something like mev-boost. This requires the preconfirmation protocols to be paying competitively for the right to preconfirm. Almost by definition, this can only be achieved through competition among independent protocols. Proposers also need to know with a high degree of confidence that a preconfirmer will maintain liveness and forward all preconfirmations to the network, and avoid any proposer slashing conditions. With a sauna full of preconfirmers, proposers can choose more robust preconfirmers with less failure and slashing risk at the expense of lost revenue. Proposers can also opt for riskier preconfirmers offering higher revenue. The choice is theirs!
2. **Users want to use the preconfirmer.** Fundamentally, preconfirmation revenue can only be generated through user submission of preconfirmation requests. This requires user to trust in the preconfirmation protocol. With only a single preconfirmation protocol, this likely leads to preconfirmation policies that favour the relayer and not the user or proposer. User adoption of minimally trusted preconfirmations (no/limited guarantees of inclusion, selection biases on inclusion, etc.) will likely be limited.  In that sense, we need competing preconfirmation protocols to incentivize trust in the preconfirmer and policies that favour the users.

Trust breeds trust. With a sauna full of competing preconfirmation protocols, there are clear incentives to optimize preconfirmation policies and guarantees, including trust (recall the Repeated Preconfirmation Sauna Game), to secure selection from the proposer and the users.

## Life after Sauna

Importantly, the use of the sauna isn’t necessary. Proposers can communicate directly with, and commit to, their preferred preconfirmer outside of the sauna. We still imagine an endgame where there is some preconfirmer that trustlessly provides “perfect” preconfirmations. 

# Conclusion

Until the perfect preconfirmation protocol emerges, protocols need to compete, experiment and innovate while still enabling preconfirmations. More than this, the ability to delegate, send, and receive preconfirmations should be as simple and standardized as possible. To do this, a credibly neutral platform is essential. This is what we envision for the sauna. We look forward to seeing you in there.

### Call to Action

At Switchboard, we aren’t just building therapeutic wooden structures. We’re also working on improving the preconfirmation protocols themselves. Although we believe preconfirmations could probably be offered along Justin’s timeline of this year, with help from the sauna, [the multi-headed hydra of preconfirmations](https://ethresear.ch/t/the-preconfirmation-sauna/19762#the-multi-headed-hydra-of-preconfirmations-2) must be tackled. Preconfirmation RnD, to which Switchboard is committed, will be vital in this regard.

## Appendix. The Fair Exchange Problem: A Sauna Case Study

There are many issues that a preconfirmation protocol must address to be considered viable, [some of which are outlined here through a strawman framing of a preconfirmation protocol.](https://ethresear.ch/t/strawmanning-based-preconfirmations/19695) [One of the key components needed for preconfirmations is the fair exchange of preconfirmation requests](https://x.com/_julianma/status/1796552412687155320) from users and responses, the preconfirmations, from the preconfirmers.

Fair exchange is a hard problem. Users want to get the strongest possible guarantees of inclusion/execution when they submit a request, while preconfirmers want to give the weakest guarantees of inclusion/execution, retaining as much optionality as they can until the block must be built. The most well-known solution we have for fair exchange, albeit for block building, is [mev-boost](https://boost.flashbots.net/). This solution hinges on trust in the relayers that execute the fair exchange of blocks between block builders and block proposers. This game started out with a single trusted Flashbots relayer, but now many trusted relayers exist. Some builders even run their own relayer, most notably [Titan](https://docs.titanrelay.xyz/). Doesn’t this break the fair exchange guarantees of a trust intermediary? No! 

Titan relay have a significant incentive to never betray the trust of L1 proposers, and indirectly, builders using the Titan relay. With the Titan relay, Titan builder has a clear advantage compared to submitting blocks to any other relay, as Titan builder bids can be updated much quicker at the Titan relay than if the bids needed to first be relayed to an external relay. Furthermore, if any Titan misbehaviour is ever detected (or even reasonably suspected), proposers will stop trusting, listening to, and selecting the Titan relayer. Consequently, Titan would probably lose the edge they get from relaying their own blocks forever if a single misbehaviour is ever detected. This is incredibly powerful. This is the *Repeated Sauna Game.* 

The Repeated Sauna Game can also be played between preconfirmers. Some protocols may pride themselves on trustless approaches to the fair exchange problem: something like a censorship-resistant input tape with strong data-availability guarantees. Unfortunately, this will come at latency, throughput, and cost tradeoffs. In that sense, users and proposers are probably happy to accept guarantees from the Titan of preconfirmations, even if that currently means a centralized entity with no formal guarantees of fair exchange. Thanks to the Repeated Preconfirmation Sauna Game, Titan preconfirmer has just as much to lose, if not more, from misbehaving when offering preconfirmations. With preconfirmations, the preconfirmer will be able to capture revenue from preconfirming, albeit within the bounds of the ordering and execution policies that they commit to offering users and proposers. Thus, the Repeated Preconfirmation Sauna Game has tangible incentives to keep preconfirmers behaving honestly, enabling fair exchange, among many other services where some amount of trust can bridge current technological barriers.

To summarize, the Repeated Preconfirmation Sauna Game establishes dependable economic trust among rational preconfirmers through:

- The existence of alternative rational and competitive preconfirmers.
- The monitoring of preconfirmer behaviour by many independent observers; users, wallets, proposers, other preconfirmers, etc.
- Reputation and eligibility for future, likely increasing, revenue outweighing short-term incentives to deviate.