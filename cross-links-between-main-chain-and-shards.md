The [minimal sharding spec](https://ethresear.ch/t/a-minimal-sharding-protocol-that-may-be-worthwhile-as-a-development-target-now/1650) is relatively simple: for every 5-block main chain period, the start of that period is used as a source of randomness to select proposers and notary committees, and the committees need to publish their signatures into the main chain by the end of the period. The dependency graph looks like this:

[yuml]
[M1] -> [S11]
[M1] -> [S12]
[S11] -> [M2]
[S12] -> [M2]
[M1] -> [M2]
[M2] -> [S21]
[M2] -> [S22]
[S21] -> [M3]
[S22] -> [M3]
[M2] -> [M3]
[/yuml]

However, this results in a fairly slow shard collation time. Suppose that we want to speed up shard collations to, say, four seconds. Then, we can do this:

[yuml]
[M1] -> [S11]
[M1] -> [S12]
[S11] -> [S21]
[S21] -> [S31]
[S31] -> [M2]
[S12] -> [S22]
[S22] -> [S32]
[S32] -> [M2]
[M1] -> [M2]
[M2] -> [S41]
[M2] -> [S42]
[S41] -> [...]
[S42] -> [... ]
[/yuml]

However, this creates a gaping hole, where shard collations cannot be processed during the time between when they are included into the main chain, and when the next period begins.

We can mitigate this by switching into a different paradigm, which I call _chain cross-linking_. Explaining with a diagram:

[yuml]
[M1] -> [M2]
[M2] -> [M3]
[M3] -> [M4]
[M4] -> [...  ]
[M1] -> [S11]
[M1] -> [S12]
[S11] -> [S21]
[S21] -> [S31]
[S31] -> [S41]
[S41] -> [S51]
[S51] -> [S61]
[S31] -> [M3]
[S12] -> [S22]
[S22] -> [S32]
[S32] -> [S42]
[S42] -> [S52]
[S52] -> [S62]
[S32] -> [M3]
[M4] -> [...]
[M4] -> [... ]
[S61] -> [...]
[S62] -> [... ]
[/yuml]

The idea is that there are two types of cross-links, one going from the main chain to shards, and the other going from shards to the main chain. A shard-to-main-chain link must be signed off on by a committee, and the committee's responsibility is to attest to the availability of all shard blocks since the last cross-link that was made for that shard (alternatively, in the meta-committee approach, a single meta-committee attests to the fact that for every shard, a committee has attested to the validity of some particular hash). Once an S2MC link is made, the validity of the main chain from that point depends on the validity of that shard chain; if a main chain contains a link to an invalid shard chain block, then that entire main chain past that point is to be considered invalid.

An S2MC link also establishes shard fork choice, using the "U rule". To find the head of a shard chain:

* Start from the head of the main chain.
* Walk back to the latest main chain block that contains an S2MC link to that shard.
* Go to the shard collation referenced in that S2MC link.
* Walk forward to the head of the shard using that shard collation as a starting point / root, using the shard's fork choice rule.

A main-chain-to-shard link can be signed off on by a single proposer in a shard; a proposer creating a collation on a shard can reference a main chain block, and that shard collation would then be dependent on both its direct parent and that main chain block for validity and for fork choice (that is, is the linked main chain block is not part of the canonical main chain, the shard collation cannot be part of the canonical shard chain). Notice that in both cases, the main chain drives the fork choice rule.

A not yet fully solved challenge is determining how to incentivize and when to allow cross-links.