### The problem:

- The proposer of a block broadcasts its block between 4 seconds and 12 seconds into the slot. 
- Most (all but the few that are being run by the proposer) validators do not get the block in time ( > 4 seconds) to attest so they vote for the previous block as head
- The next block proposer gets the block in time (< 12 seconds) to propose based on it, so the block does not get orphaned. 

This hurts everyone attesting:
- The attesting validators that didn't get the block in time are penalized by voting the wrong head, receiving aproximatedly 50% of the current full reward. 
- The attesting validators that did vote correctly are penalized even more due to the low participation. 

On the other hand **the block proposer gets a full reward** as the attestations he included are independent of the time of his broadcasting the block. This has been a common scenario in mainnet, being the main source of bad head votes. The typical block looks like [this one](https://beaconcha.in/block/413307#overview). 

### The proposal:

Reward block proposers by the number of votes they receive in their block. That is
``` 
#diff @get_inclusion_delay_deltas
-rewards[attestation.proposer_index] += get_proposer_reward(state, index)
+rewards[attestation.proposer_index] += F * get_proposer_reward(state, index)
```
Where `0 < F < 1`  and include a reward of ` (1-F)*  get_proposer_reward(state, index)` for each vote the block received. 

The pros of this approach are

- As the number of validators attesting per slot is roughly constant, this should not change the overall reward of proposer. 
- Proposers will receive less per attestation included, but still their best strategy is to include as much as possible. 
- Proposers are going to be penalized if they send their block later, or rather rewarded if they send their block earlier. 

What doesn't change:
- Attestators are still going to be encouraged to attest early, nothing changes.
- Broadcasters do not gain anything new by not broadcasting the block, as the votes only count for the voted block, there is no incentive on the next proposer to not broadcasting the block.

A con of this approach:

- In epochs of low participation, proposers will be hurt