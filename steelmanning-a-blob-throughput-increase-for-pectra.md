# Steelmanning a blob throughput increase for Pectra

With the discussions about the Pectra hardfork scope continuing, I want to provide some empirical input on the current state of the network.
I'll try to do so by answering some commonly raised questions that arise in discussions on the proposed blob target/limit increase for Pectra.

**The arguments for shipping [EIP-7691](https://eips.ethereum.org/EIPS/eip-7691) in Pectra are:**
* **Continue scaling DA** - with [EIP-4844](https://github.com/ethereum/EIPs/blob/b4da6a963f0afc5e78b6071ec4c6e5ae7cada145/EIPS/eip-4844.md), we have only set the foundation.
    * Provide existing L2s and their apps enough blob space for further scaling.
    * Avoid creating a precedent of "*blob fees can explode and are unpredictable*" (h/t Ansgar); this harms future adoption if rollups have to account for rare fee spikes over extended periods.
* **The number of reorgs has been trending down since Dencun.**
* **The impact of blobs on reorgs has decreased as well.**


## How did the number of reorgs evolve over time?

> reorged = "nodes saw a block by the proposer of the respective slot"
> missed = "no sign that the proposer was online"

* Within the last 365 days, 5,900 blocks were reorged. 
* This equates to 0.225% of the blocks in that time interval.
* At the same time, 14,426 slots were missed, representing 0.549%.
* On average, we observe 492 reorgs and 1,202 missed slots per month.


The number of reorgs has been decreasing, which is a positive development, though not surprising, as core devs continuously improve client software. Interestingly, contrary to expectations that the most recent hard fork (= Dencun) would lead to a significant rise in reorgs, we actually observed the opposite trend.

**Since the Dencun upgrade, the number of reorgs halved.**

![combined_reorgs_missed|571x500](images/aIvNSZwl54KAQNCosm3rxdb33lE.png)




It’s challenging to identify the exact reason for the change in trend, but it may be attributed to the ongoing improvements made by core devs to their client software.

## What's the impact of blobs on reorgs?

[Initial analysis](https://ethresear.ch/t/big-blocks-blobs-and-reorgs/19674) conducted a few months after the Dencun hardfork showed that blocks with 6 blobs were reorged 3 times more frequently than 0-blob blocks. In general, we observed that the reorg rate has increased steadily with a growing number of blobs.

Updating this analysis presents a different picture today. Even though we still see that 6-blob blocks are reorged more frequently than 0-blob or 1-blob blocks, the numbers have decreased significantly, showing no substantial difference between blocks with one blob and those with six blobs.
We still observe a small difference in the reorg rate for 0-blob blocks and x-blob blocks (where x > 0).

![reorgrate_animation|690x301](images/Roq1jhVy73jCKvtEoqw6KTFcJF.gif)



## How well are blobs distributed over blocks?

Plotting the distribution, we can see that most blobs contain either 0 or 6 blobs, with blocks containing 1 to 5 blobs representing the minority. However, the situation has improved since the [last study](https://ethresear.ch/t/big-blocks-blobs-and-reorgs/19674), with fewer slots at the extremes of 0 blobs and 6 blobs.

![all_blobs_day|690x301](images/tfc6Xeww06438trGhtpOl6sPh4M.gif)



## Related work

| Title | Url | 
| -------- | -------- | 
| On Attestations, Block Propagation, and Timing Games    |  [ethresearch](https://ethresear.ch/t/on-attestations-block-propagation-and-timing-games/20272)     |
| Blobs, Reorgs, and the Role of MEV-Boost     | [ethresearch](https://ethresear.ch/t/blobs-reorgs-and-the-role-of-mev-boost/19783)     | 
| Big blocks, blobs, and reorgs     | [ethresearch](https://ethresear.ch/t/big-blocks-blobs-and-reorgs/19674)     | [ethresearch](https://ethresear.ch/t/big-blocks-blobs-and-reorgs/19674)     |
| On Block Sizes, Gas Limits and Scalability     |[ethresearch](https://ethresear.ch/t/on-block-sizes-gas-limits-and-scalability/18444)     |
| The Second-Slot Itch - Statistical Analysis of Reorgs   |  [ethresearch](https://ethresear.ch/t/the-second-slot-itch-statistical-analysis-of-reorgs/16333/12)     |