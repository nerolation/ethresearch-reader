# Fast Confirmation Rule on Safe Head in Prysm (Part 1)

This document highlights our implementation of the [fast confirmation algorithm](https://ethresear.ch/t/confirmation-rule-for-ethereum-pos/15454) in Prysm, as part 1 of a broader exploration. We call it part 1 because the work is still in its early stages—there’s a whitepaper and a safety proof, but neither has been fully vetted, and as far as we know, no other client has implemented it yet. Like all implementations, bugs and errors exist. In this post, we cover our implementation in Prysm and share some interesting observations from running it on mainnet.

### References:
- [Confirmation Rule for Ethereum PoS](https://ethresear.ch/t/confirmation-rule-for-ethereum-pos/15454) by Aditya Asgaonkar, with contributions from Francesco D’Amato, Roberto Saltini, Luca Zanolini, and Chenyi Zhang
- [A Fast Confirmation Rule for the Ethereum Consensus Protocol](https://arxiv.org/abs/2405.00549) by Aditya Asgaonkar, Francesco D’Amato, Roberto Saltini, Luca Zanolini, and Chenyi Zhang
- [Prysm Fast Confirmation Implementation Code](https://github.com/OffchainLabs/prysm/pull/15164/files) by Aditya Asgaonkar and Terence 
   - :warning: **Warning**: experimental code, do not use in prod!
- [Prysm Forkchoice Implementation Explainer](https://hackmd.io/@ttsao/prysm-fc) by Terence

## Background
#### What is safe head?
On Ethereum, safe head refers to the most recent block that is considered safe from short-term reorgs, meaning it is unlikely to be replaced by another block due to a fork. A block eventually becomes safe when it is rooted in a justified checkpoint and receives enough validator attestations. Traditionally, clients refer to the latest justified checkpoint (also the starting point for the LMD GHOST fork choice algorithm) as a safe block, or the latest unrealized justified checkpoint (without regard to whether on-chain realization has occurred) as a safe block. Safe block allows consumers of chain to safely make forward progress without needing to wait for finality which takes longer to achieve.

#### How to get safe head?
Execution Layer clients (like Geth, Nethermind, etc.) expose dedicated RPC endpoints to query the **head**, **safe head**, and **finalized** execution blocks. Consumers of blockchain live data can decide how to act upon this information:
- **Finalized head**: `eth_getBlockByHash("finalized", ...)`
- **Safe head**: `eth_getBlockByHash("safe", ...)`
- **Head**: `eth_getBlockByHash("latest", ...)`
    
#### How is safe head passed to the EL?
Safe head is passed from the Consensus Layer to the Execution Layer through the [Engine API](https://github.com/ethereum/execution-apis/tree/main/src/engine), specifically via the `engine_forkchoiceUpdated` methods during a head update. Different CL clients may have different interpretations of what qualifies as safe use the 1.) latest justified checkpoint, others (like Prysm by default) use the 2.) latest unrealized justified checkpoint. In this post, we explore an alternative: using the 3.) **fast confirmed block** as the safe block.

```json
{
  "jsonrpc": "2.0",
  "method": "engine_forkchoiceUpdatedV2",
  "params": [
    {
      "headBlockHash": "0x...",
      "safeBlockHash": "0x...",   ← this is the safe head
      "finalizedBlockHash": "0x..."
    },
    {
      "timestamp": "0x...",
      "random": "0x...",
      "suggestedFeeRecipient": "0x..."
    }
  ],
  "id": 1
}
```

### What is a fast confirmed block?
A fast confirmed block is one that, assuming a synchronous network (attestations take <8 seconds to arrive) and limited adversarial power, is highly likely to remain on the canonical chain—even before it becomes finalized. The fast confirmation rule provides a heuristic for users and applications to treat a block as **confirmed** within seconds to under a minute after proposal. It does this by checking whether the block has received enough observable validator votes and meets specific safety thresholds. Unlike finality, which guarantees irreversibility through slashing conditions, fast confirmation offers a quicker but weaker assurance based on network conditions and validator behavior.

## Prysm implementation
This section outlines Prysm’s safe head implementation from the experimental [PR](https://github.com/OffchainLabs/prysm/pull/15164). Since it’s still under active development and may change, feel free to skip to the test observations section. To enable fast confirmation as the safe block, two flags must be set:
- To choose the safe block mode: `-safe-block=fast-confirmation` (default: `unrealized-justified`)
- To specify the byzantine threshold: `-fast-confirmation-byzantine-threshold=33` (default: `33`)
    - Here, _byzantine_ refers to malicious actions like withholding attestations, voting on conflicting subtrees, etc.
        
#### Fast confirmation timeline
At second 0 of slot `n`, in the happy case, the Prysm beacon node calls $UpdateHead$ at its regular interval. Starting at second 4 of `n-1`, it begun collecting, verifying, and counting attestations for timely block slot `n-1`. If all goes as expected, the block at `n-1` can be fast confirmed in under 8 seconds (assuming byzantine threshold is under 30%, we'll explain why this math later.
#### Modified forkchoice and node objects
The $Forkchoice$ object now caches a new field: safe head root.
The $Node$ adds new method for computing the maximum possible support it could receive from its start slot to the current slot. This is based on the committee weight and slot/epoch anatomy:
- If the range is within a single epoch, it returns the total support as: $CommitteeWeight × SlotCount$.
- If the range spans full epochs, it returns one epoch's worth of weight: $CommitteeWeight * 32$.
- If it crosses into a new epoch without spanning it completely, it calculates support proportionally based on slot counts in each epoch segment.
    
When updating the best descendant, the function receives both the number of seconds into the current slot and the current chain’s committee weight
- If the previous slot's best child is fast confirmed, it recursively sets $BestConfirmedDescendant$ to the deepest confirmed child.
- If not confirmed, it assigns the best child directly or sets $BestConfirmedDescendant$ to $nil$.
This ensures fast confirmation status flows backward through the chain.

Finally, to determine whether a node is confirmed, it compares the node’s weight without proposer boost applied against a safety threshold. The logic checks:
1. The node’s slot must be earlier than the current slot.
2. It calculates the max possible support and proposer boost weight.
3. The confirmation condition is:
$voteOnlyWeight > (maxPossibleSupport + proposerBoostWeight) / 2 + maxPossibleSupport / 3$

Where:
$proposerBoostWeight = (committeeWeight * ProposerScoreBoost) / 100$

### Observation #1
(All data below are captured between April 13, 2025 - April 14, 2025)

**Happy case:** For a valid block proposed on time at slot `n`, by the start of slot `n+1`, the block typically receives around **97%** of validator support just by subscribing to the aggregated attestations subnet.
In this chart, assuming start of slot `n`, `node0` is block at slot `n-1`, `node1` is block at slot `n-2:`
![Screenshot 2025-04-14 at 9.35.38 AM](images/vexs5dcUAzR3B50BInDzwjXWIdz.png)


**Late block case:** If the block at slot `n` is released late, it won’t gather enough support by the start of `n+1`. In this case, fast confirmation usually takes **more than 3 slots**, assuming a subsequent block reorgs out the late block.

### Observation #2
Beacon slot reorgs happen more frequently than safe block reorgs, as expected, with 8 beacon reorgs and 0 safe block reorgs observed in the last 12 hours.
![Screenshot 2025-04-14 at 9.42.10 AM](images/58VpNWw5TsJZLYvr14vwJchiv9V.png)

### Observation #3
As expected, fast confirmed (safe) blocks occur more frequently than unrealized justified (safe) blocks, which in turn occur more frequently than finalized blocks. This reflects the tradeoff between confirmation speed and the strength of safety guarantees—fast confirmation provides quicker assurance at the cost of weaker guarantees, while finality offers the strongest guarantees but with longer delays.

This is an hourly view where green represents the justified epoch, yellow the unrealized justified epoch, blue the fast confirmed epoch, and orange the latest epoch. As shown, the fast confirmed epoch closely tracks the latest epoch, unlike the justified and unrealized justified epochs which tend to lag behind:
![Screenshot 2025-04-14 at 9.30.41 AM](images/pD4CqKMRKpIKCgM1VNKzFGNdpeF.png)
This is a 30 mins view:
![Screenshot 2025-04-14 at 9.34.41 AM](images/grvL7wCrpGjPOTPc4HQDyVUArhZ.png)

### Observation #4
The difference between the latest head slot and the safe slot typically averages 2 slots over an hourly view and ranges from 2 to 4 slots over a 5-minute window:
![Screenshot 2025-04-14 at 9.40.28 AM](images/jbY8NgUBp5yQ1hgesnssqT9ekkX.png)


### Observation #5
When using a Byzantine threshold of 33%, it becomes **impossible to confirm a block within a single slot**. This is due to the stricter confirmation condition:
```
vote > (max_support + pb_score) / 2 + max_support * 0.33
```

Intuitively, this means the block would need:
- 50% (LMD GHOST threshold)
- 20% (half of proposer boost)
- 33% (Byzantine threshold)
    
Which totals to **103%**, exceeding the maximum possible vote weight of 100%.
To generalize the threshold across multiple slots, we model it as:
```
threshold = ((n * 0.5) + 0.2 + (n * 0.33)) / n
```
Where `n` is the number of slots since the block was proposed. This formula captures:
- `n * 0.5`: LMD vote requirement
- `n * 0.33`: safety buffer for byzantine behavior
- `0.2`: fixed proposer boost contribution
    
As `n` increases, the proposer boost's influence diminishes, and the threshold converges toward **0.83** This means that to fast confirm a block within **two slots**, it must receive **at least 93% of total committee weight**.

| Slots since proposal (n) | LMD vote (n * 0.5) | Proposer boost (/2) | Byzantine threshold (n * 0.33) | Total | Normalized Threshold (Total / n) |
|---------------------------|--------------------|----------------------|-------------------------------|--------|----------------------------------|
| 1                         | 0.50               | 0.20                 | 0.33                          | 1.03   | 1.03                             |
| 2                         | 1.00               | 0.20                 | 0.66                          | 1.86   | 0.93                             |
| 3                         | 1.50               | 0.20                 | 0.99                          | 2.69   | 0.89                             |
| 4                         | 2.00               | 0.20                 | 1.32                          | 3.52   | 0.88                             |
| 5                         | 2.50               | 0.20                 | 1.65                          | 4.35   | 0.87                             |


As expected in this graph, the top graph shows a block from `n-1`, where yellow is the threshold to be fast confirmed and green is the node's weight without proposer boost applied. It stays below the threshold and is always 2 to 4 percent short so it cannot be confirmed. In the bottom graph, the block is from `n-2` and the weight is 1 to 2 percent above the threshold so it can be confirmed.
![Screenshot 2025-04-14 at 9.44.40 AM](images/4x7EyHP0H6vHHgufC7P7XEUvPVA.png)

### Observation #6
With a Byzantine threshold of 25%, we can confirm a block in less than one slot, or roughly 8 seconds. Revisit the head slot minus safe slot chart and the node 0 weight versus safety threshold chart.
![Screenshot 2025-04-14 at 12.50.47 PM](images/m1LvF68M7AYWEha75kYogF4kPxM.png)
![Screenshot 2025-04-14 at 12.51.04 PM](images/bOjyQwaahTxx64ultZrMRzbCnVY.png)





### Follow-up items
- Reorgs for safe blocks are never ok. For example, if exchanges rely on safe blocks for processing withdrawals, a reorg could result in a double spend. In our experiment, we observed reorgs of the safe block, but only during initial sync to the chain head. This appears to be more of an implementation issue. One potential fix is to only apply the fast confirmation algorithm if the block has a current slot timestamp (h/t potuz) otherwise, fallback to using the unrealized justified algorithm for safety.
    - This already is under work in Prysm's PR today

- The fast confirmation safety proof described in the paper would benefit from more eyes. The more vetting and review the proof receives, the better—see point 1. Reorgs of safe blocks can be dangerous depending on how they're used in practice.
    
If anyone has questions or feedback, feel free to reach out. We’ll continue working to make this implementation production-ready, run it in long-term test mode, and publish a part 2 report with updated findings.