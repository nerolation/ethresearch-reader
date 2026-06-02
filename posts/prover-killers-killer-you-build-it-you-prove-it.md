By [Kev](https://x.com/kevaundray) and Julian. Thanks to [Toni](https://x.com/nero_eth) and [Francesco](https://x.com/fradamt) for their feedback. Last updated: 7th of July 2025.

[Delayed execution](https://eips.ethereum.org/EIPS/eip-7886) is a proposed upgrade to Ethereum that helps to increase the gas limit. Instead of needing to execute the block before attesting, with delayed execution, attesters pass simple checks on the block **and vote for it before executing the transactions. [Changing the current EVM with a zkVM](https://ethereum-magicians.org/t/long-term-l1-execution-layer-proposal-replace-the-evm-with-risc-v/23617/2) is another proposed Ethereum upgrade to increase the gas limit. With a zkVM, attesters only need to verify a succinct proof that the block was validly executed. This post explores the interaction between delayed execution and zkVMs. Note that one of the main goals of delayed execution is to facilitate zkVM proving on Ethereum L1.

**We propose assigning the responsibility of proving the correct execution of block `n` to the builder of that block, but enabling that builder to force-include the proof in the block of slot `n+1`.** 

This proposal improves the incentive alignment of proving, especially for so-called “[prover killers](https://youtu.be/4E-yaX-F7Qw?si=MXN-l1uLT5sbeErk)”.  Prover killers are blocks that are specifically built to be expensive to prove, while being relatively cheap to create. They leverage the asymmetry between what the Ethereum protocol charges in gas units for operations and the real-world costs provers incur. If the slot `n+1` builder were responsible for proving block `n`, the builder of slot `n` may create such a prover killer to grieve the slot `n+1` builder. This proposal removes that incentive incompatibility by assigning responsibility for proving block `n` to the slot `n` builder.

A special case where improved incentive alignment is helpful is if there is a builder liveness issue. Suppose there is one extremely powerful builder that creates a large block and then goes offline (or a cartel of builders that behaves like this one builder). In that case, it may be infeasible for smaller backup builders to create a proof for the previous block. This knowledge could allow the (cartel of) builder(s) to “hold Ethereum ransom” and extract rents. If the slot `n` builder is responsible for the proof of slot `n`, this phenomenon disappears. If a builder goes offline, the block contents are skipped (as described below), and a next-slot builder could build a block that it can self-proof. Therefore, this proposal helps [decouple throughput from local building](https://ethresear.ch/t/decoupling-throughput-from-local-building/22004) as it benefits block production liveness. 

### Same-Slot Proof Proposal

- Slot `n`, `t=0`: The builder of slot `n` propagates the beacon block. The execution payload is packaged into a blob and gossiped.
- Slot `n`, `t=X` (Say like t = 2): Attesters statically validate the beacon block as outlined in the delayed execution EIP.
- Slot `n`, `t=Y` (Say like t = 9) (Proof observation deadline): Attesters freeze their view on whether there is a proof available that takes as input the pre-state root and a kzg commitment to a blob and outputs the post-state root.
- Slot `n+1`, `t=0`: The builder of slot `n+1` includes a proof of correct execution of the previous block if it is available.
- Slot `n+1`, `t=X`: Attesters fully validate block `n`. Each attester does so by running the following checks against its local view.
    - Was the proof of block `n` available at the proof observation deadline?
    - If so, is the proof correct?
    - If so, is the blob corresponding to the kzg commitment in the blob available.
    
    If the attester answered yes to all questions, it votes for block `n+1` if it includes the proof of block `n`. If the attester answers no to the first question, it votes for the block if either of the following two conditions hold:
    
    - No proof was included in the block.
    - A correct proof was included with a kzg commitment that corresponds to an available blob.

If no proof for block `n` was included in block `n+1`, or the blob data corresponding to the proof was not available, block `n+1` should treat the execution of block `n` as a no-op, meaning the pre-state of block `n+1` is identical to the pre-state of block `n`. This mechanism ensures that both the proof and the payload data are available, guaranteeing security and liveness. As Toni and Francesco argue [here](https://ethresear.ch/t/delayed-execution-and-free-da/22265), treating the block as a no-op does not expose free data availability, since the block producer forgoes execution rewards to obtain the “free” data availability.

Note that attesters of slot `n` also fully validate block `n-1`, and attesters of slot `n+1` also statically validate block `n+1`. Full validation consists of verifying the proof’s correctness and timeliness as described above.

## Proving Gas
This proposed design makes it less necessary to prevent prover killers, however, it may still be desirable to price opcodes in terms of proving costs for a couple of reasons. In this section, we consider proving gas as a new gas dimension which measures the proving costs associated with each transaction. We separate proving and execution gas since they have different uses. An execution gas limit ensures interested parties can keep up with the tip of the chain, while proving gas ensures the protocol knows how expensive it is to prove specific transactions.

First, benchmarking proving gas costs of opcodes makes pricing easier, improving user experience. Instead of builder-provers having to assess costs of transactions and charge users for it, the protocol quotes builders and users a fair price. 

Secondly, proving gas improves censorship resistance. If the protocol knows honest provers, even smaller provers, can prove a block of a certain amount of proving gas, it can force all provers to include at least up to that amount of proving gas in their blocks. For example, FOCIL could force include up to 36 million proving gas (today’s gas limit) before the block is considered full. Without proving gas, that number would have to be approximated conservatively using execution gas.

Although the protocol should put a limit on how much proving gas worth of transactions can be force-included via FOCIL, provers may be free to include transactions consuming more proving gas, as long as other constraints such as the execution gas limit are satisfied. This is an advantage of this design over builders proving the blocks of their predecessor. In that case, there must be a hard cap on the amount of proving gas in the block.

## Slot Structure
Ethereum slots are divided into sections that are used for different protocol tasks, namely: propagation, execution, and consensus. With zkVMs, there also needs to be time to prove a block.

With this proposal, the builder could start proving their block at the same time they propagate it to the network. If a builder must prove its predecessors block, the protocol needs to budget time for the builder to do so, which would have to be after the previous block must have been delivered. Instead, this proposal parallelizes proving time with propagation time, whereas in another proposal proving time must come after propagation time.

Parallelizing propagation and proving time could allow for more blobs and larger blocks than sequential propagation and proving time. We may still need some execution time in the slot to allow others to keep up with the tip of the chain and to build the next block.


## Extra Considerations

The Same-Slot Proof architecture relies on view-merge, a fork-choice gadget described by Francesco in this [post](https://ethresear.ch/t/view-merge-as-a-replacement-for-proposer-boost/13739). View-merge assumes that the network delay is lower than some constant, `Δ`. The proof observation deadline should be set at the latest at `t = 12 - Δ`.  If the network delay is smaller than `Δ`, the builder's view is a superset of the frozen views of the attesters, meaning that attesters will not force a builder to include a proof that is gossiped after the proof observation deadline, preventing split-view attacks. View-merge is the same fork-choice gadget that underpins designs like [MEV-Burn](https://ethresear.ch/t/mev-burn-a-simple-design/15590) and [FOCIL](https://eips.ethereum.org/EIPS/eip-7805).

Finally, note that the Same-Slot Proof architecture does not depend on whether one or multiple zkVMs are enshrined. If proofs of multiple zkVM proofs are necessary, attesters fully validating a block should check that multiple correct proofs were included in the block, if necessary, according to their local view. The Same-Slot Proof architecture doesn't require onchain proving either. Proofs could be stored offchain, as explored by Vitalik [here](https://notes.ethereum.org/@vbuterin/enshrined_zk_evm) and by Justin [here](https://ethresear.ch/t/native-rollups-superpowers-from-l1-execution/21517). Instead of storing the proof onchain, as proposed above, there must be a flag onchain that stores whether the necessary proofs were available by the observation deadline (h/t Dankrad).