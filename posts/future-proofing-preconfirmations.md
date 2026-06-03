**How upcoming EIPs affect preconfirmations**

*By [Aikaterini-Panagiota Stouka](https://x.com/AikPStouka) and [Conor McMenamin](https://x.com/ConorMcMenamin9), both Nethermind.*

*This article was completed thanks to funding from the [PBS Foundation.](https://pbs.foundation/) Thanks to [Lin Oshitani](https://x.com/linoscope) and [Davide Rezzoli](https://x.com/0xseiryu) for their helpful reviews and comments. Views are those of the authors.*

# **Introduction**

Preconfirmations are a specific type of commitment from block proposers and builders that give users assurances about their transaction inclusion/execution before the proposer or builder publishes a completed block for finalization. However, most preconfirmation protocols have been designed and analysed with the Ethereum’s current design in mind. Thanks to Ethereum Improvement Proposals (EIPs*), Ethereum is always changing and upgrading. Some of these EIPs directly affect the compatibility of preconfirmation protocols, either by design or as a side-effect. 

This article looks at some of the most impactful EIPs from preconfirmations’ perspective, and examines how these EIPs will affect preconfirmations, and what amendments, if any, can be adopted by preconfirmation protocols to stay compatible if/when these EIPs get included on Ethereum. These EIPs seek to modify how L1 block proposers are selected, hide the [proposer lookahead](https://hackmd.io/@mikeneuder/ethereum-proposer-lookahead), distribute [block proposal responsibilities across multiple entities](https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777), or introduce new entities who contribute to block content and censorship resistance. This report analyzes how these EIPs are likely to affect preconfirmations, based on the most plausible EIP designs at the time of writing.

### Summary of Analysis

![image|598x500, 75%](images/uYgTNXl8rPaXRKRROKuU56DGiCu.jpeg)

![image|454x500, 100%](images/lV2BXbI1V7HIe3eEclkbR7Zz5ZU.jpeg)

## **Outline of the Article**

In the **Preliminaries** section, we present;

1. The types of preconfirmations, categorised based on:
    1. Which layer the transactions correspond to (L1 or L2)
    2. The nature of the guarantees that the preconfirmations provide (inclusion or execution)
2. Key preconfirmation protocol features in the current designs:
    1. Punishments when the preconfer deviates.
    2. Rewards/Tips that compensate the preconfer.

In the **Framework for Analysing Each EIP** section, we introduce the framework used to assess whether and how existing preconfirmation designs are affected by the proposals and EIPs.

Subsequently, each of the following sections examines a specific EIP. The EIPs we analyse are: 

1. Inclusion lists. Specifically:
    1. [Fork-Choice enforced Inclusion Lists](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870) (FOCIL)
    2. [An Auction-Based Inclusion List Design for Enhanced Censorship Resistance on Ethereum](https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422) (AUCIL)
2. [Multiple Concurrent Proposers](https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777) (MCP)
3. [Single Secret Leader Election](https://eprint.iacr.org/2020/025.pdf) (SSLE),
4. [Attester Proposer Separation](https://www.youtube.com/watch?v=5OOzMqCOoKM) (APS)
5. [Enshrined Proposer-Builder Separation](https://eips.ethereum.org/EIPS/eip-7732) (ePBS).

# **Preliminaries**

## **Types of preconfirmations**

There are several types of preconfirmations possible, depending on the blockchain layer on which the transactions occur, and the nature of the guarantees the preconfirmations provide.

The preconfirmation types based on blockchain layer are the following:

1. Preconfirmations for L1 transactions; we will denote them as **L1 preconfirmations**.
2. Preconfirmations for L2 transactions in [based](https://ethresear.ch/t/based-rollups-superpowers-from-l1-sequencing/15016) L2s; L2 blockchain protocols where the L2 transaction ordering is determined by the L1. Within this classification, there are two important distinctions:
    1. All L1 proposers are L2 proposers. For the analysis being performed in this article, these preconfirmations are indistinguishable from L1 preconfirmations. For this reason, and ease of notation, we include analysis of L2 based preconfirmations where all L1 proposers are L2 proposers in the analysis of L1 preconfirmations.
    2. A subset of L1 proposers are L2 proposers. In this setting, an L2 proposer may hold the exclusive right to propose L2 blocks for more than one L1 slot. We will denote these preconfirmations as **based L2 preconfirmations**. As mentioned in the previous point, 2.a, this excludes the one exception where all L1 proposers are L2 proposers, which are being categorized as L1 preconfirmations for the purpose of this article. 
3. Preconfirmations for L2 transactions in non-based L2s (e.g. [Arbitrum](https://arbitrum.io/rollup), OP, Polygon Layer 2 blockchain protocols where transaction ordering is handled by a rollup-controlled sequencer set). Since, in this type of preconfirmation, transaction ordering does not depend on L1 proposers, we do not expect the EIPs we discuss to meaningfully impact this type of preconfirmations.

The types based on the nature of the execution guarantee are the following:

1. **Inclusion Preconfirmations**: These guarantee that a transaction will be included in a future block.
2. **Execution Preconfirmations**: These guarantee that a transaction will be included in a specific order in a specific slot.

**Note:** We only analyse preconfirmations offered by a designated proposer, including inclusion list proposers/creators where relevant, or an entity who has been delegated exclusive proposal rights. We omit any analysis of preconfirmations from entities not controlling proposal rights. This is to ensure a focused analysis on the main forms of preconfirmations expected to be offered on L1 and L2. [Non-proposer](https://docs.primev.xyz/v1.1.0/get-started/welcome-to-primev) and probabilistic preconfirmations from entities not guaranteed to propose a block/inclusion list that must be obeyed are possible, but are beyond the scope of this article.

**Note:** For inclusion preconfirmations, it is possible that many designated proposers acting as preconfers may offer a preconfirmation for the same transaction. Compatibility and effectiveness of tips will depend on how competing inclusion preconfirmations are handled. Generally speaking, inclusion preconfers must accept this risk when offering preconfirmations. This risk becomes higher when there are multiple preconfers for the same slot (as in the inclusion list and multiple concurrent proposer EIPs). These risks can be mitigated through an intermediary that records all preconfirmation requests and responses, or through a dedicated preconfirmation platform for paying tips.

In the remainder of the article, an entity offering preconfirmations will be referred to as a preconfer. 

## **Characteristics of preconfirmations in the current Ethereum design**

To examine how various EIPs might impact preconfirmation designs, our analysis examines how two critical preconfirmation protocol mechanisms are likely to be affected by the respective EIPs. These are punishment and rewarding mechanisms. [As was highlighted in a previous PBSF grant article](https://ethresear.ch/t/preconfirmation-fair-exchange/21891), preconfirmations critically depend on incentives for proposers to provide and eventually confirm preconfirmations. By demonstrating the effects of each EIP on existing preconfirmation punishment and reward mechanisms, we are able to identify preconfirmation incompatilities, or in most cases, changes to preconfirmation protocols and/or underlying blockchain features that are required to properly enable punishment and reward mechanisms, and thus preconfirmations themselves. 

### **Punishments**

All preconfirmation designs depend on some form of punishment and/or enforcement mechanism to disincentivise preconfers from reneging or delaying the issuance of preconfirmations. For the purpose of our analysis, we will group these punishments based on the entity that is enforcing the punishment, inspired by [the framework introduced here](https://ethresear.ch/t/preconfirmation-fair-exchange/21891).

1. Smart-Contract: In all preconfirmation designs, a smart contract can be used to enforce conditions involving objective-only misbehaviour. Some examples include safety violations, where the preconfer disrupts the preconfirmed order of transactions, and liveness violations, where the preconfer excludes preconfirmed transactions (cf. slashing conditions in [a preconfer registry](https://eth-fabric.github.io/website/development/l1-components/urc)).
2. Overseer ([proposed here](https://ethresear.ch/t/preconfirmation-fair-exchange/21891)): an entity with special authority to enforce certain behaviours or punishments on preconfers. Overseers were originally introduced to enable *fair exchange* of preconfirmation requests and responses, but more generally, they can be used to enforce both objective and subjective preconfirmation requirements. Punishments from an overseer can include:
    1. Slashing. The overseer may be able to arbitrarily impose slashing conditions on preconfer collateral.
    2. Blacklisting. The overseer can maintain a list of all deviant preconfers and prevent them from acting as preconfers for a specific period.
    3. Orderflow loss. The overseer can reduce or stop the order flow (preconfirmation requests) for a deviant preconfer through one of the following methods:
        1. Preconfirmations must be signed by both the preconfer and the overseer, allowing the overseer to stop signing preconfirmations for deviant preconfers.
        2. Signaling. The overseer can signal that the preconfer is deviant, prompting users to stop sending preconfirmation requests for that preconfer.
3. User: Users can stop sending preconfirmation requests to a deviant preconfer, either for the current slot or for future slots. This will be referred to as orderflow loss, which can be either short or long term.

### **Rewards/Tips**

Preconfers are expected to be rewarded after issuing preconfirmations. Tips can be paid to preconfers through normal transaction fees, or managed and distributed by an overseer or a dedicated smart contract. Our analysis focuses on how we expect the tip payment mechanism and/or total tip amounts to change under each EIP.

# **Framework for Analysing each EIP**

We examine each EIP discussed in the Introduction using the following framework:

1. We provide an overview of the EIP, focusing on the aspects most relevant to preconfirmations.
2. For each preconfirmation type or group of types (with one group per subsection), we discuss:
    1. Compatibility: If compatibility issues arise, we explore potential amendments to ensure alignment.
    2. Changes in the effectiveness of punishments and tips resulting from the EIP.
    

For APS, we adopt a different framework due to the existence of several candidate designs, each affecting the compatibility of different preconfirmation types in distinct ways. This is explained in more detail in Section 4, which covers APS.

# **Section 1. Inclusion Lists**

The first EIPs we examine are protocols that allow multiple proposer-like entities to contribute inputs to block construction through the construction of inclusion lists, with one designated proposer responsible for determining the transaction ordering. These protocols aim to enhance censorship resistance in Ethereum. Two prominent examples are [Fork-Choice enforced Inclusion Lists](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870) (FOCIL)(cf. [here](https://eips.ethereum.org/EIPS/eip-7805) for the EIP) and [An Auction-Based Inclusion List Design for Enhanced Censorship Resistance on Ethereum](https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422) (AUCIL) (cf. [here](https://eprint.iacr.org/2025/194) for the preprint version).

## **1.1. Overview of FOCIL and AUCIL**

Both protocols utilize a committee of randomly selected entities called includers to create inclusion lists of transactions.

**FOCIL**

The block proposer creates their block and, if there is space, they must include all valid transactions from the inclusion lists. If they fail to do so, attesters can reject their block. In [the current design](https://eips.ethereum.org/EIPS/eip-7805), users do not pay any fees to the includers. We refer to this core design as *conditional inclusion lists* with *no includer fees*. The key variations of this core protocol involve:

- **Unconditional inclusion lists**: The block proposer is required to include all valid transactions from all includers' inclusion lists, even when there is congestion (i.e., not enough space to accommodate all the transactions in the mempool). The transaction ordering is determined by the block proposer.
- **Includer fees**: Users pay an additional fee to the committee if their transaction is included in both a block and an inclusion list (cf. [here](https://arxiv.org/abs/2505.13751)).

**AUCIL**

AUCIL is another protocol that aims to enhance censorship resistance of Ethereum through **unconditional inclusion lists** (cf. [here](https://eprint.iacr.org/2025/194) page 3, 15). The main additions of AUCIL are that (i) there is a correlated equilibrium approach that provides an incentive for includers to create ILs in a specific way, and (ii) there is an auction-based IL aggregation: aggregators aggregate ILs and submit bids, and the block proposer chooses the largest aggregated list. If the block proposer does not satisfy specific requirements regarding how many inclusion lists were included in the aggregated list ([detailed here](https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422#p-49946-aggregation-of-input-lists-9)), the proposer’s block is rejected by the attesters. These additions are (i) agnostic to ordering and whether the proposer can add transactions of themselves or not (ii) could allow for more ILs as we do not need the guarantee that all ILs must be available to one aggregator. For the purpose of this article, we consider that ordering is performed by the block proposer and the block proposer is able to add more transactions (this is the same as unconditional FOCIL). 

## **1.2. Preconfirmation Analysis**

We organise the following analysis into groups of preconfirmation types that share similar characteristics in terms of their compatibility with the existing preconfirmation design, as well as the changes in the effectiveness of associated punishments and tips. The groupings are as follows:

- Inclusion preconfirmations.
- L1 execution preconfirmations.
- Based L2 execution preconfirmations.

### **1.2.a. Inclusion preconfirmations**

With inclusion lists there are two distinct actors who can potentially offer preconfirmations: the block proposers and the includers. We therefore discuss compatibility separately for each actor.

**Compatibility: Block proposer preconfirmations**

With conditional inclusion lists in FOCIL:

- Block proposers can still include all preconfirmations in their blocks (as they are only required to respect inclusion lists when space is available)
- The block proposer election process remains unchanged. Therefore, we do not anticipate any compatibility issues with existing preconfirmation designs.

In the case of unconditional inclusion lists as in FOCIL and AUCIL, if the combined inclusion lists are known to occupy less space than the total block space, we again do not anticipate any compatibility issues. In this case, the block proposer may still issue preconfirmations for the remaining block space. 

Proposers may issue preconfirmations that exceed the available space in their own blocks, anticipating that earlier L1 proposers will utilise available block space to include these preconfirmations on the preconfer’s behalf. As inclusion lists are expected to enhance censorship resistance, this makes it more viable and less risky to offer preconfirmations exceeding the space in a preconfer’s own block. 

**Compatibility: Includer preconfirmations**

With unconditional inclusion lists in FOCIL, the includers may also issue inclusion preconfirmations. Assuming that FOCIL works as intended (e.g. $2/3$ of the attestors are honest and the block proposer aims to produce a valid block), preconfirmations from includers have the same benefits as preconfirmations from the block proposer.

With AUCIL, preconfirmations issued by includers are riskier, because as we already mentioned, AUCIL allows for the case that an inclusion list is not available to all the aggregators. To have the same preconfirmation guarantees as FOCIL, we would need in the AUCIL design that the block proposer is penalised even if they omit a single IL.

This ability for unconditional inclusion list includers to offer preconfirmations has a notable drawback: preconfirmations occupy space in the inclusion lists, which are primarily intended for transactions that are vulnerable to censorship. This drawback has been termed “crowding” and has been discussed [here](https://ethresear.ch/t/uncrowdable-inclusion-lists-the-tension-between-chain-neutrality-preconfirmations-and-proposer-commitments/19372), [here](https://a16zcrypto.com/posts/article/ethereum-roadmap-focil-and-multi-proposers/). 

For conditional FOCIL, we do not expect the includers to issue preconfirmations, because the block proposer can omit the ILs when the block is full without their block being rejected by the attesters. Also, in the next slot, new includers will be elected, and the block proposer of the next slot is not obligated to include transactions from the ILs that were issued for previous blocks. ([The only ILs that need to be obeyed for slot N+1 are those propagated between second 0 and 9 of slot N.](https://eips.ethereum.org/EIPS/eip-7805)). 

**Effectiveness of punishment and tips**

Conditional inclusion lists should not impact the effectiveness of punishment mechanisms, as the preconfers remain the same entities, elected in the same manner and with the same frequency.

In the case of unconditional FOCIL and AUCIL, from the perspective of the block proposer, we only expect punishment mechanisms related to future preconfirmation tips to be effected, that is, the punishments of blacklisting and order flow loss.

As unconditional inclusion lists must consume a portion of block space, the block proposer has less room available for preconfirmations. This will affect preconfirmation tips and, by extension, the effectiveness of blacklisting and long-term order flow penalties. At this point, it is difficult to predict the exact effect of unconditional inclusion lists on tips, but we see at least two key counteracting forces:

- Unconditional inclusion lists reduce the capacity for preconfirmations, and as such the number of preconfirmations to collect tips from.
- Average per-preconfirmation tips should increase due to the reduced supply of block-space and the higher demand for the available space this creates.

In the case of includers acting as preconfers, the effectiveness of blacklisting and order flow loss will be directly related to the value of the inclusion list preconfirmation market. As with proposer preconfirmations, frequency of election, size of inclusion list, and how far in advance of a slot preconfirmations can be offered all impact an includer’s preconfirmation revenue. However, the main driver of this value will come from user demand. In absence of a high-value preconfirmation market, slashing remains a viable punishment mechanism.

As mentioned in the Types of Preconfirmations section, many includers acting as inclusion preconfers for the same slot increases the risk of conflicting inclusion preconfirmations, which may bring settlement and tip risk for the preconfers.

### **1.2.b. L1 execution preconfirmations**

**Compatibility**

In this case, preconfirmations can only be issued by the proposer of slot $N$ during slot $N$. Additionally, in both conditional and unconditional inclusion lists, the block proposer retains control over ordering of a block. This ensures that once the block for slot $N-1$ has been published, the block proposer for slot $N$ is fully aware of the relevant L1 or L2 state that must be respected when issuing execution preconfirmations. Thus, we do not expect any compatibility issues with these types of preconfirmations, except for the fact that in unconditional inclusion lists, the block proposer should only issue preconfirmations for the blockspace that is unoccupied for inclusion lists.

For execution preconfirmations, includers cannot act as preconfers, as they do not control the order of transactions in the L1 or L2 blocks.

**Effectiveness of punishment and tips**

The effectiveness of punishments and tips for these preconfirmations is similar to those of inclusion preconfirmations from the perspective of the block proposer.

As includers cannot offer execution preconfs, their analysis is not relevant for this section.

### **1.2.c. Based L2 execution preconfirmations**

**Compatibility**

There are no compatibility issues. Based L2 execution preconfers can offer preconfirmations as soon as their preconfirmation slot begins. It is not possible for includers, whether unconditional or conditional, to offer based L2 execution preconfirmations solely by being includers. If an includer happens to be registered as an L2 proposer, the includer can only offer based L2 execution preconfirmations if the includer is also the active execution preconfer i.e. it is that includer’s preconfirmation slot. Otherwise, if it is someone else’s preconfirmation slot, that someone else has exclusive rights to propose L2 blocks, thus invalidating any L2 blocks proposed by the includer. 

**Effectiveness of punishment and tips**

In unconditional inclusion lists, preconfers have less available blockspace. If this reduction affects the expected rewards from preconfirmations per slot, then blacklisting and long-term order flow will also be impacted, as discussed in Section 1.2.a.

Apart from this, we do not expect significant changes in the effectiveness of punishments and tips, as preconfers are elected in the same manner and with the same frequency with or without inclusion lists.

# **Section 2. Multiple Concurrent Proposers (MCP)**

## **2.1. Overview of MCP**

In [MCP](https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777) two or more entities propose a partial block payload for the current slot (we denote these partial payloads as sub-blocks). The final block’s payload is formed by taking the union of the transactions from all these sub-blocks, ordered according to some deterministic ordering rule. This exact rule is up for debate, but [priority fee ordering has been considered](https://www.paradigm.xyz/2024/06/priority-is-all-you-need). [BRAID](https://www.youtube.com/watch?v=mJLERWmQ2uw) is an example of an MCP protocol.

## **2.2. Preconfirmation Analysis**

We split the preconfirmation analysis of this section according to:

- Inclusion preconfirmations.
- Execution preconfirmations.

### **2.2.a. Inclusion preconfirmations**

**Compatibility**

Assuming that the union of sub-blocks is no larger than the final block, proposers can act as inclusion preconfers, since the final block includes all the transactions from all the sub-blocks (discussed also [here](https://publish.obsidian.md/netbound/Multiple+Concurrent+Proposers%2C+FOCIL+and+Preconfirmations), [here](https://simbro.medium.com/proposer-commitment-infrastructure-in-ethereum-61ad3b31f05f), [here](https://www.notion.so/5ae079060efd4a3395f86a3af53c0572?pvs=21)). 

**Effectiveness of punishments and tips**

As mentioned in Section 1, the effectiveness of blacklisting and long term orderflow loss depends on the expected tips from preconfirmations per epoch. The higher the tips, the more effective these penalties are. While proposers should be elected more frequently in MCP compared to a single-proposer protocol, the size of sub-blocks should be directly proportional to the inverse of the number of proposers in order to maintain network bandwidth utilization. In other words, the total available space for preconfirmations should remain the same in MCP and a single-proposer setup. If this is the case, we do not expect a change in inclusion preconf tips in MCP. 

As mentioned in the Types of Preconfirmations section, many MCP proposers acting as inclusion preconfers for the same slot increases the risk of conflicting inclusion preconfirmations, which may bring tip risk for the preconfers. This will depend on:

- How the specific MCP implementation handles duplicate transactions.
- How tips are paid to preconfers when more than one preconfer provides a preconfirmation for the same transaction:
    - only one tip is paid e.g. to the proposer whose block contains the finalized copy of the transactions.
    - all preconfers providing the preconf receive a tip.

### **2.2.b. Execution preconfirmations**

**Compatibility**

This depends on the ordering rule, but generally, an MCP proposer who does not know the final ordering of the merged block cannot offer L1 execution preconfirmations. In an MCP implementation where sub-blocks are given ordering priority ahead of time, the proposer of the first sub-block can offer execution preconfirmations. That being said, such an MCP implementation has not been properly considered at this point, although it bears close resemblance to unconditional FOCIL, with the block proposer having priority to build and order the top-of-block.

For L2 execution preconfs, if a single MCP proposer has exclusive rights to propose an L2 block, then L2 execution preconfirmations are possible. Conversely, if more than one MCP proposer can propose an L2 block, execution preconfirmations are not compatible. 

# **Section 3. Single Secret Leader Election**

## **3.1. Overview of SSLE**

In the existing constructions of [Single Secret Leader Election](https://eprint.iacr.org/2020/025.pdf) (SSLE), a commonality is that the validator schedule for the next epoch is kept hidden; only the elected validator knows the specific slots for which they are assigned as leaders (= proposers), with a single leader per slot. This is designed to enhance Denial of Service (DoS) protection. A concrete description of an SSLE protocol is [Whisk](https://ethresear.ch/t/whisk-a-practical-shuffle-based-ssle-protocol-for-ethereum/11763), presented below.

> [Whisk](https://ethresear.ch/t/whisk-a-practical-shuffle-based-ssle-protocol-for-ethereum/11763), a modified version of a protocol introduced [here](https://eprint.iacr.org/2020/025.pdf), works as follows. Initially, during the bootstrapping period, each validator commits to a long-term random secret. Then, a random subset of validators, selected via RANDAO, is selected to commit to their long-term secret using fresh randomness. These commitments are subsequently shuffled and re-randomised by the leaders of the current time period. From this pool of shuffled validators, a further random subset of one per slot is selected via RANDAO to serve as the slot leaders for the next time period. The assignment method is such that only the validator assigned to a slot (knowing the secret corresponding to the slot) knows the slot assignment. To prove leadership for a given slot, a validator must demonstrate ownership of the corresponding commitment (without revealing their long-term secret). They achieve this by using zero-knowledge proofs to demonstrate that they know the secret embedded in the commitment and that this secret matches their long-term secret, which is cryptographically bound to their identity.
> 

## **3.2. Preconfirmation analysis**

We split the analysis of Section 3 according to:

- Inclusion, and L1 execution preconfirmations.
- Based L2 execution preconfirmations.

### **3.2.a. Inclusion, and L1 execution preconfirmations**

**Compatibility**

In SSLE designs, if the preconfer is willing to reveal their identity beforehand, then we do not expect compatibility issues with existing preconfirmation designs. Of course, this does break secrecy of the election.

On the other hand, if the preconfer prefers to remain anonymous before proposing a block, then the construction of the preconfirmation mechanism requires careful adjustment. We provide a high-level overview of a compatible modified preconfirmation protocol below.

In order for a validator to prove they are an eligible preconfer for slot $N$ while remaining anonymous, the validator must prove the following two statements hold true:

- **The validator is a leader of slot $N$.** 
Using zero knowledge proofs to prove this statement has been discussed also [here](https://ethresear.ch/t/based-preconfirmations/17353) and [here](https://github.com/ethereum/consensus-specs/pull/4190#issuecomment-2752067885). In the specific case of [Whisk](https://ethresear.ch/t/whisk-a-practical-shuffle-based-ssle-protocol-for-ethereum/11763), a validator needs to prove that they know the long-term secret hidden in the commitment associated with slot $N$.
- **If the punishment involves slashing, the validator needs to prove that they are currently registered for slashing e.g. in a [registry contract](https://eth-fabric.github.io/website/development/l1-components/urc).**
One way to achieve this is for the registry smart contract to maintain an append-only Merkle tree containing the public keys of all registered validators, such as exists today in the [universal registry contract](https://eth-fabric.github.io/website/development/l1-components/urc). The preconfer can then provide a proof demonstrating that they possess the private key corresponding to a public key included in this Merkle tree (similar to techniques used in [Zcash](https://zips.z.cash/protocol/protocol.pdf)).
- **If the punishment involves blacklisting, the validator needs to prove that they do not belong to a blacklisted set.**
One way to implement this is for the overseer (or the smart contract) to maintain a set of preconfers who are blacklisted and who are not, and for the preconfer to prove that they are a member of the non-blacklisted set, e.g. using sparse Merkle trees inclusion proofs.

Regarding compatibility of tips, if tips are given immediately to the preconfer, the preconfer would need to reveal an address before their slot, which could potentially expose their identity. Instead, the tips could be paid to a smart contract and released to the preconfer after slot $N$, pending no slashing conditions are met. After slot $N$ passes, the validator's identity becomes public. Therefore, tips and punishments can be applied from that point.

Punishments that are related to reputation imposed by the users are not straightforward to impose while keeping preconfer identities anonymous. It may be possible to enable anonymous reputation tools to allow preconfers to communicate reputation to users. However, given reputation is intended to replace blacklisting and other overseer-related protocols, this would mean each preconfer’s reputation would need to be maintained on a per-user basis which is highly complex and likely unfit for purpose.

**Effectiveness of punishments and tips**

As mentioned in the previous section, SSLE without preconfer identity revelation makes reputation-based punishments highly complex and likely ineffective. Other punishment mechanisms should remain effective, although require careful implementation in line with the implementation discussed in the previous section.

The demand for preconfirmatons under SSLE preconfirmations should be largely unchanged in theory. However, given the additional complexity that SSLE preconfirmations incur, we expect proposers to require higher preconfirmation tips to become preconfers.

Finally, if the election frequency changes and alters the expected rewards from preconfirmations per epoch, the effectiveness of blacklisting or order flow loss will also be impacted, as discussed in the previous sections.

### **3.2.b. Based L2 execution preconfirmations**

**Compatibility**

Recall that this type of preconfirmation can be issued by a preconfer when their preconfirmation slot begins, which can cover one or more L1 slots. Recall that to offer execution preconfirmations earlier than their proposal slot, preconfers need to know the preconfer lookahead. To enable the revelation of the preconfer lookahead (or schedule of preconfers without identities), we need a mechanism that forces/incentivises all preconfers to reveal their slots, in a similar way to that described in Section 3.2.a (by disclosing their identities or by using zero-knowledge proofs to demonstrate that they are eligible preconfers for a specific slot).

**Possible Solution - Utilization of an Overseer:** In L2 systems, an overseer can set a deadline for preconfer revelation. This forces all preconfers to reveal their roles by a fixed deadline, e.g. a few seconds after the validator schedule is determined by the SSLE protocol. After the deadline, the slots with preconfers become fixed, enabling a deterministic preconfer schedule. However, this approach introduces a potential liveness issue where the overseer can reject a preconfer who reveals their role in time. 

To mitigate this and remove a liveness dependency on the overseer, the overseer can be restricted to slashing only, slashing any preconfer who did not reveal their role by a specific deadline. This alternative solution comes with its own drawback: the lookahead is no longer deterministic. If the lookahead is not deterministic, execution preconfirmations for a preconfirmation window of more than one slot are at risk of being invalidated by a proposer who reveals their role as a valid preconfer in an earlier slot in the preconfirmation window. As such, we see the overseer-enforced lookahead solution as a more viable solution for based L2 execution preconfirmations. 

**Effectiveness of punishments and tips**

The effectiveness of tips and punishments is expected to be the same as those discussed [](https://www.notion.so/EXT-Future-Proofing-Preconfirmations-208360fc38d080ffa1bacb4128f2a84f?pvs=21)in the previous subsection for SSLE.

# **Section 4. Attester Proposer Separation (APS)**

## **4.1. Overview of APS**

In [APS](https://www.youtube.com/watch?v=MtvbGuBbNqI), the role of the execution proposer is decoupled from other validator duties, such as attesting. This separation enables more sophisticated execution proposers to participate in Ethereum while also mitigating [incentive spillover](https://docs.google.com/presentation/d/1C4Iykpf-zNqCE1TyWxDzzw_A7n52GaUJz01Hw5v-NPo/edit?usp=sharing) from proposers to attesters, who should remain part of a highly decentralised validator set. Two of the main APS designs are [Execution Auctions](https://ethresear.ch/t/proposers-do-play-dice-introducing-random-execution-auctions-randeas/20938) (EA) and [Execution Tickets](https://ethresear.ch/t/execution-tickets/17944) (ET).

In both designs, the role of execution proposer is assigned to sophisticated competing entities. In EA, proposers are deterministically selected through an auction, whereas in ET, they are randomly chosen via a lottery for for which they previously purchased tickets (cf. [here,](https://ethresear.ch/t/on-block-space-distribution-mechanisms/19764) [here](https://arxiv.org/pdf/2408.03116), [here](https://arxiv.org/pdf/2408.11255), [here](https://docs.google.com/presentation/d/1C4Iykpf-zNqCE1TyWxDzzw_A7n52GaUJz01Hw5v-NPo/edit?usp=sharing)). 

## **4.2. Preconfirmation Analysis**

We structure the following analysis around the two key design aspects of APS described above:

- **When the APS auction is run**. Namely, how far in advance the execution proposer for slot $N$ is elected. Suggestions include:
    - Many slots ahead (e.g. 32 slots).
    - $Dt$ seconds after the block for slot $N-1$ has been proposed (proposal presented [here](https://www.youtube.com/watch?v=5OOzMqCOoKM); the proposal is denoted *2-slots-ahead execution tickets with randomness*). In this design, the execution proposer of slot $N$ is determined via a randomness extracted $Dt$ seconds after the proposal of the block for slot $N-1$.
    - During the slot via a just-in-time auction (JIT).
- **Whether in-protocol reselling of proposal rights is allowed or not,** i.e. if the elected proposer can re-sell their right to propose.

For each type of APS within this design aspect, we outline which types of preconfirmations are and are not compatible. Finally, in the last subsection, we discuss the expected impact of APS on the effectiveness of punishments and tips.

### **4.2.a. Compatibility: When APS auction is run**

As far as compatibility is concerned, the preconfers will be the winners of the respective APS auctions or lotteries. This paves the way for [centralised gateways, who may offer preconfirmations on behalf of validators](https://ethresear.ch/t/becoming-based-a-path-towards-decentralised-sequencing/21733) in the current Ethereum set-up, to remove this middle-man, and become proposers themselves to minimize costs/maximize revenue. As a result, we expect L1 execution proposers and preconfirmers to be more sophisticated under APS, with their selection frequency decoupled from the stake they deposit. 

As discussed [here](https://www.youtube.com/watch?v=5OOzMqCOoKM), in APS designs where RANDAO is the sole source of randomness, there exists a trade-off between a property known as *multi-slot MEV prevention* and *compatibility with preconfirmations*. Multi-slot MEV refers to the phenomenon where being the proposer of multiple consecutive slots yields more MEV than the sum of the MEV available from each slot individually (cf. [here](https://docs.google.com/presentation/d/1C4Iykpf-zNqCE1TyWxDzzw_A7n52GaUJz01Hw5v-NPo/edit?usp=sharing)). The construction presented [here](https://www.youtube.com/watch?v=5OOzMqCOoKM) addresses this trade-off by preventing multi-slot MEV while still supporting certain types of preconfirmations. However, it assumes that the execution proposer for slot $N$ is selected using randomness extracted $Dt$ seconds after the block for the previous slot is proposed. Below, we elaborate on these thoughts:

- In designs where the execution proposer is selected many slots in advance, we expect to see all types of preconfirmations. The disadvantage of these designs is their vulnerability to multi-slot MEV.
- Designs in which execution proposers for slot $N$ are elected $Dt$ seconds after the proposal of block for slot $N-1$ (presented [here](https://www.youtube.com/watch?v=5OOzMqCOoKM)) prevent multi-slot MEV and support only inclusion and executions preconfirmations being issued during the slot itself. Smaller $Dt$ results in more time for and more valuable preconfirmations. The disadvantage of these designs is that they assume a randomness extracted after the proposal of block for slot $N$.
- Designs where the execution proposer elections happens during the slot, e.g. just-in-time auctions, prevent multi-slot MEV because the execution proposer of slot $N$ proposes a payload before knowing the execution proposer for slot $N+1$. However, we do not expect these just-in-time election designs to support any type of proposer preconfirmations.

### **4.2.b. Compatibility: In-protocol reselling of proposal rights**

Designs where the execution proposer is selected many slots in advance but allowed to resell their rights in-protocol can still support preconfirmations, as long as one of the following holds:

- There is **an enforcement mechanism** in place such that the original execution proposer can enforce any preconfirmations provided on the proposer who buys the right to propose. The exact enforcement mechanism will be important:
  - Enforced top-of-L1-block ordering of a specific transaction list: all types of preconfirmations can be provided and enforced by the original proposer.
   - L1 inclusion only: It is possible for the original proposer to offer
        - inclusion preconfirmations.
        - based L2 execution preconfirmations where all the L2 preconfirmed transactions (1) requires a signature from the original proposer, and (2) can be included in a single L1 transaction.
        However, L1 execution preconfirmations are not supported because the original proposer cannot enforce ordering.    
- A proposer commits to retaining the right to propose. This can be the original proposer, or any proposer who buys the right to propose. This would occur if/when a rational proposer believes that they maximize their revenue through offering preconfirmations instead of reselling proposal rights. This question of if/when a rational proposer would believe that they maximize their revenue through offering preconfirmations has been explored [here.](https://research.lido.fi/t/analysing-expected-proposer-revenue-from-preconfirmations/8954)

The final proposer with the rights to propose in a specific slot may offer preconfirmations for that slot as long as the purchase happens ahead of proposal time for that slot i.e. not just-in-time.

### **4.2.c. Effectiveness of punishment and tips**

The effectiveness of slashing will depend on preconfer collateral requirements. Although this is true for all preconfirmation protocols, one of the key APS questions that has not been decided on is the collateral requirements for execution proposers, and as such, the preconfers. If collateral requirements are enforced through APS, this collateral will likely be repurposed for proposer commitments, including preconfirmations. Regardless of whether collateral requirements on execution proposers are enforced in-protocol or not, some form of preconfer registry contract to manage preconfer rights and slashing will exist. In turn, this means blacklisting and reputation-based orderflow restrictions will also be possible. 

As APS is intended to control/isolate the effects of proposer centralization, it is likely that APS will lead to more frequent election of the few proposers that can compete in the respective APS auction. With one address per proposer, this leads to more effective orderflow and blacklisting incentives. However, proposers can choose to create multiple addresses that participate in the APS election to isolate any loss in reputation for performing malicious actions. It is not currently clear if such a strategy would be effective at maintaining the reputation of the non-malicious addresses owned by the proposer performing a malicious action. This is a question of sybil-resistance of reputation mechanisms, which has been discussed at length.

Some mitigations to this include:

- Requiring APS proposers to maintain identity-bound public keys which can be scrutinized and audited by users. Identity-bound keys are a typical sybil-resistant measure.
- Allow APS proposers to run their block-building code within trusted execution environments (TEEs), as discussed [here](https://docs.ata.network/tee-overview/tee-builder) and [here](https://writings.flashbots.net/unichain-mainnet). This minimizes the attack surface available to proposers with respect to performing malicious actions, and can be used to provide minimum reputations for APS proposers.

# **Section 5. Enshrined Proposer-Builder Separation (ePBS)**

## **5.1. Overview of ePBS**

In [PBS (Proposer-Builder Separation)](https://ethereum.org/en/roadmap/pbs/), the proposer auctions off the right to construct the execution payload to sophisticated entities known as *builders*, in exchange for a tip. In this setup, fair exchange between the beacon proposer and the builder—i.e., ensuring the proposer receives the tip *if and only if* they include the builder’s payload—is mediated by a trusted third party called a *relayer*.

In [**ePBS** (enshrined Proposer-Builder Separation)](https://eips.ethereum.org/EIPS/eip-7732), the auction is conducted in-protocol, removing the need for an out-of-protocol relayer to ensure fair exchange. The beacon proposer directly receives bids from builders and includes the hash of the execution payload submitted by the highest bidder. Subsequently, the builder reveals the full execution payload. Compared to the current Ethereum protocol, ePBS introduces an additional round of attestation, where a committee of validators attests to whether the builder has correctly revealed the payload.

## **5.2. Preconfirmation Analysis**

We examine all types of preconfirmations collectively, as they exhibit similar characteristics in terms of compatibility, as well as the effectiveness of punishment and tip.

**Compatibility**

The key factors affecting compatibility are:

- Whether auctioning proposal rights through ePBS is mandatory or not.
- The existence of enforceable block constraints that can be specified by the beacon proposer, which must be incorporated by all builders participating in the ePBS auction. [Such enforcement mechanisms have been hinted at in the past](https://x.com/potuz_eth/status/1858925975011995655), although an exact design has not be specified. One possible mechanism to force builders to abide by proposer-specified block constraints is to force builders to be staked ([as proposed in the ePBS EIP-7732](https://eips.ethereum.org/EIPS/eip-7732)), and slash any builder who reveals a block that doesn’t obey the block constraints.

If auctioning proposer rights is mandatory and enforceable block constraints exist, then the beacon proposers can offer all forms of preconfirmations (see Section 4.2.b for a specific breakdown of what types of enforcement mechanisms enable all types of preconfirmations). As mentioned in Section 1, we do not consider ePBS builder preconfirmations, as the builders do not control exclusive proposal rights.

If auctioning proposer rights is mandatory and enforceable block constraints do not exist, preconfirmations are not compatible. Specifically, the beacon proposer cannot safely issue preconfirmations, as the builder who ultimately wins the auction has no obligation to honor them. 

If auctioning is optional, the beacon proposer retains the ability to issue all types of preconfirmations. If enforceable block constraints exist, the proposer can choose to build their own block or auction the right to build.  If enforceable block constraints do not exist, the proposer must build their own block.

**Effectiveness of punishments and tips**

When auctioning is optional, we expect the same effectiveness of punishments and tips to as preconfirmations in the original Ethereum design. This is because the selection of preconfers follows the same process, and they have the same amount of space available for issuing preconfirmations.

In the case of enforceable block constraints, we also expect the compatible preconfirmation designs to have the similar effectiveness of punishments and tips as preconfirmations in the original Ethereum design. The key difference lies in the amount of available block space. As discussed in earlier sections, reduced block space may affect the expected rewards from preconfirmations per slot, which in turn can influence the effectiveness of punishment mechanisms such as orderflow loss or blacklisting. Whether expected rewards increase or decrease depends on whether tips rise sufficiently to offset the reduced block-space.

# Sources

1. [https://www.youtube.com/watch?v=fbyy_IHo-lI&list=PLJqWcTqh_zKHDFarAcF29QfdMlUpReZrR&index=8](https://www.youtube.com/watch?v=fbyy_IHo-lI&list=PLJqWcTqh_zKHDFarAcF29QfdMlUpReZrR&index=8).
2. [https://taiko.xyz/](https://taiko.xyz/).
3. [https://www.surge.wtf/](https://www.surge.wtf/).
4. [https://eth-fabric.github.io/website/development/l1-components/urc](https://eth-fabric.github.io/website/development/l1-components/urc).
5. [https://arbitrum.io/rollup](https://arbitrum.io/rollup).
6. [https://docs.primev.xyz/v1.1.0/concepts/what-is-mev-commit](https://docs.primev.xyz/v1.1.0/concepts/what-is-mev-commit).
7. [https://ethresear.ch/t/preconfirmation-fair-exchange/21891](https://ethresear.ch/t/preconfirmation-fair-exchange/21891).
8. [https://www.cs.utexas.edu/~shmat/courses/cs395t_fall04/pagnia.pdf](https://www.cs.utexas.edu/~shmat/courses/cs395t_fall04/pagnia.pdf).
9. [https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870).
10. [https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422](https://ethresear.ch/t/aucil-an-auction-based-inclusion-list-design-for-enhanced-censorship-resistance-on-ethereum/20422).
11. [https://eprint.iacr.org/2025/194](https://eprint.iacr.org/2025/194).
12. [https://eips.ethereum.org/EIPS/eip-7805](https://eips.ethereum.org/EIPS/eip-7805).
13. [https://arxiv.org/abs/2505.13751](https://arxiv.org/abs/2505.13751).
14. [https://ethresear.ch/t/uncrowdable-inclusion-lists-the-tension-between-chain-neutrality-preconfirmations-and-proposer-commitments/19372](https://ethresear.ch/t/uncrowdable-inclusion-lists-the-tension-between-chain-neutrality-preconfirmations-and-proposer-commitments/19372).
15. [https://a16zcrypto.com/posts/article/ethereum-roadmap-focil-and-multi-proposers/](https://a16zcrypto.com/posts/article/ethereum-roadmap-focil-and-multi-proposers/).
16. [https://www.youtube.com/watch?v=mJLERWmQ2uw](https://www.youtube.com/watch?v=mJLERWmQ2uw).
17. [https://publish.obsidian.md/netbound/Multiple+Concurrent+Proposers%2C+FOCIL+and+Preconfirmations](https://publish.obsidian.md/netbound/Multiple+Concurrent+Proposers%2C+FOCIL+and+Preconfirmations).
18. [https://simbro.medium.com/proposer-commitment-infrastructure-in-ethereum-61ad3b31f05f](https://simbro.medium.com/proposer-commitment-infrastructure-in-ethereum-61ad3b31f05f).
19. [https://lu-ban.notion.site/Multiple-Concurrent-Proposers-IS-Preconfirmation-5ae079060efd4a3395f86a3af53c0572](https://www.notion.so/5ae079060efd4a3395f86a3af53c0572?pvs=21).
20. [https://eprint.iacr.org/2020/025.pdf](https://eprint.iacr.org/2020/025.pdf).
21. [https://ethresear.ch/t/whisk-a-practical-shuffle-based-ssle-protocol-for-ethereum/11763](https://ethresear.ch/t/whisk-a-practical-shuffle-based-ssle-protocol-for-ethereum/11763).
22. [https://ethresear.ch/t/based-preconfirmations/17353](https://ethresear.ch/t/based-preconfirmations/17353).
23. [https://github.com/ethereum/consensus-specs/pull/4190#issuecomment-2752067885](https://github.com/ethereum/consensus-specs/pull/4190#issuecomment-2752067885).
24. [https://link.springer.com/chapter/10.1007/978-3-642-14577-3_35](https://link.springer.com/chapter/10.1007/978-3-642-14577-3_35).
25. [https://blog.thirdweb.com/nonce-ethereum/](https://blog.thirdweb.com/nonce-ethereum/).
26. [https://docs.google.com/presentation/d/1C4Iykpf-zNqCE1TyWxDzzw_A7n52GaUJz01Hw5v-NPo/edit?usp=sharing](https://docs.google.com/presentation/d/1C4Iykpf-zNqCE1TyWxDzzw_A7n52GaUJz01Hw5v-NPo/edit?usp=sharing).
27. [https://ethresear.ch/t/on-block-space-distribution-mechanisms/19764](https://ethresear.ch/t/on-block-space-distribution-mechanisms/19764).
28. [https://arxiv.org/pdf/2408.03116](https://arxiv.org/pdf/2408.03116).
29. [https://arxiv.org/pdf/2408.11255](https://arxiv.org/pdf/2408.11255).
30. [https://www.youtube.com/watch?v=5OOzMqCOoKM](https://www.youtube.com/watch?v=5OOzMqCOoKM).
31. [https://arxiv.org/pdf/2408.03116](https://arxiv.org/pdf/2408.03116).
32. [https://ethresear.ch/t/becoming-based-a-path-towards-decentralised-sequencing/21733](https://ethresear.ch/t/becoming-based-a-path-towards-decentralised-sequencing/21733).
33. [https://eips.ethereum.org/EIPS/eip-7732](https://eips.ethereum.org/EIPS/eip-7732).
34. [https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777](https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777).
35. [https://ethereum.org/en/roadmap/pbs/](https://ethereum.org/en/roadmap/pbs/).
36. [https://ethresear.ch/t/proposers-do-play-dice-introducing-random-execution-auctions-randeas/20938](https://ethresear.ch/t/proposers-do-play-dice-introducing-random-execution-auctions-randeas/20938).
37. [https://ethresear.ch/t/execution-tickets/17944](https://ethresear.ch/t/execution-tickets/17944).