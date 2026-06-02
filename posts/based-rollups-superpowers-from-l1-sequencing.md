**TLDR**: We highlight a special subset of rollups we call "based" or "L1-sequenced". The sequencing of such rollups—based sequencing—is maximally simple and inherits L1 liveness and decentralisation. Moreover, based rollups are particularly economically aligned with their base L1.

**Definition**

A rollup is said to be based, or L1-sequenced, when its sequencing is driven by the base L1. More concretely, a based rollup is one where the next L1 proposer may, in collaboration with L1 searchers and builders, permissionlessly include the next rollup block as part of the next L1 block.

**Advantages**

* **liveness**: Based sequencing enjoys the same liveness guarantees as the L1. Notice that non-based rollups with escape hatches suffer degraded liveness:
    * **weaker settlement guarantees**: Transactions in the escape hatch have to wait a timeout period before guaranteed settlement.
    * **censorship-based MEV**: Rollups with escape hatches are liable to toxic MEV from short-term sequencer censorship during the timeout period.
    * **network effects at risk**: A mass exit triggered by a sequencer liveness failure (e.g. a 51% attack on a decentralised PoS sequencing mechanism) would disrupt rollup network effects. Notice that rollups, unlike the L1, cannot use social consensus to gracefully recover from sequencer liveness failures. Mass exists are a sword of Damocles in all known non-based rollup designs.
    * **gas penalty**: Transactions that settle through the escape hatch often incur a gas penalty for its users (e.g. because of suboptimal non-batched transaction data compression).
* **decentralisation**: Based sequencing inherits the decentralisation of the L1 and naturally reuses L1 searcher-builder-proposer infrastructure. L1 searchers and block builders are incentivised to extract rollup MEV by including rollup blocks within their L1 bundles and L1 blocks. This then incentivises L1 proposers to include rollup blocks on the L1.
* **simplicity**: Based sequencing is maximally simple; significantly simpler than even centralised sequencing. Based sequencing requires no sequencer signature verification, no escape hatch, and no external PoS consensus.
    * *historical note*: In January 2021 Vitalik described based sequencing as ["total anarchy"](https://vitalik.ca/general/2021/01/05/rollup.html#who-can-submit-a-batch) that risks multiple rollup blocks submitted at the same time, causing wasted gas and effort. It is now understood that proposer-builder separation (PBS) allows for tightly regimented based sequencing, with at most one rollup block per L1 block and no wasted gas. Wasted zk-rollup proving effort is avoided when rollup block `n+1` (or `n+k` for `k >= 1`)  includes a SNARK proof for rollup block `n`.
* **cost**: Based sequencing enjoys zero gas overhead—no need to even verify signatures from centralised or decentralised sequencers. The simplicity of based sequencing reduces development costs, shrinking time to market and collapsing the surface area for sequencing and escape hatch bugs. Based sequencing is also tokenless, avoiding the regulatory burden of token-based sequencing.
* **L1 economic alignment**: MEV originating from based rollups naturally flows to the base L1. These flows strengthen L1 economic security and, in the case of MEV burn, improve the economic scarcity of the L1 native token. This tight economic alignment with the L1 may help based rollups build legitimacy. Importantly, notice that based rollups retain the option for revenue from L2 congestion fees (e.g. L2 base fees in the style of EIP-1559) despite sacrificing MEV income.
* **sovereignty**: Based rollups retain the option for sovereignty despite delegating sequencing to the L1. A based rollup can have a governance token, can charge base fees, and can use proceeds of such base fees as it sees fit (e.g. to fund public goods à la Optimism).

**Disadvantages**

* **no MEV income**: Based rollups forgo MEV to the L1, limiting their revenue to base fees. Counter-intuitively, this may increase overall income for based rollups. The reason is that the rollup landscape is plausibly winner-take-most and the winning rollup may leverage the improved security, decentralisation, simplicity, and alignment of based rollups to achieve dominance and ultimately maximise revenue.
* **constrained sequencing**: Delegating sequencing to the L1 comes with reduced sequencing flexibility. This makes the provision of certain sequencing services harder, possibly impossible:
    * **pre-confirmations**: Fast pre-confirmations are trivial with centralised sequencing, and achievable with an external PoS consensus. Fast pre-confirmations with L1 sequencing is an open problem with promising research avenues including EigenLayer, inclusion lists, and builder bonds.
    * **first come first served**: Providing Arbitrum-style first come first served (FCFS) sequencing is unclear with L1 sequencing. EigenLayer may unlock an FCFS overlay to L1 sequencing.

**Naming**

The name "based rollup" derives from the close proximity with the base L1. We acknowledge the naming collision with the recently-announced [Base chain](https://base.org/) from Coinbase, and argue this could be a happy coincidence. Indeed, Coinbase shared two design goals in [their Base announcement](https://www.coinbase.com/blog/introducing-base):

* **tokenlessness**: "We have no plans to issue a new network token." (in bold)
* **decentralisation**: "We [...] plan to progressively decentralize the chain over time." 

Base can achieve tokenless decentralisation by becoming based.