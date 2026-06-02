*Thanks to Francesco D’Amato, Barnabé Monnot, Mike Neuder, and Thomas Thiery for feedback and review. Thanks again to Francesco for coming up with the second proposal.*

Whether we want to implement slot auctions into ePBS is an [active discussion area](https://www.notion.so/Arguments-in-Favor-and-Against-Slot-Auctions-in-ePBS-c7acde3ff21b4a22a3d41ac4cf4c75d6?pvs=21), and support for slot auctions was signaled in the [seventh ePBS breakout call](https://youtu.be/fQx_UbaPX-E?si=C8ALtI4zOSmFjRpN). Currently, the ecosystem lacks knowledge about the fork choice safety of slot auctions in the [current ePBS proposal](https://ethereum-magicians.org/t/eip-7732-enshrined-proposer-builder-separation-epbs/19634). This note presents two strawman proposals to start discussing the forkchoice safety of slot auction ePBS.

This note presupposes the reader is familiar with the ePBS proposal ([EIP-7732](https://ethereum-magicians.org/t/eip-7732-enshrined-proposer-builder-separation-epbs/19634)).  An essential part of this EIP is that a *payload boost* is applied to a beacon block if the [Payload-timeliness committee (PTC)](https://ethresear.ch/t/payload-timeliness-committee-ptc-an-epbs-design/16054#proposer-initiated-splitting-18) reaches a quorum. If an execution payload is seen on time by a majority of the PTC, the beacon block that corresponds to the execution payload receives additional fork-choice weight (Reveal Boost). If the PTC observes a timely message from the builder stating that it withholds its payload, the additional fork-choice weight is given to the parent block of the beacon block corresponding with the withhold message (Withholding Boost).

In [slot auction](https://mirror.xyz/0x03c29504CEcCa30B93FF5774183a1358D41fbeB1/CPYI91s98cp9zKFkanKs_qotYzw09kWvouaAa9GXBrQ) ePBS, the beacon proposer does not commit to an execution payload hash, unlike in block auction ePBS. Instead, it commits to a specific builder that can submit an execution payload when it is time to reveal. The first problem is that a builder could submit multiple execution payloads. In this note, we will refer to this as a builder equivocation.

In block auction ePBS, something similar to equivocation is possible. The builder could wait for at least one PTC member to vote `PAYLOAD_ABSENT` and then release a withhold message and an execution payload to split the PTC's view such that none of the three vote options (`PAYLOAD_ABSENT`, `PAYLOAD_WITHHELD`, `PAYLOAD_PRESENT`) reaches the [quorum of 50%](https://discord.com/channels/595666850260713488/874767108809031740/1272916231250382939) of the votes. 

In block auction ePBS, this equivocation does not benefit the builder much. If the PTC does not reach a quorum, no payload boost is applied, and the honest next-slot validator will take the payload as head. If the builder equivocates, the protocol does not need to guarantee Builder Reveal Safety since the builder does not act as the protocol expects. Still, the builder does not have the flexibility to submit a different execution payload since the beacon block commits to the execution payload hash.

It could be that the builder is incentivized to play a [timing game](https://arxiv.org/abs/2305.09032) and eventually decides that it is best if the block were withheld. The builder could submit a withhold message and see if the PTC will reach a quorum on `PAYLOAD_WITHHELD`. If the PTC does not seem to do so, and the PTC also has not yet reached a quorum on `PAYLOAD_ABSENT`, the builder reveals its payload after all. This attack seems difficult to pull off, but it allows the builder to check whether it can renege on its promised payment to the proposer while still landing its payload on-chain if it has to pay (assuming an honest next-slot proposer). 

In slot auction ePBS, a builder may be more incentivized to equivocate because it can change the contents of its execution payload. For example, the builder could broadcast a particular execution payload, but a short time later, a significant MEV opportunity appears, and the builder now wants to broadcast a new execution payload.  

Preventing equivocations in slot auction ePBS would be desirable because equivocations would cause insecurity in fork choice. Specifically, we want to obtain the following properties with minimal changes.

> 💡**Desiderata**
> 1. If the builder reveals precisely one timely execution payload, it should retain the same Builder Reveal Safety guarantees as in block auction ePBS
> 2. If the builder reveals multiple timely and equivocating execution payloads,
> a. no execution payload should go on-chain, 
> b. but the Unconditional Payment should be as strong as in block auction ePBS

Should slashing or a penalty be applied to equivocating execution payload messages? This question is relevant to block and slot auction ePBS, although the potential benefits of equivocation are likely to be higher in slot auction ePBS. Since ePBS still allows local block construction, it seems unwise to apply harsh slashing or penalties if there is equivocation because this may disincentivize local block construction. Moreover, since it is not clear that there are significant gains to be made from equivocating execution payloads, and if gains are to be made, slashing or penalties do not qualitatively change this, so slashing or penalties are not immediately necessary.

## Proposal 1: Vote for Execution Payload Hash

The first strawman proposal to obtain these properties involves changing the block auction ePBS fork-choice specification as follows.

> 💡 **Proposal 1: Vote for Execution Payload Hash**
> 1. Replace `PAYLOAD_PRESENT` with `execution_payload_hash`
> 2. If no PTC quorum is reached, let the honest next-slot validator use an empty block as its head instead of a full block.

A PTC member would now vote for the `execution_payload_hash` it has observed instead of simply voting whether a payload is present. Reveal boost is applied if a quorum is reached on `execution_payload_hash`. Intuitively, this is necessary for slot auctions since the PTC now indicates which execution payload should be used if the block is full and not just that the block is full.

It seems like desideratum 1—the same Builder Reveal Safety as in block auction ePBS—is immediately satisfied since an honest builder does not release equivocating execution payloads. A PTC member's `execution_payload_hash` vote functions the same as a `PAYLOAD_PRESENT` vote.

If the builder equivocates but the PTC still reaches a quorum on `execution_payload_hash`, then the execution payload will make it on-chain in the same way a payload would have made it on-chain if the builder did not equivocate. I believe this is fine because the builder released an equivocating payload that did not split the view of the PTC (sufficiently). This indicates that this equivocating payload is a minor threat to the fork-choice security. Although this outcome contradicts desideratum 2a, the timely requirement in desideratum 2 should be read as the execution payload intends to split the view of the PTC sufficiently.

If the builder equivocates and the PTC does not reach a quorum, then the next-slot honest proposer should see an empty block as its head. The builder loses some of its Builder Reveal Safety because it could be that the builder reveals only one payload (does not equivocate), yet the PTC does not reach a quorum. However, Builder Reveal Safety is not very strong in block auction ePBS either because a next-slot rational proposer would prefer to build on an empty block than a full block since these are more valuable (the ex-post reorg safety is low if reveal boost is not applied). Changing the default next-slot honest proposer behavior from seeing a full block to an empty block as its head does not change much in Builder Reveal Safety, and the system then satisfies desideratum 2.

What if the next-slot proposer is dishonest? The builder could collude with the next-slot proposer and broadcast messages such that the PTC does not reach a quorum and include an execution payload late. This is similar to the attack in block auction ePBS, where a builder tries to get Withhold Boost to apply but releases an execution payload if it does not succeed. The builder and next-slot proposer collusion allows the builder to play aggressive timing games while ensuring Builder Reveal Safety. These timing games come at the expense of the execution validation time of the attesting committee. It is not immediately apparent what this attack would gain for the builder and next-slot proposer collusion since the builder timing game gain comes almost entirely from the next-slot proposer’s revenues.

The downside of this proposal is the problem of free data availability. The PTC could now reach a quorum on an `execution_payload_hash`. These PTC votes would end up on-chain, and an adversary could use them to show that a piece of data was available to the PTC. Yet the adversary would not have to pay the base fee needed to provide the data on-chain; it only has to pay the proposer to commit to the adversary as the builder.

## Proposal 2: Pretend Payload Absent

The second strawman proposal does not suffer from the free data availability problem and achieves the desiderata as follows.

> 💡 **Proposal 2: Pretend Payload Absent**
> If the next-slot proposer/attesters observe(s) at least two equivocating payloads, it/they assign(s) no additional fork-choice weight to any empty or full block

The behavior of a PTC member does not change from the block auction ePBS specification. However, suppose a proposer sees that the block producer in the previous slot released equivocating execution payloads. In that case, it ignores the fork-choice weight the PTC may have given to any fork. 

If the builder is honest, this does not change its Builder Reveal Safety since the system works exactly as it does in block auction ePBS. Desideratum 1 is thus immediately satisfied.

If the builder equivocates, an honest-but-rational proposer will choose to build on an empty block since it allows the proposer to extract the MEV from two slots of time instead of one. The attesters will not object to this since they observed the equivocating payloads and assigned no additional fork-choice weight to any forks. Therefore, if the next-slot proposer and attesters are honest, desideratum 2 is also satisfied.

The next-slot proposer could collude with the builder. The builder could equivocate, and the next-slot proposer could choose to build on a full block. Similarly to the collusion situation described in the first proposal, though, the gain that a builder gets from this equivocation seems to primarily come from the profits the next-slot proposer could make. It is not clear that the joint utility of the collusion increases by enough to justify the collusion. 

A builder and a next-slot proposer could collude to ensure an execution payload does not become canonical. Consider a builder that submits an execution payload, and the PTC reaches a quorum on whether this payload is timely. Later, the builder regrets the contents of its execution payload and aims to remove it from the canonical chain. It could then release an equivocation payload so the next-slot proposer will not build on the undesirable execution payload. This is similar to a builder not revealing its block in block auction ePBS.

In conclusion, these strawman proposals seem to achieve the same fork-choice safety under slot auctions as under block auctions with minimal changes. While the first proposal has a problem with free data availability, the second proposal may be more susceptible to builder games, such as reorging its execution payload. The lack of free data availability and being less susceptible to builder games are advantages of slot auctions in ePBS. Further research on a design that simultaneously solves both problems would be very valuable. If you are interested in working on (slot auctions in) ePBS, please see this [page](https://www.notion.so/ePBS-EIP-7732-tracker-9f85f7b086994bd79192bc72bae703a1?pvs=21)!