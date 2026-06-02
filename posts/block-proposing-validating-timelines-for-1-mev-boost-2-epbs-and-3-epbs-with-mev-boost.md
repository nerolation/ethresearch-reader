This writeup summarizes the timeline differences between ePBS and MEV-Boost using inequalities. We analyze three models: 1) MEV-Boost, 2) ePBS, and 3) MEV-Boost with relayers on ePBS. We show that MEV-Boost with relayers on ePBS is slower than ePBS alone, which could lead to reorgs.

## Definitions
$VT^{CL}$: Consensus layer validation time. The time taken by a node to verify the consensus portion of a block.
$VT^{EL}$: Execution layer validation time. The time taken by a node to verify the execution portion of a block.
$RT^{mevboost}$: Mev-boost block release time. The time when a block is released from a node or relayer, assuming the MEV-boost setting.
$RT^{epbs,cl}$: ePBS consensus block release time. The time when a consensus block is released from a node or relayer, assuming the ePBS setting.
$RT^{epbs,el}$: ePBS execution block release time. The time when an execution block is released from a node or relayer, assuming the ePBS setting.
$PT^{mevboost}$: Mev-boost block propagation time. The time taken for a block to propagate across the network, assuming the mev-boost setting.
$PT^{epbs,cl}$: ePBS consensus block propagation time. The time taken for a consensus block to propagate across the network, assuming ePBS setting.
$PT^{epbs,el}$: ePBS execution block propagation time. The time taken for an execution block to propagate across the network, assuming ePBS setting.
$Attestation\_RT^{beacon}$: Beacon attestation release time. The time when a beacon attestation is released from a node.
$Attestation\_RT^{ptc}$: PTC attestation release time. The time when a payload attestation is released from a node, assuming the ePBS setting.
$BBT$: Proposer build block time. The time taken for a proposer to build consensus portion of a block.
$GHT$: Proposer get header time. The time taken for a proposer to obtain a header from a relayer (MEV-boost) or builder (ePBS).
$GPT$: Proposer get payload time. The time a proposer takes to obtain a payload from a relayer (MEV-boost).
$SPT$: Builder submit payload time. The time taken for a relayer to receive a payload from the builder (MEV-boost).
$SBBT$: Proposer submit blind block time. The time a proposer takes to submit blind block to the relayer (MEV-boost).

## Proposing a mev-boost block

In Mev-Boost, proposing a block involves two parts. First, the builder sends the block to the relayer. Second, the proposer requests the header and returns the signed block to the relayer. We break down the time it takes in the following subsections, starting with the non-optimistic relayer and then the optimistic relayer. We also assume that everything starts at the 0-second mark of the slot, including the builder sending the execution block to the relayer.

### Non optimistic relayer

$BRT$ defines builder to relayer time. This is how much time takes for a builder to submit a block (ie bid) to the relayer and the relayer verifies the block is valid. 
$BRT = SPT + VT^{EL}$

$PRT$ defines proposer to relayer time. This is how much time takes for a proposer to build block, request header, request payload, and submit blind block.
$PRT = BBT + GHT + GPT + SBBT$

$RT^{mevboost} = BRT + PRT$

This assumes everything happens after the slot start because bids become more valuable. Another model is to assume $BRT$ happens before the slot. Then $RT^{mevboost} = PRT$.

### Optimistic relayer
#### Relayer receives builder block time

$BRT = SPT$

$PRT$ is the same as before

$RT^{mevboost} = BRT + PRT$

> Using optimistic relayer is faster than non-optimistic relayer by: $VT^{EL}$

## Validating a mev-boost block

In MEV-Boost, the block must be processed before $Attestation\_RT^{beacon}$ to be considered canonical. The following equation shows the conditions that need to be met for the block to be considered canonical from the perspective of all nodes.

For a beacon block to be canonical, it should satisfy: 
$RT^{mevboost} + PT^{mevboost} + VT^{CL} + VT^{EL} < Attestation\_RT^{beacon}$

## Proposing an ePBS block

In ePBS, proposing the consensus block and the execution block are pipelined, where the consensus block commits to the execution block's header. Block release time becomes two parts 1.) CL block release time and 2.) EL block release time.

### Proposing the consensus block

We assume the proposer uses the builder's RPC to get the header. The proposer could also self-build or use P2P to obtain the header, which is arguably faster. Therefore, there is no need for proposer get header time anymore.

$RT^{epbs,cl} = GHT + BBT$

> Using ePBS is faster than mev-boost by: $SPT+VT^{EL}+GPT + SBBT$

### Proposing the execution block

$RT^{epbs,el}$ is when fork choice accumulates sufficient weight (~40%) or 6 seconds into the slot. The builder could propose a "withhold" block to try to reorg consensus layer block so builder does not have to pay the proposer.

## Validating an ePBS block

In ePBS, validating the consensus block and the execution block are pipelined in different stages. The beacon attestation cutoff time has been moved from 4 seconds into the slot to 3 seconds into the slot. However, we can assume that the CL block propagation time is shorter than the block propagation time. EL block validation can be delayed until the subsequent slot, as shown in the equations.

### Validating the consensus block
$PT^{epbs,cl} < PT^{mevboost}$
$Attestation\_RT^{beacon,epbs} < Attestation\_RT^{beacon,mevboost}$

For a consensus block to be canonical, it should satisfy: 
$RT^{epbs,cl} + PT^{epbs,cl} + VT^{CL} < Attestation\_RT^{beacon}$

> Using ePBS is faster than mev-boost by: $PT^{mevboost}-PT^{epbs,cl}+VT^{EL}$
 
### Validating the execution block

#### As a PTC voting for execution block's presence
$RT^{epbs,el} + PT^{epbs,el} < Attestation\_RT^{ptc}$
#### As a proposer proposing the next slot's consensus block
$RT^{epbs,el} + PT^{epbs,el} + VT^{EL} < Next\_Slot\_Start\_Time$
#### Everyone else
$RT^{epbs,el} + PT^{epbs,el} + VT^{EL} < Next\_Slot\_Attestation\_RT^{beacon}$

## Proposing an ePBS block using mev-boost

$BRT = SPT + VT^{EL}$
$PRT = BBT + GHT$
$RT^{epbs,cl} = BRT + PRT$

> Using MEV-Boost for ePBS is slower than ePBS by: $SPT + VT^{EL}$ 
> The additional latency occurs because the trusted party must receive and verify the execution block before releasing it to the proposer.

## Validating the consensus block

$RT^{epbs,cl} + PT^{epbs,cl} + VT^{CL} < Attestation\_RT^{beacon}$

> Given $Attestation\_RT^{beacon}$ is shorter than ePBS, an extra $SPT + VT^{EL}$ could lead to additional reorgs.