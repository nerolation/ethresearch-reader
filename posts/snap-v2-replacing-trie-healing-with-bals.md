# Snap v2: Replacing Trie Healing with BALs

> Special thanks to [Gary](https://github.com/rjl493456442) for feedback and review!

Snap sync ([`snap/1`](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md)) dramatically improved node sync when it launched in [Geth v1.10.0](https://blog.ethereum.org/2021/03/03/geth-v1-10-0). But it has a well-known Achilles' heel: the **trie healing phase**, an iterative process where syncing nodes discover and fix state inconsistencies one trie node at a time. This phase has caused nodes to [get stuck healing for days or weeks](https://github.com/ethereum/go-ethereum/issues/23191) and has been [identified as something the community wants to eliminate](https://github.com/ethereum/go-ethereum/issues/27692).

With [EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) (Block-Level Access Lists), a new approach becomes possible: **replace trie healing entirely with sequential BAL application**. This post explains how snap sync works today, what makes trie healing problematic, and how a proposed `snap/2` protocol upgrade would fix it.

---

## Part 1: How Snap Sync Works Today

### The problem snap sync solves

A new Ethereum node needs the current state: every account balance, storage slot, and contract bytecode. This state lives in a Merkle Patricia Trie with the account trie saturated at a depth of about 7 levels ([EF blog: Snapshot Acceleration](https://blog.ethereum.org/2020/07/17/ask-about-geth-snapshot-acceleration)), containing hundreds of millions of nodes.

The old approach ("fast sync", `eth/63`–`66`) downloaded this trie **node by node** from the root. At block ~11,177,000, the state contained [617 million trie nodes](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#expected-results), and syncing them required downloading [43.8 GB of data distributed over 1,607M packets, resulting in a total of ~10h 50m of sync time](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#expected-results).

Snap sync's key insight: **skip the intermediate trie nodes entirely and download the leaves (accounts, storage) as contiguous ranges**, then rebuild the trie locally. This requires serving nodes to maintain a [dynamic snapshot](https://blog.ethereum.org/2020/07/17/ask-about-geth-snapshot-acceleration), a flat key-value store that can iterate accounts in ~7 minutes versus ~9.5 hours for raw trie iteration (see [snap.md](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#synchronization-algorithm)).

[Comparing fast-sync with snap sync](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#expected-results), we got the following improvements:

| Metric | Fast sync | Snap sync | Improvement |
|--------|-----------|-----------|-------------|
| Download | 43.8 GB | 20.44 GB | -53% |
| Upload | 20.38 GB | 0.15 GB | -99.3% |
| Packets | 1,607M | 0.099M | -99.99% |
| Serving disk reads | 15.68 TB | 0.096 TB | -99.4% |
| Time | 10h 50m | 2h 6m | -80.6% |

> **Note:** These benchmarks are from block ~11.2M (late 2020). The state has grown since, but the relative improvements remain representative. Modern snap sync typically takes [2–3 hours total](https://docs.nethermind.io/nethermind/ethereum-client/sync-modes) on good hardware.

### The three phases

Snap sync proceeds in three phases:

![sync](images/bis1DzhGP3HV692swS53vVO6obd.png)

**Phase 1 - Header Download:** Uses the [`eth`](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/eth.md) protocol to download all block headers, building a verified chain. The CL drives the EL, which means the first HEAD is received from the CL and the EL then downloads all parent headers starting from the latest header and moving backwards.

**Phase 2 - State Download:** The node picks a **pivot block $P$** (typically HEAD−64) and downloads the complete state at P:

- `GetAccountRange` (0x00): Download accounts in contiguous hash ranges, each response Merkle-proven at the boundaries to prevent gap attacks
- `GetStorageRanges` (0x02): Download storage slots for contracts, with multiple small contracts batchable into one request
- `GetByteCodes` (0x04): Download contract code, verified by codehash comparison

Each response is capped by byte size (not count) for predictable bandwidth, and different peers can serve different ranges concurrently. Serving nodes keep snapshots for the most recent [128 blocks](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#synchronization-algorithm) (~25.6 minutes at [12 seconds per slot](https://ethereum.org/developers/docs/consensus-mechanisms/pos/)).

The *pivot block* is a block far enough in the past from the tip of the chain to ensure that we don't download state that is the result of a block that is later reorged. 64-block deep reorgs are practically impossible. Even if such a reorg occurs, the already downloaded state does not need to be discarded and can be repaired by iteratively fetching the required trie nodes.

Crucially, as each state range is received, the node rebuilds and persists the intermediate trie nodes for that segment locally rather than fetching them over the network. By the end of Phase 2, the bulk of the trie is already correctly constructed, significantly reducing the healing workload to only fixing nodes made inconsistent by state changes that occurred during the download window.

**Phase 3 - Healing:** While Phase 2 is running, the chain advances from the pivot block $P$ to $P+K$, turning the downloaded state stale. Healing fixes this, but it's also where a problem begins.

### How trie healing works

The healing phase uses `GetTrieNodes` (0x06) / `TrieNodes` (0x07) to iteratively discover and fetch changed trie nodes:

![healing](images/weyjRswA0mrPs3MBJdzqmfUAt21.png)

### Why trie healing is the bottleneck

1. **Iterative discovery.** Syncing nodes don't know what changed until they look. Each round of `GetTrieNodes` reveals the next set of differences, requiring another round trip. This is fundamentally sequential.
2. **Small payloads, many round trips.** Individual trie nodes are [100–500 bytes](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#gettrienodes-0x06). Even batched, the data per round trip is tiny relative to network latency.
3. **Moving target.** With [12-second slots](https://ethereum.org/developers/docs/consensus-mechanisms/pos/), about [1,000 trie nodes are deleted and 2,000 added per block](https://geth.ethereum.org/docs/faq). Healing must outpace this or it will never converge.
4. **Random disk access.** Serving `GetTrieNodes` requires random database reads. This is expensive compared to the sequential reads used by `GetAccountRange`.
5. **Progress is unknowable.** As [Geth documentation notes](https://geth.ethereum.org/docs/fundamentals/sync-modes): *"It is not possible to monitor the progress of the state heal because the extent of the errors cannot be known until the current state has already been regenerated."*

The real-world impact can be severe. Examples include nodes being stuck for [2+ weeks while healing](https://github.com/ethereum/go-ethereum/issues/23191) (43 million trie nodes, 11.7 GiB downloaded; throughput degraded to ~2 trie nodes/second), being stuck for [4](https://github.com/ethereum/go-ethereum/issues/25945) or [6 days](https://github.com/ethereum/go-ethereum/issues/25898) during healing.

The at-launch benchmark showed healing adding [~541,260 trie nodes (~160 MiB)](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md#expected-results) at block ~11.2M, but with today's larger state and higher block gas limit, the healing burden is already substantially heavier, and will worsen with further gas limit increases.

---

## Part 2: Block-Level Access Lists (BALs)

[EIP-7928](https://eips.ethereum.org/EIPS/eip-7928) introduces **Block-Level Access Lists (BALs)**: data structures recording every account and storage location accessed during block execution, along with post-execution values. Each block header commits to its BAL via a new `block_access_list_hash` field placed in the block header:

```python
block_access_list_hash = keccak256(rlp.encode(block_access_list))
```

A BAL contains, for every accessed account:
- **Storage changes**: per-slot post-values, indexed by which transaction caused the change
- **Storage reads**: slots read but not modified
- **Balance/nonce/code changes**: post-transaction values

BALs are RLP-encoded, deterministically ordered (accounts lexicographically by address, changes by transaction index), and complete. State diffs are a subset of the BAL and can therefore be used to assist during sync.

### BAL sizes

Empirical analysis of [1,000 mainnet blocks at a 60M block gas limit](https://github.com/ethereum/EIPs/blob/3753c531e8c0c0768c6264d5063caed96aea40aa/assets/eip-7928/bal_size_analysis_60m.md) showed that BALs are ~72.4 KiB on average.

Nodes must retain BALs for at least the [weak subjectivity period](https://ethereum.github.io/consensus-specs/specs/phase0/weak-subjectivity/) (up to [3,533 epochs](https://ethereum.github.io/consensus-specs/specs/phase0/weak-subjectivity/), ~15.7 days at today's validator set size).

---

## Part 3: [snap/2](https://eips.ethereum.org/EIPS/eip-8189): BAL-Based State Healing

Instead of iteratively discovering and fetching trie nodes, **`snap/2` inverts the `snap/1` pattern**. In `snap/1`, the trie is built incrementally during download and the flat state is derived from it. In `snap/2`, **only the flat state (leaves) is synced**, BAL diffs are applied directly to it, and the **trie is rebuilt once from the complete state**, eliminating incremental trie construction and the complex healing it requires.

Concretely, instead of iteratively discovering and fetching trie nodes, **nodes download the BALs for every block that advanced during sync and apply the state diffs sequentially**. The set of blocks is known upfront. Each BAL is verified against its header commitment. This eliminates the need for iterative discovery.

[`snap/2`](https://eips.ethereum.org/EIPS/eip-8189) removes the trie healing messages and replaces them with BALs, reusing the same message IDs:

| ID | snap/1 | snap/2 |
|----|--------|--------|
| 0x00–0x05 | Account/storage/bytecode download | **Unchanged** |
| 0x06 | `GetTrieNodes` | `GetBlockAccessLists` |
| 0x07 | `TrieNodes` | `BlockAccessLists` |

Note that reusing the message IDs is safe because `snap/2` is a new protocol version negotiated during the [RLPx](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/rlpx.md) handshake. `snap/1` peers never see `snap/2` messages.

### The new messages

**GetBlockAccessLists (0x06):**

```bash
[request-id: P, [blockhash₁: B_32, blockhash₂: B_32, ...]]
```

**BlockAccessLists (0x07):**

```bash
[request-id: P, [block-access-list₁, block-access-list₂, ...]]
```

- Nodes must always respond
- Empty entries (zero-length bytes) for unavailable BALs
- Responses preserve request order and may be truncated from the tail
- Recommended soft limit set to 2 MiB per response, which is consistent with existing messages, e.g. blocks, headers or receipts.

### The new sync algorithm

![sync2](images/xdxw5EvGmukdeqdRjjzPvWBBINv.png)

**Notably, since BALs are guaranteed to be correct by consensus (BAL hash check against canonical blocks), the state roots are guaranteed to match; thus, clients could even skip the final state root comparison step.**

### Why this works

With `snap/2`, the healing window is bounded and known. For a pivot at HEAD−64:

- **64 blocks × ~72.4 KiB** (projected 60M gas) ≈ **4.5 MiB** total BAL data
- Fits in **2–3 responses** at the 2 MiB soft limit
- Serving BALs requires only a few disk lookups instead of a lookup for every changed trie node
- **1–3 total round trips** (including any "tail" blocks that arrive during application)
- Extracting the state diff from the BAL is **purely local computation**. There's no need for trie traversal.

Compared to `snap/1`, `snap/2`'s healing is more efficient, requiring fewer disk reads and round trips. With `snap/2`, at least in theory, it should become impossible for the chain to outpace sync.

### Relationship with eth/71

[EIP-8159](https://eips.ethereum.org/EIPS/eip-8159) adds BAL exchange to the `eth` protocol as messages 0x12/0x13. Both exist for different reasons:

| | eth/71 | snap/2 |
|---|--------|--------|
| **Purpose** | Recent BALs for parallel execution, reorg handling | Sync: bulk BAL download during healing |
| **Volume** | 1–3 BALs at a time | Multiple BALs at a time |
| **Protocol** | Mandatory for all nodes | Optional satellite protocol |

Messages are duplicated in `eth/71` and `snap/2` to ensure `snap` stays a self-contained satellite protocol and to allow snap to evolve independently, for example, serving only state diffs instead of full BALs in a future version, without requiring changes to eth.

---

## Part 4: Comparison

### Healing phase: snap/1 vs snap/2

| Property | snap/1 (trie healing) | snap/2 (BAL healing) |
|----------|----------------------|---------------------|
| Discovery | Iterative: nodes don't know what changed until they look | Deterministic: blocks $P+1$..$P+K$ are known upfront |
| Round trips | Hundreds+ ([issues report millions of trie nodes](https://github.com/ethereum/go-ethereum/issues/23191)) | Final number *TBD*, but estimated to be only a few |
| Verification | Complex trie reconstruction + root comparison | `keccak256(rlp(bal)) == header.block_access_list_hash` |
| Moving target | Each healing round + chain advance → more healing | BAL application is local and fast; tail is tiny |
| Convergence guarantee | Weak: [healing must outpace chain growth](https://geth.ethereum.org/docs/fundamentals/sync-modes) | Strong: deterministic, bounded work |

**The complete flow, comparing `snap/1` with `snap/2`, looks like the following:**

![snapv2flowdiagram|664x890, 100%](images/tzhWCZ6RTKe1K7gXEaquS13lBac.jpeg)

### Failure modes

| Failure | snap/1 | snap/2 |
|---------|--------|--------|
| Healing can't converge | [Real risk](https://github.com/ethereum/go-ethereum/issues/23191): trie healing is slow enough for chain to outpace it | Nearly eliminated: only BAL download needs network |
| Unavailable data | None: snap/1 only requires healing to outpace the chain | The weak subjectivity period (~15.7 days) is generous |
| Bad data | Merkle proofs catch bad trie nodes | Hash comparisons catch bad BALs |
| Reorg past pivot | Recoverable: trie healing resolves state against the new canonical chain | Recoverable if orphaned BALs are retained; otherwise requires sync restart |

### A concrete example

Consider a pivot at block 22,000,000 with the chain 200 blocks ahead when state download completes:

**snap/1:** Start trie traversal from block 22,000,200's state root. Each round discovers more differences, goes deeper. Meanwhile, multiple new blocks arrive during healing. In the best case, this takes minutes; in pathological cases (slow disk, slow network), [it has taken days](https://github.com/ethereum/go-ethereum/issues/25945).

**snap/2:** Request BALs for multiple blocks. At a 60M block gas limit, that's ~4–5 MiB, which fits in a few responses. Apply the BALs locally, optionally verify the state root matches. A few more blocks arrived during application? Fetch 2–3 more BALs. Total: 2–3 round trips, seconds to complete.

## Further Reading

- [Ethereum Snapshot Protocol (snap/1) — devp2p spec](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/snap.md)
- [Ethereum Wire Protocol (eth) — devp2p spec](https://github.com/ethereum/devp2p/blob/bc76b9809a30e6dc5c8dcda996273f0f9bcf7108/caps/eth.md)
- [EIP-7928: Block-Level Access Lists](https://eips.ethereum.org/EIPS/eip-7928)
- [EIP-7928 BAL Size Analysis (empirical, 30M gas)](https://eips.ethereum.org/assets/eip-7928/bal_size_analysis)
- [EIP-8159: eth/71 — Block Access List Exchange](https://eips.ethereum.org/EIPS/eip-8159)
- [Geth Sync Modes documentation](https://geth.ethereum.org/docs/fundamentals/sync-modes)
- [Geth FAQ — state healing](https://geth.ethereum.org/docs/faq)
- [Ask about Geth: Snapshot Acceleration — EF Blog](https://blog.ethereum.org/2020/07/17/ask-about-geth-snapshot-acceleration)
- [Geth v1.10.0 release — EF Blog](https://blog.ethereum.org/2021/03/03/geth-v1-10-0)
- [Weak Subjectivity — Ethereum Consensus Specs](https://ethereum.github.io/consensus-specs/specs/phase0/weak-subjectivity/)
- [Block-level Access Lists (BALs) — ethresear.ch](https://ethresear.ch/t/block-level-access-lists-bals/22331)
- [go-ethereum #23191: State heal phase very slow (2+ weeks)](https://github.com/ethereum/go-ethereum/issues/23191)
- [go-ethereum #25945: Stuck healing for 4 days](https://github.com/ethereum/go-ethereum/issues/25945)
- [go-ethereum #25898: State heal since 6 days](https://github.com/ethereum/go-ethereum/issues/25898)
- [go-ethereum #27692: Get rid of snap sync heal phase](https://github.com/ethereum/go-ethereum/issues/27692)
- [Nethermind Sync Modes documentation](https://docs.nethermind.io/nethermind/ethereum-client/sync-modes)
- [Proof-of-stake (12s slots) — ethereum.org](https://ethereum.org/developers/docs/consensus-mechanisms/pos/)