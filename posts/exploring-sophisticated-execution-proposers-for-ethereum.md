*This post contains ideas many Ethereum researchers have discussed; I transcribe them here. Thanks to Barnabé Monnot, Caspar Schwarz-Schilling, Thomas Thiery, Tim Beiko, Mike Neuder, and Justin Drake for feedback and review.* 

Ethereum has been designed to have a decentralized validator set. The set’s decentralization is crucial for validators' tasks. Validators currently have the following roles:

- Attester: validators are asked to attest to consensus information like whether a block is valid and timely. The decentralization of attesters ensures that Ethereum is resilient against correlated failures, whether accidental (e.g., due to bugs taking offline a particular share of the validator set) or malicious (e.g., a share of the validator set producing a safety fault).
- Beacon block proposer: validators are asked to propose beacon blocks that contain consensus information, such as attestations. The decentralization of beacon block proposers ensures that this consensus information is (eventually) registered on-chain.
- Execution block* proposer: validators are asked to propose execution blocks that contain user transactions. A decentralized set of execution block proposers fosters resilience against cartels looking to extract rents by, e.g., censoring transactions or extracting multi-slot MEV.

The ecosystem may ask validators to fulfill a different set of duties in the future. In particular, Fork-Choice Enforced Inclusion Lists ([FOCIL](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870)), which is proposed to be implemented in Ethereum via [EIP-7805](https://eips.ethereum.org/EIPS/eip-7805), adds a new duty to validators:

- Inclusion List proposer: validators are asked to propose inclusion lists, a set of pending transactions the validator has observed. The decentralization of inclusion list proposers is crucial because it ensures that all pending transactions will be included on-chain quickly, regardless of their contents.

This post investigates whether it is possible to unbundle the role of execution block proposer from the other validator duties and create a new, specialized class of service providers that fulfills the role of execution proposer. Some advantages may be that Ethereum could isolate unsophisticated proposers from MEV and have higher expectations in terms of sophistication and hardware of this new class of service providers, allowing for a more performant Ethereum network. This note aims to spark a community discussion around if, when, and how Ethereum could practically separate the role of execution proposer from other validator duties. What does the ecosystem need before this separation is possible, if at all? What does the ecosystem expect from execution proposers? How does the ecosystem reason about setting expectations for protocol participants?

![Figure 1: A map of validator services as presented by Caspar, Ansgar, Francesco and Barnabé at CCE’24.|667x500](images/vbfsUGll0ApfIykQiG5KNFgp8u1.png)
Figure 1: A map of validator services as presented by Caspar, Ansgar, Francesco and Barnabé at CCE’24.

\* Note that we use the term execution block here and not execution payload. Currently the execution payload lives within the beacon block and is thus not a separate bock. In future designs, like Attester-Proposer Separation and ePBS EIP-7732, the execution payload is separated from the beacon block into its own execution payload. Functionally, the role of proposing an execution block and an execution payload is practically identical.

## Unbundling Design Philosophy

The idea of unbundling specific roles from the set of duties validators are currently tasked with is not new. In his [Endgame post](https://vitalik.eth.limo/general/2021/12/06/endgame.html), Vitalik wrote about potential second tiers of stake that validate blocks, check the availability of blocks, and/or add transactions to prevent censorship. He concluded as follows:

> What do we get after all of this is done? **We get a chain where block *production* is still centralized, but block *validation* is trustless and highly decentralized, and specialized anti-censorship magic prevents the block producers from censoring.**
> 

The first paragraph of Vitalik’s recent [possible futures of Ethereum: The Scourge post](https://vitalik.eth.limo/general/2024/10/20/futures3.html) can be interpreted as why unbundling may be necessary.

> One of the biggest risks to the Ethereum L1 is proof-of-stake centralizing due to economic pressures. If there are economies-of-scale in participating in core proof of stake mechanisms, this would naturally lead to large stakers dominating, and small stakers dropping out to join large pools. This leads to higher risk of 51% attacks, transaction censorship, and other crises. In addition to the centralization risk, there are also risks of *value extraction*: a small group capturing value that would otherwise go to Ethereum's users.
> 

**The primary reason for unbundling designs like Proposer-Builder Separation (PBS) and Attester-Proposer Separation (APS) has been to preserve the decentralization of the participants in the core Proof of Stake mechanism such that they can hold more centralized participants accountable.** By separating the roles that benefit from economies of scale from those that do not, Ethereum can preserve the decentralization amongst the participants of the roles where there are no economies of scale.

The separation of concerns designs, like PBS and APS, [have](https://arxiv.org/abs/2408.11255) [been](https://arxiv.org/abs/2408.03116) [criticized](https://arxiv.org/abs/2305.19037) for leading to centralization amongst the roles where economies of scale benefit participants, i.e., the builder in PBS and the execution proposer in APS. While these works clearly show that the participants of the complicated services will be sophisticated and centralized, these works do not claim causality. The design philosophy behind these ideas is that it is inevitable that the service providers of the complicated service will be centralized. However, it is possible to preserve the decentralization of the participants of more straightforward services by unbundling these two services. More research is necessary to investigate what causes centralization. Either of the following or a [combination of the two](https://ethresear.ch/t/on-block-space-distribution-mechanisms/19764) could be the cause of centralization:

1. The market mechanism that allocates the rights to fulfill a particular service amongst service providers. An example of such a market mechanism is Execution Tickets.
2. The inherent complexity of fulfilling the service. For example, building competitive blocks is [known to be computationally complex](https://ethresear.ch/t/block-building-is-not-just-knapsack/19871) and has [high barriers to entry](https://arxiv.org/abs/2405.01329).

**A secondary reason for unbundling roles is that Ethereum can then make different assumptions about sets of participants in terms of sophistication and available hardware.** Ethereum must curate this set to fulfill all roles if one service provider fulfills multiple roles. For example, Ethereum wants a decentralized attester set to ensure censorship resistance; hence, the hardware requirements for running an attester are very low. However, perhaps decentralization is not as necessary for block production if there are other censorship resistance tools. Ethereum may want to increase its hardware expectations of execution proposers once inclusion lists are deployed on mainnet. 

Increasing bandwidth and hardware expectations for certain providers of specific services could benefit the protocol. Currently, unsophisticated proposers are a bottleneck for protocol development; more sophisticated proposers could make some protocol upgrades significantly easier. Increasing hardware expectations of proposers means they can build larger blocks and disseminate more data over the network while keeping the verification load for other nodes semi-constant.

Unbundling roles has been explored from first principles before. Barnabé proposed the concept of [rainbow staking](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683). Rainbow staking is a conceptual framework that allows different service providers to participate in the services at which the service provider excels and shows that operator-delegator structures may appear across all these services. Notably, with rainbow staking, the protocol would no longer expect all validators to perform all tasks. Although this post is rooted in the rainbow staking conceptual framework, the goal is to practically investigate if and when either or both the execution and beacon proposer roles can be split from the other duties validators currently have.

![rainbow staking|690x456](images/vMErJzIy5UIusQPFLoQoTe5jDfx.png)
Figure 2: A map of the unbundled protocol. Taken from the [rainbow staking post](https://ethresear.ch/t/unbundling-staking-towards-rainbow-staking/18683).

This post not only builds on rainbow staking but also on an extended line of work that investigates the advantages of more sophisticated proposers. [Vitalik’s Endgame post](https://vitalik.eth.limo/general/2021/12/06/endgame.html) shows a more centralized block production pipeline with decentralized validation and inclusion mechanisms. Justin introduced [Attester-Proposer Separation (APS)](https://youtu.be/IrJz4GZW-VM?si=2sPBXpuit6uBZTSR), a design family of splitting execution proposers from other validator duties, which would allow for sophisticated proposers to help significantly scale Ethereum. Moreover, Mike and Justin investigated a potential implementation of APS, [Execution Tickets](https://ethresear.ch/t/execution-tickets/17944), in which the protocol sells execution proposal rights directly to service providers. This post takes some of those ideas, combined with ongoing discussions amongst Ethereum researchers, and intends to make them legible to the community.

## The Functional Role of Execution Proposer

To understand whether the role of execution proposer can be unbundled from the current validators and given to a different set of service providers, it is essential to understand what it means to be an execution proposer, what the protocol expects from execution proposers (the protocol’s desiderata), and which set of participants could be best an execution proposer.

In the following, we see the execution proposer and builder role as the same entity and refer to it as the execution proposer. The two roles could be split. For example, the execution proposer is in charge of proposer commitments, and the builder is in charge of ordering and inserting transactions. However, we do not do so here since there are significant [synergies](https://www.investopedia.com/terms/s/synergy.asp) between the two roles. For example, an execution proposer (without a builder) could better make the proposer commit when to release its block (play [timing games](https://arxiv.org/abs/2305.09032)) if it also controls the size of the block, i.e., if the execution proposer is also the builder. 

### Competitive Execution Proposers

The execution proposer is expected to deliver a valid execution payload, that is an ordered list of transactions, to the Ethereum network at a specified time. To do so, at a minimum, the execution proposer must have access to transactions and the ability to pack them in a block and propagate it. 

To be a competitive execution proposer, however, it must have access to exclusive order flow, amongst other vectors of competition such as sophisticated algorithms. This means execution proposers must acquire exclusive order flow, although projects like [BuilderNet](https://buildernet.org/) aim to create a platform on which builders can benefit from sharing order flow. Next to order flow, the execution proposer must have a fairly sophisticated block packing algorithm and minimize downtime. In practice, it is widely accepted that execution proposers (better known as builders today) are a centralized and small set of sophisticated agents with performant hardware.

Some readers may wonder why execution proposers must be competitive or why they must compete on the dimension of MEV extraction. While it is not a design goal to have execution proposers that can maximize the extracted MEV, in my opinion, it is inevitable. Ethereum issues the right to be an execution proposer. In a permissionless market without friction, this right will be allocated to the party that values it the most, regardless of the market structure the protocol imposes.

The protocol can impose frictions. For example, it could allocate these rights to validators who may have some intrinsic preferences on who should produce the block. This may resemble the situation Ethereum is in today, with some validators preferring to build blocks themselves even if there is a substantial opportunity cost in doing so. Some other frictions Ethereum could rely on is that an [initial allocation](https://ethresear.ch/t/on-block-space-distribution-mechanisms/19764) of rights amongst the set of execution proposers is likely to be somewhat persistent because trade amongst sophisticated execution proposers goes hand-in-hand with frictions like setting [strategic reserve prices](https://mirror.xyz/julianma.eth/8aCbi_a-Gh5DWnkJWstm8zA5fvtoQB-QR5we7C8XC90) and the risk of adverse selection.

### What does Ethereum want from Execution Blocks and Execution Proposers?

Ethereum may want execution proposers to propose blocks that fulfill specific criteria. Some criteria of blocks may be:

- **No Censorship.** One of Ethereum’s core values is censorship resistance, so each block should be censorship-free.
- **No Market Manipulation.** Execution proposers have full control over the ordering of transactions in a block. This allows them to extract MEV. While the community accepts MEV extraction, there may be more sophisticated manipulations that the community sees as [*breaking the fence](https://barnabe.substack.com/p/seeing-like-a-protocol).*

Although execution proposers influence the outcome of the above criteria in the current protocol, these are criteria of blocks and not necessarily of those that make the blocks. Separately, the community may have some requirements for execution proposers themselves as well:

- **No Downtime.** Execution proposers should always be available to propose valid blocks. Otherwise, slots will be missed, leading to longer transaction inclusion times.
- **Performant Machine.** To have blocks with a lot of transactions (and blobs), the community may want an execution proposer that has a performant machine.
- **Efficiency.** Execution proposers should efficiently pack blocks to maximize the transactions included while minimizing the network resources consumed. Today, this may mean [facilitating Transaction Access Lists](https://arxiv.org/pdf/2312.06574). In the future, this may mean [brokering prices](https://arxiv.org/abs/2411.11789) for transactions.

**Censorship** by builders [has been a problem](https://www.censorship.pics/) in Ethereum. A few large entities dominate the builder market, and since they currently control which transactions are included in a block, they can censor at will. Although the community prefers execution proposers that do not censor, it is clear that the community should not rely on execution proposers for censorship resistance. Execution proposal rights are inherently centralizing; hence, it is unreasonable to expect Ethereum’s censorship resistance from the small set of execution proposers.

FOCIL provides a way for validators who are not the execution proposer in a slot to contribute to censorship resistance. In each slot, 16 validators each create a list of transactions that must be included in the block. If FOCIL is implemented, Ethereum will not need to rely on execution proposers for censorship resistance anymore; perhaps it is not a requirement that the set of execution proposers contributes to censorship resistance.

[Multiple concurrent block producers](https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777/11) is a different line of research aiming to increase applications' economic efficiency. One way it may do so is because it could prevent block producers from [censoring for economic reasons](https://arxiv.org/abs/2301.13321). This direction, however, is largely orthogonal to whether the execution proposer role should be split from the other validator duties. Regardless of the number of execution proposers per slot, a larger, more decentralized set of participants could complement censorship resistance. Multiple concurrent block producers could be better suited to give real-time censorship resistance for certain economic use cases. In contrast, a larger set of participants could provide robust *eventual* censorship resistance for all transactions. 

Since the execution-proposing rights market will likely be concentrated, I believe the community should not rely on execution proposers to prevent complicated problems like multi-slot MEV. The protocol should be designed to uphold what the community considers fence-breaking without relying on execution proposers. However, before the protocol has built-in ways to prevent manipulation, curating an execution proposer set that does not break these fences may be worthwhile. Therefore, I think having built-in ways to avoid manipulations, like multi-slot MEV, is essential before moving to more sophisticated execution proposers.

The execution proposer requirements of **No Downtime** and **Performant Machine** can be imposed by using, for example, missed slot penalties and by requiring execution proposers to do a lot of computation, respectively. While there are clear advantages to these two requirements, it is difficult to reason about what exactly to expect from execution proposers. I.e., do we expect execution proposers to have 10x the hardware requirements validators currently have or 100x? What orders of magnitude must we consider here, and what are the trade-offs?

The execution proposer requirement of **Efficiency** can be gained by designing robust transaction fee mechanisms that allow execution proposers to compete on efficiency. Currently, execution proposers compete on extracted value. As transaction fee mechanisms become more expressive and the amount of MEV as a share of total value declines, execution proposers may be forced to compete on packing efficiently. Efficiency, which is how much output is obtained from fixed inputs, is orthogonal to how performant machines, the inputs, are. So efficiency is out-of-scope of this post.

There may be two ways to find out what the minimum hardware requirements should be for execution proposers:

1. Target a certain amount of execution proposers to obtain a more competitive market. By increasing the hardware requirements, the market may become less competitive. Since builders already have performant hardware, relatively high requirements would not impact market competition. However, asking a lot may increase barriers to entry.
2. Decide what the community expects from execution proposers and determine the hardware requirements. For example, if the community expects execution proposers to have 128 blobs available, the bandwidth requirement should be set accordingly.

Reasoning about the requirements for execution proposers is complex and is also a second step. First, the community must decide whether it is acceptable to endow a different set of service providers with the execution proposing rights.

## Selecting Execution Proposers

If the community decides that not all validators should be expected to be execution proposers, the next question is how Ethereum should select its execution proposers. In the following, we discuss two potential ways to do so. Thanks to Francesco for mentioning the first method.

## Overloading MEV-Boost

After FOCIL is implemented and Ethereum no longer relies on execution proposers for censorship resistance, it could quickly move to sophisticated execution proposers by simply increasing the expectations in terms of bandwidth and computing for execution proposers. This has the following consequences:

1. Any validator that is still able to build blocks themselves can continue doing so.
2. Any validator that does not is expected to outsource its block construction duties to a sophisticated execution proposer, for example, via MEV-Boost. 

The advantage of this method is that it does not require the implementation of an execution proposer selection mechanism in the core protocol. Yet, the community can still enjoy the advantages of more bandwidth and computing.

The disadvantage is that low-performance validators must now trust relays or builders to pay validators for the right to construct their execution payload. This trust assumption is likely weak since a builder would destroy its valuable reputation if it did not pay a single validator when it should. Therefore, a validator can trust it receives its payment, not based on a trustless fair exchange but because a builder stakes its reputation.

Finally, this method of selecting execution proposers does not address potential multi-slot MEV issues. Although [no multi-slot MEV extraction is currently observed](https://ethresear.ch/t/does-multi-block-mev-exist-analysis-of-2-years-of-mev-data/20345), it is possible. Validators [know at least one epoch in advance](https://eth2book.info/capella/part2/building_blocks/randomness/) when they must propose a block. Therefore, a coalition of validators could extract multi-slot MEV if they sell their slots simultaneously before the just-in-time MEV-Boost auction. MEV-Boost does not prevent such a deviation; hence, multi-slot MEV is possible.

### Attester-Proposer Separation

APS is a line of research that aims to find an execution proposer leader election mechanism from first principles. APS would be an in-protocol change that separates the execution proposer duties from the other duties validators have.

Although there have been [many proposed implementations of APS](https://www.notion.so/Attester-Proposer-Separation-Tracker-15bd9895554180c2ac75cb40878ecd33?pvs=21), there is very little consensus amongst ecosystem participants about what implementation is desirable. There is clearly a lot more work to do, such as formalizing the APS desiderata, understanding the mechanism design space, and comparing different proposed implementations.

An advantage of APS is that it could deal with potential multi-slot MEV issues from a first principles approach. This will improve the status quo, which primarily relies on beacon proposers being unsophisticated or large validators not wanting to get involved with such behavior.

A disadvantage of APS is that it is still in the research phase and may have a long way to go before the community can agree on an implementation. Even when there is a proposed implementation, it would need to be implemented via a hard fork, which also takes more time.

## Conclusion

This post investigates whether Ethereum should unbundle the role of execution proposer from the other validator duties. The post takes a practical and short-run stance, as opposed to more first principles work that has highlighted the same concept before. We analyze the functional role of an execution proposer to find out what it currently takes to be an execution proposer and what Ethereum may expect from execution proposers. Finally, we briefly touch on two ways to implement sophisticated execution proposers in protocol.

The goal of this post is to spark a community discussion about whether community members would be comfortable with more sophisticated execution proposers and, if so, what may be expected from them.