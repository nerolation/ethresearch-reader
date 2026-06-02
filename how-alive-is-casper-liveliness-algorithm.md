[Casper paper](https://github.com/ethereum/research/blob/master/papers/casper-basics/casper_basics.pdf) proves plausible liveliness, in a sense that it is always mathematically possible for validators to create supermajority links to produce new finalized checkpoints.  In other words, the system never deadlocks or stalls.

1. Would it be correct to day though that mathematically possible liveliness and real life liveliness seem are  two different things ?  In other words, a "dumb" set of validators may be not smart enough to produce the right supermajority link to get out of a deadlock.

2. Would it be correct also to say, that "dumb" validators could DoS things in a sense that they would create too many unnecessary supermajority links?

3. Since it looks like Casper is progressing to the release, would it be fair to start discussing the actual algorithm implemented in the source code ? 
I was trying to find it starting from the source code of the docker container in the test net, but was not able to get to the actual algorithm that produces supermajority links ...