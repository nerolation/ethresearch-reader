**Background**

The setup for cross-shard transfers is as follows. There are two shards, A and B. Each shard keeps track of UTXOs (e.g. cryptokitties) that are transferable to the other shard. Each shard has its own accumulator such as a trie to keep track of its local UTXO set. To transfer a UTXO from A to B the UTXO is spent (removed from A’s accumulator) and an “inflight” TxOut is created as a result. This inflight TxOut can then be consumed on B, at which point a corresponding UTXO is created on B (added to B’s accumulator).

In order to prevent double-spends of inflight TxOuts we need a way to keep track of consumed inflight TxOuts on B. For that, we need an accumulator that supports non-membership witnesses. We could use a trie but keeping track of all consumed inflight TxOuts in a global trie is problematic. The reason is the set of consumed inflight UTXOs is ever growing so generating and auto-updating non-membership witnesses means keeping track of an ever growing data structure.

**Construction**

To avoid tracking an ever growing set of consumed inflight UTXOs we propose two things:
1. Inflight TxOuts are given a limited lifetime, say 7 days. That is, inflight TxOuts have to be consumed before 7 days on shard B otherwise they expire.
2. Instead of a global trie we use a FIFO of tries, each trie tracking a segregated batch of recently consumed inflight TxOuts according to expiry dates, with expired batches getting safely "garbage collected" out of the FIFO.

For concreteness, we batch with a granularity of 1 day (similar to expiry date labels on supermarket food items). The FIFO has 7+1 entries corresponding to the 7+1 tries (or trie roots, in the stateless paradigm) keeping track of the most recent batches of 1 day’s worth of consumed TxOuts. The consumed TxOuts in the tries that have left the FIFO can be discarded because they will have expired and will no longer affect non-membership witnesses.

**Conclusion**

We have a construction which allows for non-membership witnesses for cross-shard transfers to be created and auto-updated with only 7+1 days’ worth of consumed inflight TxOuts. Furthermore, we can reduce non-membership witness sizes and alleviate auto-updating by increasing the batch granularity, e.g. to 1 hour, to get a FIFO with 7*24+1 entries and correspondingly smaller batches.