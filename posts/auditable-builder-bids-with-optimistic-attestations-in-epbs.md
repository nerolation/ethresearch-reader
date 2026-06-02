*Thanks to [Potuz](https://x.com/potuz_eth) for the idea that attesters of slot $n$ should directly invalidate also the beacon block if an incorrect auditable builder bid is selected by the proposer. Thanks to [Francesco](https://x.com/fradamt) for guidance on consensus issues and to [Terence](https://x.com/terencechain) for feedback.*

## Background

Enshrined proposer–builder separation ([ePBS](https://hackmd.io/@potuz/rJ9GCnT1C)), specified in [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732), is a proposed update to Ethereum that facilitates trustless interaction between builder and beacon proposer. After the move to peer data availability sampling ([PeerDAS](https://eips.ethereum.org/EIPS/eip-7594)) in Fusaka, an ePBS proposer that does not subscribe to all blob column subnets (i.e., a smaller validator) could erroneously believe that the data is available and extend on top of the wrong head. If [FOCIL](https://eips.ethereum.org/EIPS/eip-7805) is implemented, the proposer in slot $n+1$ will likewise need to make a decision on the timeliness of ILs in slot $n-1$, which is subjective. The proposer would therefore benefit from attestations confirming that the payload satisfies the timely ILs.

Francesco has [outlined](https://hackmd.io/UX7Vhsv8RTy8I49Uxez3Ng) a way to address these issues. The payload timeliness committee ([PTC](https://ethresear.ch/t/payload-timeliness-committee-ptc-an-epbs-design/16054)) is required to also check for DA (according to members' subscribed columns) and timeliness of the ILs. The PTC thus becomes an availability committee (AC). The AC is scheduled to vote right after the payload is released. It is therefore desirable to not require voters to execute the payload, but this precludes them from assessing whether the ILs were fully adhered to. Francesco's proposed [solution](https://hackmd.io/UX7Vhsv8RTy8I49Uxez3Ng#IL-enforcement) is that builders declare in the payload which ILs it is based on, and that the AC votes on whether this commitment aligns with their view of required ILs. Thus, the proposer gets an optimistic signal on the timeliness of the ILs.

A recent proposal for an encrypted mempool, [Sealed transactions](https://ethresear.ch/t/sealed-transactions/21859), relies on a similar view-merge scheme as FOCIL, requiring a subjective assessment of timeliness. Specifically, sealed transactions (STs) are included in the beacon block of slot $n-1$. The unsealed transactions (UTs) are then trustlessly revealed before a deadline observed by attesters, and finally included in the payload of slot $n$. The current ePBS design requires a [one-slot delay](https://x.com/potuz_eth/status/1896599292854571134) until attesters can confirm that all timely UTs were included in the block. Such a delay also applies to ILs, where the AC as previously mentioned is recruited for providing an early signal in between attestations of slot $n$ and slot $n+1$. The AC could of course be recruited for the UTs as well, yet there is still a delay (and still a full slot's delay until the fork-choice gets involved), and the AC vote would also become rather overloaded. Would it be possible to recruit slot $n$ attesters for casting an optimistic vote on both ILs and UTs instead, already before the block is revealed? That would drastically speed up the process by which the payload passes subjective criteria. It also narrows the scope of the AC, with censorship resistance instead ensured by the full attester set (of the slot), and the AC better able to adapt to its remaining tasks.

## Proposed mechanism

Inspired by Francesco's earlier work, this post proposes that builders produce auditable builder bids (ABBs), declaring *already in their bid* which ILs and UTs the payload will adhere to. This will not reveal critical information pertaining to MEV, because IL and UT adherence is a strict requirement anyway. With ABBs, the *attesters* of slot $n$ can vote optimistically on whether execution block $n$ adhered to timely ILs and UTs or not, even before the payload is released. This has three benefits:

* A critical task of the consensus mechanism is to ensure censorship resistance. When the AC adjudicates timeliness, it has the power to invalidate any non-censoring IL—a power that would ideally only reside with the full attester set (see also the discussion).
* Not only will attesters directly assess timeliness, they will also cast their vote (related to timing) one slot earlier, 12 seconds faster than with the current tentative ePBS design. A node that determines a new payload to be valid 5 seconds into slot $n$ can account for the optimistic attestations of slot-$n$ attesters for direct assurance that the payload also passed associated subjective timing-related criteria. 
* The AC will focus on a more narrow scope, which opens up the design space and allows it to adapt to the specific tasks (it does not become "overloaded").

Figure 1 illustrates ABBs with optimistic attestations in ePBS, wherein IL and UT bitfields are added to the header of execution block $n$. Attesters of slot $n$ vote on this expanded header before the payload is propagated.

![Figure 1|665x500](images/q6mu276BQX4u8un4MozBG8ROIV9.png)

**Figure 1.** Attesters (purple) observe ILs and UTs at $T_1$ and then review the ABB at $T_2$ that specifies which of the ILs and UTs that will be accounted for in the payload. They vote for the block optimistically at $T_3$ if their observations at $T_1$ align with the ABB specification.

The mechanism proceeds as follows:

* **Before $T_1$** – ILs and UTs are broadcast and propagated p2p.
* **$T_1$** – Attesters of slot $n$ freeze their view of propagated ILs and UTs.
* **After $T_1$** – Once builders are confident they have observed all relevant UTs and ILs (those in the frozen view of most attesters), they cast ABBs for the right to build the block (colored rectangles). The `ExecutionPayloadHeader` is expanded with an IL bitfield, where builders declare the includers whose ILs the payload adheres to, and a UT bitfield declaring STs whose corresponding UTs will be included. Just as in [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732), the `ExecutionPayloadHeader` object should also be changed to include only the minimum information needed to commit to a builder’s payload.
* **$T_2$** – At the start of slot $n$, the proposer selects a winning ABB, which is at least as encompassing as its own view of required ILs and UTs, and includes that ABB in the beacon block.
* **$T_3$** – Attesters of slot $n$ cast a vote on the current head of the chain. If the beacon block is missing or if the included ABB fails their audit due to a missing IL or UT, they indicate the preceding block that is the head of the chain in their current view. If the ABB passes their audit, they optimistically attest to the block. These votes will still count toward both a full and empty block $n$ in the fork-choice, given that the payload has not yet been released.
* **$T_4$** – When the builder is confident that the beacon block will become canonical after reviewing propagated attestations, it releases the payload.
* **After $T_4$** – After the payload is released, it can be audited to ensure that it follows the stipulation of the ABB. All information required to determine IL and UT adherence is thus available from $T_4$ (adherence upon execution checked locally and slot $n$ attestations still propagating). This information will naturally be used by the proposer and attesters of slot $n+1$, but it can also be used directly at this point by any node tracking the chain. When combined with checks on DA and timeliness of the payload, the likelihood of a payload becoming canonical can be assessed with high accuracy.

#### Proposer processing

The proposer of slot $n+1$ runs the following checks:

* the payload is valid,
* the payload satisfies the ABB after executing the txs,
* blob data is available, and the payload is timely (as per AC votes).

If these checks pass, the proposer can extend on block $n$. It selects its branch from the subtree with the most attestation weight as normal, accounting also for all attestations in slot $n$. As in [previous](https://hackmd.io/UX7Vhsv8RTy8I49Uxez3Ng#Fork-choice) designs of ePBS, slot $n$ attestations count both towards the full and empty block, given that the payload has not yet been released. 

#### Payment processing

Payment processing follows the general [structure](https://hackmd.io/UX7Vhsv8RTy8I49Uxez3Ng?view#Payment-processing) previously outlined by Francesco:

* If the payload becomes canonical, payment is processed (happy case).
* If the payload does not become canonical, payment is still processed if at least 60% of slot $n$ attesters voted for the block and no equivocations by the proposer are detected by the end of the subsequent epoch.

#### Attesters of slot $n+1$

Attesters of slot $n+1$ do not freeze their view at the freeze deadline imposed on attesters of slot $n$ (around 9s into slot $n-1$), and keep reviewing incoming ILs, just as the proposer of slot $n$. They stop tracking ILs and listening for equivocations at $T_3$. The rules for attesters of slot $n+1$ apply also to potential future attesters in the case of a missed slot, which is also the case in the previous version that relies on the AC. It is possible to adjust deadlines for these attesters if desirable.

#### IL equivocation

If an includer equivocates, its ILs should have no influence, regardless of whether the proposer stipulates adherence to the includer or not. This means that attesters of slot $n+1$ should ignore equivocated ILs and accept a payload not adhering to them, even if the builder stipulated that it would adhere in its ABB.

In regular FOCIL, a proposer that errored by not adhering to an IL can be saved by a subsequent equivocation of that IL, and the release of such an equivocating IL may split the attester set. The same phenomenon carries over to ABBs. A peculiar version is when the builder in its ABB stipulates adherence to an IL, but its payload actually does not adhere, yet an includer equivocates after the beacon block is released, saving the builder. This should presumably not be a concern.

## Discussion

With ABBs, the full attester set ensures censorship resistance (by voting on ILs) as well as the correct processing of Sealed transactions. In the version relying on the AC, honest attesters must adhere to the AC vote as it pertains to timeliness of the ILs. As a result, the builder can collude with the (smaller) AC to stipulate that it did not adhere to a set of ILs, with the AC confirming that this is the correct choice because the ILs ostensibly were late (the AC has full authority to adjudicate timeliness). The honest attesters of slot $n+1$ will then have no choice but to accept a payload even if they observed timely ILs being ignored, given that they should defer to the AC vote on timeliness. Practically speaking, the AC thus controls censorship resistance (assuming co-ordination with builders), a control that is removed with ABBs. 

At the same time, the majority threshold used by attesters of the AC indeed influences the fork-choice in a different way than the votes cast by slot-$n$ attesters. If this type of majority-threshold filter is considered desirable, the slot-$n+1$ proposer and attesters could as an alternative be directed to majority-threshold slot-$n$ attestations for the purpose of determining timeliness.

What remains of the AC's role is to cast votes on the timeliness of the payload and on DA. A future post will explore how the ACs role could evolve further, given these new relaxed constraints. An additional benefit is that includers of slot $n$ gain early information about which txs the payload of slot $n$ will adhere to. These are txs that includers should not list (if the payload is timely).

In regular MEV-boost, the relay is a trusted party that ensures the validity of builder blocks forwarded as bids. Under FOCIL, this validity check turns into a subjective decision, hinging on the timeliness of ILs. It is possible that some validators would prefer to perform this subjective check on their own, and ABBs could therefore be implemented also in MEV-boost (without ePBS). This would improve trustlessness of the current MEV-boost design and lay the groundwork for ABBs in ePBS.

A separate note can be made regarding how to deal with sealed transactions during empty blocks in ePBS. Just as [in the original design](https://ethresear.ch/t/sealed-transactions/21859#p-53128-mechanics-during-missed-slots-8), an ST included in Block A must guarantee that the corresponding timely UT is included top-of-block in the payload of the subsequent Block B, even if the first block proposed after Block A fails to become canonical. However, since blocks can be empty in ePBS, a series of empty blocks could produce a large backlog of STs not yet fulfilled by UTs. As a consequence, it can be desirable to stop beacon proposers from including new STs once it is clear that there is a backlog. 

The [suggested approach](https://github.com/potuz/consensus-specs/pull/1/files) for the previous *forward ILs* in ePBS was to address a potential backlog by preventing the proposer in slot $n+1$ from providing a forward IL, if the payload of slot $n$ is missing (h/t Potuz). This allows the payload of slot: $n+1$ to satisfy $n-1$; $n+2$ to satisfy $n$; and $n+3$ to satisfy $n+2$ (thus finally catching up). For sealed transactions, such an approach could however lead a transactor with an ST included in slot $n$ to reveal the UT before the payload of slot $n+1$ is constructed (which it would not be included in). A solution for an empty block $n$ is therefore to specify that STs from both slots $n-1$ and $n$ must be adhered to with UTs in slot $n+1$, while also preventing the proposer of slot $n+1$ from including new STs, such that the backlog does not continue to grow.

Note that regardless of the design selected, if UTs from more than one block of STs are to be included, the UTs associated with the same ST set from a specific beacon block must be grouped in the payload, with the group associated with the earliest beacon block positioned top-of-block, etc. The order of UTs *within* each group should however still follow the revealed top-of-block fee.