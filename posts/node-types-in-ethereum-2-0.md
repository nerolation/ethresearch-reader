From the [Sharding FAQ](https://github.com/ethereum/wiki/wiki/Sharding-FAQs#what-might-a-basic-design-of-a-sharded-blockchain-look-like):

"Note that there are now several 'levels' of nodes that can exist in such a system:

* **Super-full node**  - fully downloads every collation of every shard, as well as the main chain, fully verifying everything.
* **Top-level node**  - processes all main chain blocks, giving them "light client" access to all shards.
* **Single-shard node**  - acts as a top-level node, but also fully downloads and verifies every collation on some specific shard that it cares more about.
* **Light node**  - downloads and verifies the block headers of main chain blocks only; does not process any collation headers or transactions unless it needs to read some specific entry in the state of some specific shard, in which case it downloads the Merkle branch to the most recent collation header for that shard and from there downloads the Merkle proof of the desired value in the state."

I have a few questions in the context of Eth 2.0:
1. Why do these super-full nodes have to verify all transactions (the main chain + all the shards), it will take a LOT of resources and I don't see the point? Storing everything makes sense (it ensures data availability of all the data), but it will also require a lot of disk space and bandwidth?
2. I don't get what/why these top-level nodes do? 
3. The single-shard nodes get periodically reshuffled. How do they "hand over" the data to the next elected node? 
4. So light clients only download the main chain headers? 

Is this all maybe outdated (things have changed/will change now when we merged Casper and sharding)? 

Thanks!