Here is an interesting thought regarding how to make ETH main chain way faster and blocks much much larger.

The idea is to make a block much faster so that it includes only PoW, the Merkle root of the previous block and a Merkle root of everything else. 

In addition, the miner should include in the block a list of "fast IP addresses", where one can get "everything else".

The entire block will fit into a single IP packet, and will be under 500 bytes.

Then when a node receives a block, the node will first try downloading the block from one of the "fast" IP addresses, and then only resort to gossiping as the last resort. Things will become way faster.

A miner will build a block on top of a blockchain tip only if it has the full blocks for the entire branch of the tip.

Things will become way faster since it will be in the miners interest to deploy full blocks to hypefast CDNs.

It looks like the block witholding problem will be resolved automatically since a branch with withheld blocks will not be 
followed by miners.

As a result, the block size and TPS may go up hundreds of times.

Looking for someone to tear it apart :smiling_imp: