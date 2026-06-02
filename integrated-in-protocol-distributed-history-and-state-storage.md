This post will describe a fairly simple and well-integrated approach to doing distributed storage of Ethereum’s history, and an extension to storing state.

## Step 1: put block contents into blobs

We put Ethereum’s history into blobs. The natural way to do this is to have a function `get_blobs(block_body) -> List[Blob]` that serializes the block body and splits it up into blobs. We then require the first blob versioned hashes in a block header’s blob versioned hash list to equal `[get_versioned_hash(blob) for blob in get_blobs(block.body)]`.

For convenience, we can separate the blobs for the CL body from the blobs for the EL body (ie. `ExecutionPayload`), then we can have the ZK-EVM proofs include only those versioned hashes as a public witness. This allows a block to be verified purely by

1. downloading the headers
2. doing a DAS check for the blobs
3. downloading and directly verifying the CL part only,
4. verifying the ZK-EVM proof

When the full Lean Consensus features are introduced, the CL part will also get a ZK proof, and we will have achieved the full ideal of having a chain you can verify by only checking headers, DAS and proofs - total “verifiability on a smartwatch”.

We can make the above cleaner by doing [payload chunking](https://ethresear.ch/t/payload-chunking/23008), and adjusting a few constants. Particularly, if we (i) do [EIP-7976](https://eips.ethereum.org/EIPS/eip-7976) and with the same gasprice for zero and nonzero bytes, and (ii) increase the blob size when we upgrade blobs to quantum-resistant (or even earlier), then we can achieve the guarantee that each payload chunk can fit inside one blob (!!). For example, if we set calldata cost to 64 gas per byte, then thanks to [EIP-7825](https://eips.ethereum.org/EIPS/eip-7825), we have a hard cap that a serialized tx is under 256 kB, so if we set blob size to 256 kB, we get this guarantee.

We will also need to do the same for block-level access lists, including ensuring that the hard “64 gas per byte” invariant is reflected for each component and for the combination.

## Step 2: random blob history storage

We add a rule that each client must store a randomly selected one sample of each blob that it sees. If we:

* Set sample size to 512 bytes (shrunk from the current 2048), to maximize PeerDAS bandwidth
* Assume an aggressive average 64 256 kB-sized blobs per slot (16 MB), which is enough for either a \~20x increase in L2 blob space compared to status quo, or \~128x the current gas limit, or a mix of both

Then we get:

* Each client stores 1/512 of each blob, so you need \~710 honest nodes (above 512 due to overlap) to store >= 50% of the blobs to be able to recover all of them.
* Each client’s load will be (at an aggressive 128 blobs per slot) `512 * 62 * 31556926 / 12` bytes = 80 GB per year, which is roughly in line with reasonable extra load to impose on consensus nodes

Querying for blobs can be done either by re-purposing the existing DAS mechanism, or by creating a dedicated protocol more optimized to the syncing process.

## Step 3: add storage

This actually does not require any work. If block-level access lists are included in blobs, then you can already sync blobs from the latest state you know (if needed the merge-time snapshot) and replay the updates to compute the current state. If desired, we could also add a “repeatedly walk through the tree from left to right” mechanism, though it is not clear if it is worth the complexity.