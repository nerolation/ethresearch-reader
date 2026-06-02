<p align="center">
  <img src="images/h8diFcsG9ADP53i0MVyAduJTKl4.jpeg" width="333" height="500" alt="ChatGPT Image Apr 22, 2025, 11_26_48 AM">
</p>

*Thanks to [Julian Ma](https://x.com/_julianma), [Ignacio Hagopian](https://x.com/ignaciohagopian), [Carlos Perez](https://x.com/CPerezz19), [Guillaume Ballet](https://x.com/gballet), [Justin Drake](https://x.com/drakefjustin), [Francesco D’Amato](https://x.com/fradamt) and [Caspar Schwarz‑Schilling](https://x.com/casparschwa) and for ideas, discussions, feedback, and contributions to the proposal.*

# Introduction

Ethereum has long pursued the goal of [**stateless validation**](https://stateless.fyi/): enabling participants to verify blocks without needing to store the entire state of the chain. Statelessness aims to reduce hardware requirements, promote greater decentralization among verifier nodes, and unlock scalability by allowing larger blocks to be constructed and validated without requiring all nodes to replicate the full state.

One leading proposal toward this vision is [**weak statelessness**](https://ethereum.org/en/roadmap/statelessness/), where only block producers retain the full state and other nodes validate blocks using small state proofs. While attractive for its simplicity and efficiency, weak statelessness raises a critical challenge: **How can Ethereum preserve its censorship resistance (CR) properties in a world where most nodes cannot independently validate transactions?**

In this post, we explore why weak statelessness, on its own, undermines Ethereum’s censorship resistance guarantees, and propose a pragmatic solution: **Validity-Only Partial Statelessness (VOPS)**. By requiring nodes to store just enough account data to validate pending transactions, **VOPS** offers a **25x storage reduction** while preserving Ethereum’s censorship resistance.

>💡
>
>We argue that:
>
>- Weak statelessness alone cannot guarantee strong censorship resistance.
>- Future designs must revisit **strong statelessness**, and address practical questions, such as [who generates these proofs](https://ethresear.ch/t/a-protocol-design-view-on-statelessness/22060), what types of proofs are most efficient, and how bandwidth and proving costs impact node requirements.
>- In the meantime, **Validity-Only Partial Statelessness (VOPS)** offers a simple and effective bridge: reducing local storage by **25x** while preserving a functional, censorship-resistant public mempool.
> **AA-VOPS** extends VOPS to support full native account abstraction, offering a path toward strong statelessness by minimizing witness overhead through local caching and incremental updates.

# The why

We’ll start by explaining why weak statelessness (i.e., only relying on block producers to hold the state) doesn’t work well if we want to give strong censorship resistance guarantees for all transactions through mechanisms like [FOCIL](https://eips.ethereum.org/EIPS/eip-7805). Before diving deeper, here’s a quick recap of the main ingredients required for FOCIL to work in a stateful world. We’ll show how FOCIL’s current design relies on the assumption that the mempool can retain valid transactions while pruning out invalid ones:

- ***Users*** send transactions that, if valid (i.e., passing nonce and balance checks), are broadcast across ***nodes*** and remain pending in the public mempool. 
*Note: In this post, we use the term "node" to refer mempool maintainers via their execution layer client.*
- ***Includers*:** Each slot, 16 includers observe the pending mempool transactions, add them to inclusion lists (ILs), and broadcast these ILs across the CL P2P network.
- ***Block producers*** must include the union of valid transactions from all ILs in their blocks. An IL transaction can only be excluded from the block if it is invalid or if the block is full (i.e., conditional property).
- ***Attesters*** verify whether all IL transactions are included in the block. If they are, the attesters vote for the block. Otherwise, they assess whether the block is full or whether the missing transactions were valid, in order to determine if the exclusions were justified or if the block was censoring.

Now, imagine the protocol only expects ***block producers*** to hold the state. This would mean that ***users***, ***nodes*** maintaining a mempool, ***includers***, and ***attesters*** are unable to determine if transactions are valid against the `preStateRoot` on their own. Indeed, they would lack access to the complete, up-to-date state information necessary for critical validation checks, including confirming that the sender has sufficient `balance` and that the transaction’s `nonce` is correct. *Note that any smart contract conditions or state-dependent logic (for example, the current state of a Uniswap pool) are already provided by dApps today to help **users** avoid reverts.* 

So, in a weak statelessness world:

- ✅ Everything actually works out for **attesters:** they don’t need to store anything at all since ***block producers*** generate **block-level witnesses**. These witnesses can take the form of **aggregated Merkle/Verkle proofs** (e.g., [IPA multiproofs](https://dankradfeist.de/ethereum/2021/06/18/pcs-multiproofs.html)) or even SNARKs (more on this in a section later on), which show that all state accesses made by transactions included in the block are valid against `preStateRoot`. In other words, they prove that the provided data for the block execution exists in the previous block state root. Importantly, ***block producers*** must also attach witnesses for any IL transactions they exclude (either using witnesses submitted alongside the ILs or by reconstructing them), so that attesters can re-execute the block and verify whether each omission was justified.
- For ***nodes*** maintaining the mempool and ***includers***, there is a fundamental problem if we want them to be stateless. When transactions are sent to the public mempool by ***users***, ***nodes*** have no way of knowing if these transactions are valid against the `preStateRoot` as they can’t perform the usual `nonce` and `balance` checks to determine whether they should rebroadcast transactions or prune them from their local mempool:
    - ❌ This can be exploited to **flood the mempool** **and IL**s with invalid transactions, effectively [negating the benefits of FOCIL](https://hackmd.io/PrO6DT7qQEOvsIyMSOci4g) and enabling the censorship of transactions that would have otherwise benefited from being included in ILs.
    - ❌ The absence of `nonce` and `balance` checks as a first line of defense creates a new DoS vector: it allows **anyone** to submit invalid transactions to the mempool or ILs, degrading the quality of the mempool and making it harder for valid transactions to surface. This creates the same kind of disruption that would occur if **includers were adversarial** and filled ILs with garbage. The key difference is that today, **only validators (with 32 ETH) can be includers**, whereas without basic filtering, **any participant** can degrade mempool quality and interfere with inclusion list effectiveness—lowering the barrier to attack and weakening censorship resistance in practice.

# Wat do?

In the following section, we explore potential options to overcome the challenges presented by the weak statelessness approach.

## Option 1: Strong statelessness

One seemingly straightforward approach is to require that user transactions be bundled with complete state accesses against the `preStateRoot` (e.g., Merkle or Verkle proofs), often referred to as strong statelessness. We could even relax the strict definition of strong statelessness by requiring each previous ***block producer*** to attach state witnesses to every transaction, so that ***nodes*** can fetch them on demand. This would, in theory, enable any ***node***, including ***includers*** and ***attesters*** to independently verify that a transaction’s state accesses are consistent with the `preStateRoot` without needing access to the full, current state. Such a mechanism is useful for managing the mempool effectively: instead of excluding and including transactions every slot, ***nodes*** can retain transactions that remain unaffected by subsequent blocks and prune those whose nonce or balance has changed. 

But in practice, it would require a real-time delivery channel between nodes and the current block producer, introducing strong trust assumptions and a new censorship vector: a block producer could delay or selectively withhold transaction-level proofs to keep targeted transactions out of every mempool and inclusion list, quietly excluding them while still producing an apparently valid block. Moreover, for new transactions, relying solely on the previous block’s state is insufficient. Users need access to updated, real-time state witnesses that include both the accounts and storage slots actually touched by the transaction, as well as any additional parts of the state trie required to reconstruct the path to those entries—due to how the trie structure interlinks state. Not only does continuously fetching these proofs increase bandwidth usage and latency—degrading UX—but it also raises a crucial question: who should serve as [proof-serving nodes](https://ethresear.ch/t/a-protocol-design-view-on-statelessness/22060)? Wallets? dApps? The Portal network? Supernodes (i.e., validators staking `2048 ETH`)? All of the above? 

Although strong statelessness may be the endgame if we want attester and includer nodes to be completely stateless and run on smart watches, further research is essential to answer this question and determine which actors are best suited to perform this duty by evaluating the costs and hardware requirements needed to **(1)** store the full state and **(2)** generate and broadcast the witnesses and proofs associated with user transactions. Note that this approach only requires a one-out-of-N honesty assumption—in theory, a single honest actor capable of generating valid proofs is sufficient. However, in practice, relying on only one or very few actors could lead to issues such as rent extraction (e.g., commitment attacks, censorship, and monopoly pricing).

## Option 2: Validity-Only Partial Statelessness

A pragmatic, short‑term approach is to rely on partial statelessness and store only the minimal data needed to verify transaction validity. Under VOPS, each node maintains just four fields per EOA—`address` (20 B), `nonce` (8 B), `balance` (12 B), and a one‑bit `codeFlag`—instead of the full state.

When a transaction arrives, the node checks `codeFlag`:

- `codeFlag = 0` (pure EOA, no delegation designator — meaning the account cannot delegate execution to custom code):
    - Verify signature, nonce, balance vs. fees, and gas limits.
    - Allow multiple in‑flight transactions per address.
- `codeFlag = 1` (any address capable of running code using a 23‑byte [EIP‑7702](https://eips.ethereum.org/EIPS/eip-7702) delegation designator):
    - **Enforce at most one** pending transaction per address.
    - Prevents nonce/balance conflicts as delegated code can alter state unpredictably.

On each new block, the node updates its table with all modified quadruplets, prunes any transactions rendered invalid by stale nonces or insufficient balances, drops all but the highest‑priority pending transaction whenever an account’s `codeFlag` flips from **0** to **1**, and promotes any queued EOA transactions whose nonces now match when the flag flips back from **1** to **0**.

Because each account entry is only `20 + 8 + 12 + 0.125 ≈ 40.125 bytes`, maintaining [~241 million accounts](https://stateless.fyi/development/mainnet-analysis/tree-shape.html#accounts-and-code-length-stats) requires:

$$
241\,\text{million} \times 40.125\,\text{bytes} \approx 8.4\,\text{GiB}
$$

That’s more than a **25×** reduction compared to today’s `~233 GiB` full‐state size (h/t Guillaume), yet still lets VOPS nodes maintain the mempool effectively. Note that the `8.4 GiB` figure is uncompressed, so it’s a pessimistic estimate of the storage savings VOPS could deliver.

### VOPS for Verkle

To make the VOPS idea concrete, we’ll start by anchoring the proposal in a **[Verkle](https://eips.ethereum.org/EIPS/eip-6800) setting**.

**Block Header Fields**

| **Field** | **Purpose** |
| --- | --- |
| `preStateRoot` | State root before executing the block. |
| `postStateRoot` | State root after execution. |
| Block-level `witness` (IPA multiproof, in the block body) | Proves that every state element read during execution is valid against the `preStateRoot`. |
| `transactions` | Full list of transactions. |

Let’s recap who does what in that scenario:

- ***Users*** broadcast transactions to the public mempool. Under VOPS, partial‑stateless nodes keep only four **fields** per account—`address`, `nonce`, `balance`, and `codeFlag`—just enough to decide whether each pending transaction should stay or be pruned.
- ***Includers*:** Each slot, 16 includers observe the pending mempool transactions, add them to inclusion lists (ILs), and broadcast these ILs across the CL P2P network. If the includer also maintains a mempool—as is the case today—no additional checks are needed before including transactions in ILs, since validity checks against the `preStateRoot` (e.g., `nonce`, `balance`, and `codeFlag`) are performed as part of mempool maintenance. However, if in the future includers are separated into a standalone role (e.g., [light “smart-watch” includers](https://ethresear.ch/t/towards-attester-includer-separation/21306)), they will need to independently perform transaction validity checks before including transactions in ILs.
- ***Block producers*** hold the full Ethereum state. They must include the union of all **valid** transactions from all ILs in their proposed blocks. An IL transaction can only be excluded if it is invalid or if the block is full (i.e., [the conditional property](https://ethresear.ch/t/unconditional-inclusion-lists/18500) is satisfied).
    
    In a **VOPS** for Verkle world, block producers are responsible for generating and committing the following:
    
    - **A block-level witness** (e.g., an **IPA multiproof** over a Verkle tree): This proves that the provided data for the block execution exists in the previous block state root.
    - **Post-state root**: After executing all transactions, the block producer computes and commits the resulting `postStateRoot` in the block header. This serves as the output of execution and must be verified by attesters. This is already what block producers do today, and wouldn’t be a new requirement in a VOPS world.
- ***Attesters*** verify the block by performing the following steps:
    1. ✅ **Verify the block-level witness**: Confirm that all the provided state (proven via the IPA multiproof) are valid against the `preStateRoot`.
    2. ✅ **Re-execute the block** locally: Using the provided transactions, attesters independently re-execute the block starting from the pre-state (reconstructed from the witness) to recompute the `postStateRoot`.
    3. ✅ **Check the** `postStateRoot`: Ensure that the locally recomputed `postStateRoot` matches the one committed in the block.
    
    4. **✅ Validate IL conditions**
    
    - **Included IL transactions**
        - During local re-execution from the reconstructed pre-state, all state changes corresponding to IL transactions present in the block can be observed.
    - **Excluded IL transactions**
        - After executing all included transactions in the block, attempt to execute each excluded IL transaction:
            - If the transaction would fail nonce or balance checks, or if the block was full, the exclusion is justified.
            - Otherwise, the block producer is censoring and the block should not receive a vote.
    
    If all checks pass—validity of state access, correctness of execution, and satisfaction of IL conditions—**attesters vote for the block**. By re-executing blocks in **step 2** and simultaneously updating their local quadruplet tables in **step 3**, VOPS nodes keep their partial state perfectly in sync without ever storing the full Verkle tree.
    

### VOPS for zkVMs

Building on the Verkle flavour of VOPS, we can replace block‑level state proofs and local re‑execution with a zero-knowledge Virtual Machine (**zkVM)**. Each block would come with a **SNARK** that lets every verifier check the whole transition—and all IL conditions—by running a single, millisecond‑scale verification.

- **What *block producers* must prove:**
    - **State validity:** Every key/value read by transactions is proven against the `preStateRoot`.
    - **Execution correctness:** Executing the ordered transactions over that reconstructed pre-state yields the committed `postStateRoot`.
    - **Diff correctness:** Applying the correct full state diff to `preStateRoot` yields `postStateRoot`, and the diff matches the one embedded in the header.

**Block Header Fields**

| Field | Purpose |
| --- | --- |
| `preStateRoot` | State root before execution |
| `postStateRoot` | State root after execution |
| `stateDiff` | Merkle root of the complete list of every modified account leaf and storage slot |
| `execProof` | SNARK binding `transactions + stateDiff` to the transition `preStateRoot → postStateRoot` |

>Two notes:
> - Under VOPS and AA‑VOPS, nodes rely on receiving the full `stateDiff` per block to patch their local state. [EIP-7928 Block-Level Access Lists (BALs)](https://github.com/ethereum/EIPs/pull/9580/files) would provide exactly this: a verifiable, enforced publication of all modified accounts, storage keys, balances, and nonces. 
> - IL compliance is checked locally by VOPS nodes using their updated quadruplet tables and the received `stateDiff`—no extra proof obligation here (see AA-VOPS for where per-account proof ties into inclusion-list rules).


**Block-by-block routine for VOPS nodes**

1. **Verify** `execProof`**.** Confirms ✅ state validity, ✅ execution correctness, and ✅ diff correctness.
2. **Extract quadruplets.** From the verified full `stateDiff`, pull out each modified account’s `(address, nonce, balance, codeFlag)` and update the local table.
3. **Enforce IL rules.** Using the refreshed quadruplet table, re-check inclusion-list conditions locally. IL enforcement can be done out-of-the-proof using local checks with the stored VOPS-quadruplet fields.
4. **Prune the mempool.** Drop any pending transaction invalidated by the new quadruplet values.

**Resource profile**

| Aspect | Node | Block producer |
| --- | --- | --- |
| **Disk** | ≈ 8.4 GiB for the quadruplet table (≈ 25× smaller than full MPT state) | Unchanged |
| **Bandwidth** | `stateDiff` adds only a few tens of KB—negligible vs. current block limits | Almost unchanged, but a bit more upload bandwidth for witnesses |
| **CPU** | One fast SNARK verification per block (milliseconds on a laptop) | **Heavy** proving workload—still a lot costlier (multiple GPUs) than building Merkle/Verkle witnesses, though [improving](https://ethproofs.org/) [quickly](https://x.com/soispoke/status/1892528208957821345) |
| **Proof size** | Constant-size, verifiers always download the same few hundred bytes | Constant-size, ideally aiming for 128-256 KiB per proof |

**Bottom line.**

With ≈ 8.4 GiB of local state, unchanged mempool rules, and a single succinct proof per block, zkVM VOPS preserves Ethereum’s censorship-resistance while keeping verifier hardware requirements within consumer-grade limits.

### VOPS Syncing

Let’s start with an important note. In today’s [Verkle](https://eips.ethereum.org/EIPS/eip-6800) and [Binary tree](https://eips.ethereum.org/EIPS/eip-7864) proposals, accounts and storage slots are interleaved, unlike the Merkle Patricia Tree where accounts form a distinct subtrie. A VOPS node cannot reliably tell accounts apart from storage slots, and cannot simply download a snapshot to rebuild its local account table. Most isolated slots (>80%) can be filtered, but attackers could create fake account-like slots to slow down syncing. Syncing from genesis does not solve this, since current witness formats do not indicate whether a value is an account or a storage slot. Solving this would require richer witness formats, such as those proposed for [block-level access lists]((https://github.com/ethereum/EIPs/pull/9580/files)), or small changes to the tree structure.

Today, the account trie represents roughly `1/6` of the total state size. Assuming a snap sync approach, downloading just the account trie would make syncing about five to six times faster compared to downloading the full state, accounting for the healing phase. The healing phase would still take the same time as today, and much of the downloaded data would eventually be discarded, but syncing could happen from any full node, just like today.

Bootstrapping a VOPS node requires **only accounts state** (no storage tries or code blobs) along with the usual block headers:

1. **Header download and verification**
    - Fetch and verify block headers from genesis (or a trusted checkpoint) to the latest head.
2. **Block-by-Block Updates**
    
    For each new block:
    
    - **Retrieve:**
        - Verkle-tree: header + IPA multiproof + full transaction list
        - zkVM: header + SNARK `execProof` + compact `stateDiff` sidecar
    - **Verify & Extract:**
        - Verkle-tree: check the multiproof, extract all touched account entries, then re-execute every transaction in order against that reconstructed pre-state. Record each changed `(address, nonce, balance, codeFlag)`.
        - zkVM: verify the SNARK (state reads, execution, and IL rules) and parse the `stateDiff`sidecar list of updated quadruplets.
    - **Apply:** update the local table with each modified account entry.
3. **Mempool Pruning**
    - Upon each table update, drop any pending transaction whose sender now has a stale nonce, insufficient balance, or a `codeFlag` flip from 0→1 (retaining only the highest-priority pending tx for that address).
    - After processing all blocks to the head, the table is fully current and the mempool enforces valid-only admission/pruning exactly as in live operation.

## **VOPS and Native Account Abstraction (AA‑VOPS)**

**Native Account Abstraction (AA, see [EIP-7701](https://eips.ethereum.org/EIPS/eip-7701))** introduces a major paradigm shift: accounts are no longer simple objects with fixed validation rules, but programmable entities that can run arbitrary code. This flexibility breaks the assumption that checking just the `nonce`, `balance`, and `codeFlag` is enough to validate a transaction. As a result, VOPS needs an upgrade: **AA-VOPS**.

AA-VOPS extends VOPS to support native AA while keeping nodes lightweight, by avoiding full global state replication. Instead of requiring every node to track every account, each node only tracks the accounts it actively cares about (for its own EOAs or ones it interacts with), maintaining a small local cache that is updated incrementally over time.

While native AA unlocks powerful new capabilities, it also forces the ecosystem closer to strong statelessness designs, where transactions must carry explicit witnesses. As we extend VOPS to support AA-VOPS, we should carefully weigh whether the benefits of full native AA justify this added complexity, or if sticking to a simpler VOPS model better preserves decentralization and efficiency.

### **AA-VOPS vs Strong Statelessness**

**Strong statelessness** expects users to attach a full state witness to every transaction, covering all touched accounts and storage slots.

In contrast, **AA-VOPS** allows nodes to maintain up-to-date proofs only for specific accounts tied to their own EOAs. These proofs stay valid across multiple blocks unless the account changes and are refreshed using lightweight `stateDiffs` included with each block.

This avoids bulky witnesses on every transaction, keeping bandwidth and storage requirements minimal while preserving censorship-resistance and transaction validity.

### **How AA-VOPS Work**

**Local Cache and Witness Maintenance**

A node (or a wallet or dApp backend acting on its behalf) keeps:

- Its own account leaf: `nonce`, `balance`, `storageRoot`, and `codeHash`.
- Any extra storage slots required by the account’s AA logic.
- A Merkle or Verkle path witness authenticating these fields against a recent `stateRoot`.

The witness remains valid until a later block modifies any of the covered fields.

**Bootstrapping the witness:**

- The node obtains the initial leaf and path once, using `eth_getProof` from any full node or RPC provider (in Reth, you can now [get all the witnesses with a single RPC call](https://github.com/paradigmxyz/reth/blob/d69c42402fa9f9e9c24d73d59e4deeb82f1cdeb1/crates/trie/trie/src/proof/mod.rs#L104)).

**Incremental updates:**

Every block provides

1. A compact, full **`stateDiff`** (as in VOPS-with-zkVM).
2. An **IL commitment** (e.g., an aggregate of the 16 IL signatures). This commitment allows attesters to verify that the block producer committed to all ILs they observed locally.
3. A **block-level proof** (e.g., a SNARK) binding the `transactions`, the `stateDiff`, and the IL compliance rules together.

When a block arrives, the node:

1. **Verifies the block-level proof**, which ensures:
    - The `stateDiff` correctly encodes the transition from `preStateRoot` to `postStateRoot`.
    - All included transactions are executed correctly.
    - Each transaction in the IL set was either included or validly excluded (because the block was full or the transaction became invalid after prior execution).
    
    *(Optional optimization: Block producers could attach a "failure hint" for each excluded IL transaction, indicating the index in execution where it failed, reducing attester workload.)*
    
2. **Patches its witness if needed:**
    
    The VOPS node (or a wallet/dapp tracking its own EOAs) checks if any of its accounts appear in the `stateDiff`.
    
    - **If present**, it updates the cached leaf and recomputes affected Merkle/Verkle paths.
    - **If absent**, the cached witness remains valid against the new `stateRoot`.

If a node stays online and processes every block, it never needs another archive query after bootstrapping. If it falls behind, it can replay missing diffs or reseed its witness via `eth_getProof`.

### **Transaction Packaging**

When submitting a transaction:

- For EOAs and [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) accounts, no additional witness is needed. The minimal account fields are locally available.
- For [EIP-7701](https://eips.ethereum.org/EIPS/eip-7701) smart accounts, a succinct single-account validity proof (e.g., a SNARK) is attached, showing both inclusion of the account leaf and correct `VALIDATE` logic execution.

### **Future AA compatibility**

If future AA standards allow `VALIDATE` to read outside the account, the sender can widen the attached witness to cover those additional storage slots. The model extends naturally.

**Mempool Admission**

A receiving node verifies the witness or proof against the referenced `stateRoot`, using its cached `stateDiffs` to check for updates:

- If the diffs show the account has **not** changed, the transaction is accepted.
- If the diffs indicate the account **has** changed, the witness is stale and the node requests an updated proof.

In practice, nodes could also maintain a sliding window of recent stateDiffs—e.g., the last ~N blocks—to allow for transaction validation without re-querying.

### **Why AA-VOPS is Compelling**

- **No global replication:**
    
    Each node stores only a few kilobytes, not 8 GiB (VOPS) or ~233 GiB (full state). Block producers and RPC providers still need the full state.
    
- **AA compatibility:**
    
    Works with [EIP-7701](https://eips.ethereum.org/EIPS/eip-7701) today and can adapt if validation logic later reads external storage.
    
- **On-demand bootstrapping:**
    
    To track a new EOA, a node fetches a single `eth_getProof` once and keeps it fresh with diffs.
    

### **Trade-offs**

1. **Higher P2P bandwidth:**
    
    Every transaction carries its own witness or succinct proof, growing average transaction size (~736 bytes for Verkle, ~1024 bytes for binary trees).
    
2. **User-side proving or fetching:**
    
    Nodes must keep proofs current by tracking diffs or querying a full node, which is prone to centralization vectors. 
    
3. **Dependency on full nodes for bootstrapping:**
    
    Unlike VOPS, AA-VOPS depends on full nodes or RPC providers to initially fetch account proofs. If missing diffs, nodes must reseed via `eth_getProof`, potentially introducing centralization risks if few providers dominate.
    

## Conclusion and takeaways

**Validity‑Only Partial Statelessness** (**VOPS**) reduces local storage requirements for nodes to roughly 8.4 GiB uncompressed—just the `(address, nonce, balance, codeFlag)` quadruplets—while preserving Ethereum’s censorship‑resistance properties. This approach leverages the asymmetry between account and storage-slot growth: as long as storage continues to dominate new state entries, the savings remain substantial; should account creation ever outpace storage growth, the relative advantage would diminish accordingly.

There are two main advantages to VOPS in its original version: The first is a witness-free mempool: because every node stores each EOA’s `(address, nonce, balance, codeFlag)` quadruplet, the mempool never needs per-transaction Merkle or Verkle proofs. Block-level proofs (for example, SNARKs in a zkEVM) still guarantee full correctness while adding only a few hundred bytes to each block’s propagation. The second is truly peer-to-peer syncing: since every node maintains that minimal state for all EOAs, you can bootstrap or restore from any peer without needing additional proofs or individual account data, eliminating reliance on full or archive nodes.

But supporting native AA pushes us toward a different set of trade-offs. AA-VOPS cuts local storage to just a few kilobytes by attaching a small, up-to-date proof to each transaction, but the downside is higher P2P payloads and occasional calls to a full node or dedicated service whenever you start tracking a new account, bootstrap a node, or come back online after being offline. As proving technology and SNARKs continues to improve, AA-VOPS could become the long-term, future-proof route to full statelessness. The original VOPS, by contrast, stands out as a pragmatic short-term solution, preserving seamless UX by avoiding transaction-level witnesses.