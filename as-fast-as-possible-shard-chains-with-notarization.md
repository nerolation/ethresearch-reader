The following is an example for a structure that could be used to enable fast shard chain collations.

Background:

* [Proof of Activity](https://eprint.iacr.org/2014/452.pdf): hybrid proof of work and proof of stake where for a block to be valid to build on top of, >=M out of a randomly selected N PoS validators need to vote on it.
* [Sequential proof of work](https://eprint.iacr.org/2018/183.pdf), specifically this latest protocol by Bram Cohen

Consider a PoA-like model where a collation can be made by a proposer, and then for it to be eligible for the next proposer to build on top of, the collation needs to be approved by at least 4 of a random sample of 7 notaries. The randomness is sourced from (i) a recent main chain block hash, and (ii) a hash preimage revealed by the proposer. For any collation, there is an infinite sequence of proposers that can make collations on top of it; that is, for every integer x >= 0, there is a proposer P[x]. For a proposal by proposer P[x] to be valid, it must contain sequential proof of work with difficulty factor D * x; D is adjusted via an on-chain game, targeting toward five seconds.

The intention is that collations on shards would normally come as fast as network latency, in a graph like this:

[yuml]
[collation] <- [notarization]
[collation] <- [notarization ]
[collation] <- [notarization  ]
[collation] <- [notarization   ]
[notarization] <- [collation ]
[notarization ] <- [collation ]
[notarization  ] <- [collation ]
[notarization   ] <- [collation ]
[collation ] <- [ notarization]
[collation ] <- [ notarization ]
[collation ] <- [ notarization  ]
[collation ] <- [ notarization   ]
[ notarization] <- [collation  ]
[ notarization ] <- [collation  ]
[ notarization  ] <- [collation  ]
[ notarization   ] <- [collation  ]
[/yuml]

And if at any point proposer 0 for the next collation is missing, then the chain would stop for ~5 seconds, at which point proposer 1 would be able to make a collation.

The notarizations would serve three purposes:

* Directly notarizing the collations they are building on top of
* Being a de-facto committee approving the shard chain (the main chain meta-committee would listen to the longest chain in this mechanism)
* Being Casper votes in the main-chain Casper FFG cycle