*The Fusaka fork will introduce 1D, column-based data availability sampling, where each sample is a [column](https://github.com/ethereum/consensus-specs/blob/8410e4fa376b74f550d5981f4c42d6593401046c/specs/fulu/das-core.md#datacolumnsidecar) made up of cells and proofs from all blobs. After Fusaka, improving the propagation of columns is one of the main avenues to further increase the blob throughput, and the tools proposed to do so have so far been [moving from push-based gossip to an announce-and-pull/push hybrid](https://ethresear.ch/t/doubling-the-blob-count-with-gossipsub-v2-0/21893/1), and introducing some form of coding, like RS or [RLNC](https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370/1). In this post, we explore various ways to do the latter, while also making individual cells be the basic unit of propagation. Thanks to @asn, @dankrad, @arantxazapico, @b-wagn, @potuz, @MarcoPolo , @vbuterin for discussion and feedback.*

## Goals

1. **Efficient propagation**. Apply some form of erasure coding to column propagation, to unlock a better curve in the latency-bandwidth tradeoff space.
2. **Cell-centric gossip**. Make cells be the unit of propagation:
    - lets nodes use mempool blobs to contribute to propagation even when they only have a (non contiguous) subset of them (e.g. even when pulling a single blob)
    - possibly lets us eventually move to 1 message = 1 network packet. For example with 256 columns, 1 cell = 1 KB, and fits into one packet even with its KZG proof. 


Note that *2. is a fairly strong constraint*. If we just wanted to improve the CL propagation path, without concerning ourselves with the interaction with the EL mempool and distributed blob publishing, this would simplify things significantly for some of the designs, because we could work with fewer, larger chunks. However, the following exploration takes this constraint as a given.

In the rest of the doc, we'll by default assume 256 columns and 128 blobs total, unless otherwise specified. 

## Overview of Approaches

The designs we explore primarily differ along two axes:

1.  **Encoding Scheme:** How redundancy is introduced. We always take a cell to be the fundamental unit of the encoding scheme, and consider two possibilities, both of which consists of a linear combination of the cells in a column:
    * **Reed-Solomon (RS) coding:** Applying standard erasure coding vertically to columns (similar to how it's already used horizontally for rows in EIP-7594).
    * **Random Linear Network Coding (RLNC):** random linear combinations of the original cells in a column.
2.  **Gossip Verification Mechanism:** How nodes ensure the integrity and authenticity of the chunks they receive and forward during gossip, *before* reconstruction. For example, we could break a `DataColumnSidecar` up in chunks and encode it, but it would only be verifiable once the whole message is reconstructed, whereas we need each chunk to be independently verifiable. We ensure verifiability in one of the following ways:
    * **KZG Proof Verification:** Each cell, including the coded ones, carries its KZG proof, which is verified during gossip. KZG proofs for coded cells are also linear combinations of the original proofs, verified against linear combinations of the original commitments, taking advantage of the [linearity of KZG](#Appendix).
    * **Cell root verification:** The block commits to all cell roots, for both the original and coded ones. Lists of cell roots for each column are distributed in the respective subnets, and verified against the commitment in the block. Gossip verification involves a simple check against the relevant list. This approach does not allow recoding during propagation, because we can only verify the cells whose roots were committed to and distributed.
    * **Pedersen:** The proposer uses Pedersen vector commitments to commit to the base cells, and linear combinations are verified homomorphically against these. It's the approach from [this post](https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370?page=2), adapted to column propagation.


## RS

At a high level, we vertically extend the columns through RS encoding (the same used for the horizontal extension), and gossip individual cells. We consider two ways of doing so, which differ in the way they ensure integrity of the transmitted chunks:
1. **RS + KZG**: cells come with kzg proofs, which are verified before forwarding
2. **RS + cell roots**: the publisher commits to the cells in a simple way, e.g., sending lists of cell roots in the relevant subnets, and committing to these in the block. Forwarding just requires checking against these roots, not proof verification. 

The second option has much lower computational cost for the publisher, which does not need to do the expensive computation of *extension proofs*.

### RS + KZG

Each `DataColumnSidecar` subnet is replaced by a `CellSidecar` subnet, where all cells corresponding to the *vertically extended* column are gossiped. In addition, we have a *single, global* `HeaderSidecar` subnet, to gossip the signed header with all kzg commitments (and an inclusion proof). The `HeaderSidecar` topic would have a high-degree mesh, e.g. 30, to ensure that it propagates as fast as possible. We can accept a high duplication factor here, because the message is only a few KBs (most of the size is due to the `kzg_commitments`, ~6 KBs for 128 blobs)

```python
class CellSidecar(Container)
    cell: Cell
    row_index: RowIndex
    column_index: ColumnIndex
    kzg_proof: KZGProof
```

```python
class HeaderSidecar(Container):
    signed_block_header: SignedBeaconBlockHeader
    kzg_commitments: List[KZGCommitment, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    kzg_commitments_inclusion_proof: Vector[Bytes32, KZG_COMMITMENTS_INCLUSION_PROOF_DEPTH]
```


#### CellSidecar topic (subnet)
        
`cell_sidecar_{subnet_id}`

1. Reject if `subnet_id` does not match `compute_subnet_for_cell_sidecar(column_index)`
1. `CellSidecar` verification is put on halt until a `BeaconBlock` or a `HeaderSidecar` has been received. 
1. Once a `kzg_commitment` for `row_index` has been obtained, reject if kzg proof verification fails


While waiting for a matching `BeaconBlock` or`HeaderSidecar`, neither message delivery nor forwarding can happen. Therefore, whenever a peer sends us a cell that we cannot yet verify, we request a `HeaderSidecar` from them (these are quite small, and we can cap the number of parallel requests we send out). We could also downscore a peer that doesn't respond to this request after a timeout, to punish sending unverifiable cells.

Once a `HeaderSidecar` has been received, all kzg proof verifications can be scheduled flexibly, to maximize the benefits of batched verification.

#### HeaderSidecar topic (global)

`header_sidecar`

- Ignore if it is from a future slot or not from a slot greater than the latest finalized slot
- Reject if inclusion proof is not valid
- Reject if the header's signature is not valid
- Reject if the current finalized checkpoint is not an ancestor of `block_header.parent_root`
- Ignore if it is not the first sidecar for the tuple `(block_header.slot, block_header.proposer_index, sidecar.index)` with valid header signature and sidecar inclusion proof
- Reject if the proposer is not the expected one for `block_header.slot` in the context of the current shuffling, defined by `block_header.parent_root`.

#### KZG commitments for extension cells

The `HeaderSidecar` only contains the kzg commitments for the original cells. Verifying the extension cells requires us to interpolate the original commitments, i.e., compute $C' = M_{RS} \cdot C$ where $C = (C_1, \dots, C_{128})$, the original commitments, and $M_{RS}$ is the RS matrix. This requires 128 (one per commitment) 128-point MSMs in G1 , around ~130ms *multi-threaded* (~1ms per 128-point MSM on zka.lc). Note that the computation only has to be done once per node, when first receiving the `HeaderSidecar`.


We could in principle avoid repeating the computation at every node. `kzg_commitments` in the `HeaderSidecar` could contain *all* commitments, including the extension ones. These would need to be verified for consistency with the original ones, but that can be done faster than recomputation, by choosing a random scalar vector $r$ and checking $r^TC' = (r^T M_{RS}) \cdot C$. This only requires two 128-point MSMs in G1, ~2ms. The tradeoff is of course with bandwidth, as this would mean another ~6 KBs in the `HeaderSidecar`.


#### Computational cost

The most expensive operation is the computation of the proofs for the extension cells. One way to do so would be to interpolate the original proofs, in the same way as discussed for the extension of KZG commitments. For a given column $j$, this would involve 128 (one per proof) 128-point MSMs in G1, to compute $\pi_j' = M_{RS} \cdot \pi_j$ where $\pi_j = (\pi_{1j}, \dots, \pi_{128j})$, the vector of original proofs for column $j$. Using the numbers from zka.lc, this would be ~34s *already multi-threaded*. A further ~3x speedup could come from replacing multiplication by $M_{RS}$ with 2 FFTs.

However, a much more efficient way to accomplish this is to only do the vertical interpolation for the cells (which is cheap, in the field), and then compute the corresponding proofs from scratch, for each row, using FK20, exactly the same as for the original blobs. On Apple M4 Pro (not reference hardware, but arguably ok for local building), [this takes as low as ~80ms per blob, single-threaded](https://gist.github.com/jtraglia/698a4f7bd43764db19753f9fa046998e). For 128 blobs, that is ~10s *single-threaded*, certainly not a negligible cost in the critical path but much better than directly doing proof interpolation.

Removing this high computational cost at the publishing step is precisely why [proof computation for the original blobs has been moved out of the critical path by outsourcing it to tx senders](https://github.com/ethereum/EIPs/blob/015f08bba346696a02379f1dec40cd38db38b2c9/EIPS/eip-7594.md#networking). Unfortunately, proof computation for the vertical extension can *neither be outsourced nor precomputed as we get blobs from the mempool*, because we need *all blobs* that will go in the block to do it. 


#### RLC + KZG (small scalars)

We could replace RS with RLC, a random linear code, just as used in RL**N**C. However, the coding would only happen at the source, i.e., the publisher, not also at intermediate nodes. In other words, we replace the $M_{RS}$ matrix with a *random* matrix $M_{RLC}$, and otherwise do everything exactly as in RS + KZG. The reason to do this is that we can choose the entries of $M_{RLC}$ from a smaller range than the full field, to have faster computations. The trade off is giving up the FFT optimizations of RS encoding and weakening its optimal reconstruction guarantees, i.e., requiring more than its optimal 50% reconstruction threshold (exactly how much more depends on the range that the scalars are sampled from). 

With 1-byte coefficients, we get 32x lower computational load for the proposer, *compared to the naive approach of directly interpolating proofs*, without FFTs and not using FK20 on the extended rows instead. Extrapolating from the previous benchmarks, this would be ~1s, already multi-threaded. Benchmarking on the same machine would be needed to compare this to the FK20 benchmark of ~10s single-threaded.

#### Distributing the vertical extension

Another way to lighten the computational load on the proposer is to distribute it to other network participants. As already mentioned, we can't quite distribute it *away from the critical path*, since the extension can only be computed once blobs and their order have been chosen. What we can do is to have network participants compute individual extension proofs on the fly, from the original cell proofs, and then forward them along with cells. 

```python
class CellSidecar(Container)
    cell: Cell
    row_index: RowIndex
    column_index: ColumnIndex
    kzg_proof: Optional[KZGProof]

class HeaderSidecar(Container):
    signed_block_header: SignedBeaconBlockHeader
    column_sidecar_roots: List[Root, NUMBER_OF_COLUMNS]
    column_sidecar_roots_inclusion_proof: Vector[Bytes32, COLUMN_SIDECAR_ROOTS_INCLUSION_PROOF_DEPTH]
    kzg_commitments: List[KZGCommitment, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    kzg_commitments_inclusion_proof: Vector[Bytes32, KZG_COMMITMENTS_INCLUSION_PROOF_DEPTH]

class ColumnSidecar(Container):
    column_index: ColumnIndex
    kzg_proofs: List[KZGProof, MAX_BLOB_COMMITMENTS_PER_BLOCK]
```

Firstly, the `kzg_proof` in a `CellSidecar` becomes optional, to allow the proposer to send extension cells without proofs. Then, we add `column_sidecar` topics, to which only nodes interested in a certain column subscribe, to get all `kzg_proofs` for that column. Column sidecars are verified against a root included in the `HeaderSidecar`, itself verified with an inclusion proof against the block body. 

When a node receives an extension cell *without a proof*, it does the following:
1. Wait to receive a `HeaderSidecar` (as before) *and a `ColumnSidecar` with matching index* (new).
2. Interpolate the cell proofs from the `ColumnSidecar`, using the corresponding row of $M_{RS}$, e.g. $M_{RS}[i, :] \cdot \pi_j$ to get the $i^{th}$ extension proof for column $j$, given the original proofs $\pi_j$
3. Verify the `CellSidecar` with the computed proof
4. If successful, add the computed proof to the `CellSidecar` and forward it. If not, discard the cell (failed gossip validation)

Essentially, the first node(s) to receive an extension cell does the proof computation for it, while afterwards everything proceeds as before. Cell sidecars without proofs aren't treated as fundamentally different messages than the ones with proofs, as ultimately the delivered message is the same, including the proof. There's just an extra step of computing the proof and reconstructing the message as part of gossip validation. 

*Note: a small downside is that the original cell proofs are duplicated, travelling both in the cell sidecars and in the column sidecars.*


### RS + cell roots

Let's consider a different approach, which avoids the high cost of computing the extension proofs, by using a much simpler way ensure integrity of the cells.  The erasure coding is limited to the cells, and accordingly gossip validation does *not* require KZG proof verification (not even for the original cells). Instead, it relies on checking against a list of `cell_roots` that is sent sent separately in the same topic, as part of a `ColumnSidecar`. In turn, this is verified against a list of column sidecar roots, included in the `HeaderSidecar` and committed to in the block. 

```python
# Column topic

# Without a kzg proof
class CellSidecar(Container)
    cell: Cell
    row_index: RowIndex
    column_index: ColumnIndex

# New sidecar with commitments to all cells and carrying the proofs
class ColumnSidecar(Container):
    column_index: ColumnIndex
    cell_roots: List[Root, 2 * MAX_BLOB_COMMITMENTS_PER_BLOCK]
    kzg_proofs: List[KZGProof, MAX_BLOB_COMMITMENTS_PER_BLOCK]
```
    
```python
# Global topics

# Adding a commitment to the column sidecars
class HeaderSidecar(Container):
    signed_block_header: SignedBeaconBlockHeader
    column_sidecar_roots: List[Root, NUMBER_OF_COLUMNS]
    column_sidecar_roots_inclusion_proof: Vector[Bytes32, COLUMN_SIDECAR_ROOTS_INCLUSION_PROOF_DEPTH]
    kzg_commitments: List[KZGCommitment, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    kzg_commitments_inclusion_proof: Vector[Bytes32, KZG_COMMITMENTS_INCLUSION_PROOF_DEPTH]
    
class BeaconBlockBody(Container):
    ...
    # need a better name
    column_sidecar_roots_root: Root
  

```


As before, we propagate a `HeaderSidecar` in a global topic. In addition to its previous content, it now contains a list of roots, `column_sidecar_roots`, plus an inclusion proof`column_sidecar_roots_inclusion_proof` against `header.body_root`. The `BeaconBlockBody` itself only contains a commitment to the`column_sidecar_roots`, i.e., `column_sidecar_roots_root = hash_tree_root(column_sidecar_roots)`.


In the subnet for a given column, we propagate:
1. `column_sidecar`, containing `cell_roots`, committing to all cells for the given column, including those for the extension cells, and moreover containing all `kzg_proofs`. For gossip validation, we check `hash_tree_root(column_sidecar) == header_sidecar.column_sidecar_roots[column_sidecar.column_index]`. Note that the `kzg_proofs` are *not* verified as part of gossip validation.
2. `cell_sidecar` corresponding to this column. For gossip validation, we check that `column_sidecar.cell_roots[cell_sidecar.row_index] == hash_tree_root(cell_sidecar.cell)`.

Some notes:
- The publisher does not need to do any heavy computation, just simple erasure coding of the cells (not in the group) and hashing.
- Since we are verifying the cell sidecars against `cell_roots` (itself in turn verified against `column_sidecar_roots`), we don't need to verify a `kzg_proof` as part of forwarding, so kzg verification does not slow down propagation.
- We do need to verify all kzg proofs for a column before considering it available (and attesting). The kzg proofs are contained in the `ColumnSidecar`, and can be verified as soon as the respective cells are also received. Since kzg proof verification is decoupled from forwarding, this can be done while maximally taking advantage of batching.
- Just like in the RS + KZG scheme, the interaction with `getBlobs` is ideal: when we retrieve a blob from the mempool, we get a full `CellSidecar` for each column, which we can immediately propagate
- All benefits from the RS + KZG scheme apply here as well.

#### Proposer without the blob data

In RS + KZG case, as well as in the Fusaka protocol, a proposer that *somehow* knows the blobs associated to a list of blob txs are available, without having downloaded them, could just include those txs, and the respective KZG commitments, and entirely rely on distributed blob publishing to propagate the actual blob data on the CL (whether cells or data column sidecars). This could for example be the case if a committee attests to the availability of mempool txs.

On the other hand, this protocol does not allow the proposer to do so, because having the cells (or to be precise the `cell_roots`) and the `kzg_proofs` is required in order to create the `column_sidecar`s, which are themselves needed in order for `cell_sidecar` propagation to happen. Note that the `column_sidecar`s have to also be committed to in the block, so the proposer really needs them at block creation time. 



## RLNC

Here we consider two ways to adopt [this proposal](https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370) to our goals for column propagation. In both cases, we use cell-level chunks, and the main difference is in how we verify chunks during propagation: one option is to reuse KZG proofs, the other to stick with Pedersen commitments as in the post. 



### RLNC + KZG



We can leverage the [linearity property of KZG commitments and proofs](#Appendix) to enable RLNC for column propagation, while maintaining the verifiability of the recombined chunks tied back to the original KZG row commitments:
- Chunks correspond to cells, due to our initial goal of cell-centric gossip. They travel with and are verified via kzg proofs, so that doing a random linear combination of chunks necessitates also doing the same linear combination of the associated proofs, to produce the proof for the recombined chunk.
- Verifying a chunk necessitates computing the corresponding KZG commitment, which is the linear combination of the original commitments, with the given scalars. 


#### Protocol

1.  **Base Chunks:** The fundamental unit (chunk) of RLNC is a cell, and the original cells are the base chunks that we want to transmit. Let $v_{ij}$ denote the data payload (field elements) of the cell at row $i$ and column $j$. Associated with $v_{ij}$ is its KZG proof $\pi_{ij}$ (proving the evaluation against the row commitment $C_i$).
3.  **Coded Chunks & Representation:** Any chunk $v$ propagated via RLNC represents a linear combination of the base chunks for that column $j$, $v = \sum_i s_i v_{ij}$. Each chunk $v$ is transmitted along with its corresponding aggregated KZG proof $\pi = \sum_i s_i \pi_{ij}$ and the vector of scalars $s = (s_i)_i$ defining the combination. For the base chunk $v_{ij}$, the scalar vector $s$ is simply given by $s_k = 1$ if $k=i$ and $0$ otherwise.
4.  **RLNC Encoding (Re-coding):** A node possessing a set of input chunks $(v_k, \pi_k, s_k)_k$ for column $j$ (where each $s_k = (s_{ki})_i$ so $v_k = \sum_i s_{ki} v_{ij}$ and $\pi_k = \sum_i s_{ki} \pi_{ij}$) can create a new coded chunk. It selects a set of random scalars $(r_k)_k$ and computes:
    * **Coded Data:** $v = \sum_k r_k v_k$.
    * **New Scalars:** The new vector of scalars $s' = (s'_i)_i$ such that $v = \sum_i s_i' v_{ij}$. For this, $s'_i = \sum_k r_k s_{ki}$.
    * **Coded Proof:** $\pi = \sum_k r_k \pi_k$. (Note that this is equivalent to $\pi = \sum_i s'_i \pi_{ij}$).
5.  **RLNC Packet:** The node gossips a packet containing $(v, \pi, s')$. To fit the existing sidecar structure, this can be represented as a `CellSidecar` where `cell` holds $v$, `kzg_proof` holds $\pi$, and the new `rlnc_scalars` field holds $s$. The `column_index` is retained, but `row_index` is repleced by `rlnc_scalars`, since the packet represents a combination of rows.
    ```python
    class CellSidecar(Container):
        cell: Cell
        column_index: ColumnIndex
        kzg_proof: KZGProof 
        rlnc_scalars: List[Bytes32, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    ```
5.  **Verification:** A node receives $(v, \pi, s)$ for column $j$
    * It has the original row commitments $C_i$ from the `HeaderSidecar` (same as in the RS + KZG approach).
    * It computes the combined commitment: $C = \sum_i s_i C_i$.
    * It verifies the KZG proof $\pi$ against the coded data $v$ and the combined commitment $C$, using the evaluation points corresponding to $j$ (`column_index`).



#### Scalar Size and Overhead

A concern with RLNC is the overhead of transmitting the scalar vector $s = (s_i)_i$ (`rlnc_scalars)`. Let $N$ be the number of base chunks (original rows/cells per column, e.g., 128).

* **Full-Size Scalars:** If $s_i$ are full 32-byte scalars, the overhead is $32N$ bytes, i.e. $128 \times 32 = 4096$ bytes, prohibitively high.
* **Small Scalars:** When recombining chunks, we could always choose new scalars $r_k$ from a smaller range (e.g., 1 byte, 0-255). This still gives us a high probability of sending a useful chunk (if at all possible), $\ge 1 - 1/256 \approx 99.6$%. Initial overhead is low (e.g., $N \times 1 = 128$ bytes with 1-byte scalars).
* **Scalar Blow-up:** Re-coding computes $s'_i = \sum_k r_k s_{ki}$. If $s_{ki}$ requires $B_s$ bits and $r_k$ requires $B_b$ bits, $s'_i$ requires roughly $B_s + B_r + \log_2(m)$ bits, where $m$ is the number of terms combined. Bit length grows roughly linearly with the number of re-coding hops ($h$). Starting with 1-byte scalars ($B=8$) and having $m=128$ terms (so $\log_2(m) = 7$), scalars might need roughly $B + h(B+7)$ after $h$ hops. Assuming  propagation needs $h=4$ hops,  that's $\approx 8$ bytes (68 bits) at the last hop. For $N =128$, total overhead *at the last hop* would be $128 \times 8$ bytes, i.e., $1$ KB.

##### Fighting the scalar blow-up

We could try out different strategies to reduce the blow-up. For example, we could *only recode when we have at least M chunks* for some $M$ to figure out experimentally. The idea here would be to directly forward chunks in the earlier phases of propagation, when duplicates are less likely, and to only do recoding when it is most useful (somewhat related to [push-pull phase transition](https://ethresear.ch/t/pppt-fighting-the-gossipsub-overhead-with-push-pull-phase-transition/22118)). That way, the first few hops don't blow-up the scalars at all. Note also that part of the reason to do recoding is that it lets you avoid needing to choose which chunks to prioritize when you're bandwidth constrained: if you are not bandwidth constrained, you could always just send all the chunks you have to every peer, but if you are bandwidth constrained it is best to send as many *recoded* chunks are you are able, to maximize the chances of the chunks you send being useful to the receiver. When you don't yet have many chunks and you can forward all of them (and presumably the receiver downlink is similarly not saturated), recoding isn't as useful. 

However, something to keep in mind is that a malicious node can always immediately send out messages with scalars of the maximum allowed size.

#### Computational Cost

* **Sender:** To combine $m$ received packets $(v_k, \pi_k, s_k)$ using coefficients $r_k$, the bulk of the cost is computing $\pi = \sum r_k \pi_k$, which requires one m-term G1 MSM. At worst $m = 128$. As we've already seen in the RS + KZG case, this takes ~1ms on zka.lc, already multi-threaded. This is for full scalars. With 1-byte scalars, the cost becomes 32x smaller, and close to negligible.
* **Receiver:** To verify a received packet $(v, \pi, s)$ where $s$ has $m$ non-zero entries, the bulk of the cost is:
    * Compute $C = \sum_i s_i C_i$, which again requires one $m$-term G1 MSM (~1ms)
    * Verify the kzg proof for $(v, \pi, C)$, requiring 2 pairings (~1.5ms)
    Note that, even if we use 1-byte scalars, the $s_i$ here are not freshly generated scalars, and are thus subject to blow-up, whereas the linear combination of proofs done by the sender directly uses the newly generated small scalars, and thus always maintains the same speedup. However even with some blow-up, the pairings would dominate the cost here.
* **Proposer:** To generate $R$ coded chunks for a column, the proposer incurs the worst case cost of the sender of a packet $R$ times, i.e., $R$ 128-term G1 MSMs. It needs to this *for each column*, so 256 times. To tolerate a loss of  ~50% of the chunks, we need $R = 256$, so the cost is $256 \times (128\text{-term MSM})$ per column. Alternatively, the proposer could publish the original chunks (base cells $v_{ij}$ with their proofs $\pi_{ij}$) as well, and only generate $R = 128$ coded chunks (or less, depending on what the desired redundancy is).


Using the latter strategy, the cost for the proposer is the same as in RS + KZG, which makes sense since we're essentially also erasure coding the block with a 1/2 rate, but with a random code. Unlike RS + KZG, we cannot even benefit from FFTs since the code is not structured that way. However, there's a big advantage if we use 1-byte scalars instead of full (32-byte) scalars, as this should result in a roughly ~32x speedup in the MSMs, bringing the cost down to ~1s.

### RLNC + Pedersen

Let's now discuss the approach from [the RLNC ethresearch post](https://ethresear.ch/t/faster-block-blob-propagation-in-ethereum/21370/1), which uses Pedersen commitments to guarantee integrity of the recoded chunks. A lot of what follows is just re-stating what's in the post, for the specific case of propagating columns, and reasoning through the concrete overheads.

#### Protocol

1.  **Base Chunks & Commitments:** The base chunk is still a cell $v_{ij}$, seen as a vector of $M=32$ field elements $(v_{ijk})_k$ (for 256 columns). The proposer computes a **Pedersen Vector Commitment** for each base cell using $M=32$ fixed generator points $G_l$: $C_{ij} = \sum_{l=1}^{32} v_{ijk} G_l$. These original commitments $C_{0j}, ..., C_{N-1, j}$ (where N=128 is the number of original cells per column) can, much like the `cell_roots` of the RS + cell roots approach, be distributed in a `ColumnSidecar` which is itself committed to in the block.
    ```python
    class ColumnSidecar(Container):
        column_index: ColumnIndex
        pedersen_commitments: List[PedersenCommitment, MAX_BLOB_COMMITMENTS_PER_BLOCK]
        kzg_proofs: List[KZGProof, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    ```
3.  **Coded Chunks & Representation:** Any chunk $v$ propagated represents a linear combination of base chunks for column $j$, $v = \sum_i s_i v_{ij}$.
4.  **RLNC Encoding (Re-coding):** A node takes input chunks $(v_k, s_k)_k$ (where $s_k = (s_{ki})_i$ defines $v_k = \sum_i s_{ki} v_{ij}$). It selects random scalars $(r_k)_k$, and computes:
    * **Coded Data:** $v = \sum_k r_k v_k$.
    * **New Scalars:** $s' = (s'_i)_i$ where $s'_i = \sum_k r_k s_{ki}$.
5.  **RLNC Packet:** The node gossips $(v, s')$, in this form:
    ```python
    class CellSidecar(Container):
        cell: Cell
        column_index: ColumnIndex
        rlnc_scalars: List[Bytes32, MAX_BLOB_COMMITMENTS_PER_BLOCK]
    ```
5.  **Verification:** A node receives $(v, s')$.
    * It obtains the original base Pedersen commitments $C_{ij}$ for column $j$ from the `ColumnSidecar`.
    * It computes the expected combined commitment based on the scalars: $C' = \sum_i s'_i C_{ij}$.
    * It directly computes the commitment for $v$: $C = \sum_{l=1}^{32} v_l G_l$.
    * It verifies if $C' = C$.

#### Computational Cost

* **Proposer:**
    * Has to compute one Pedersen Vector Commitment $C_{ij} = \sum_{l=1}^{32} a_{ij,l} G_l$ for each original cell ($i=0..N-1$). This requires one M-term (32-term) MSM in the group per original cell, and 128 such MSMs per column. For all 256 columns, that's still 32768 MSMs like in the RS + KZG and RLNC + KZG cases, but with each MSM having 32 terms instead of 128. Still prohibitively high.
* **Sender (Intermediate Node re-coding):** Only cheap data and scalar arithmetic ($v = \sum r_k v_k$, $s' = \sum r_k s_k$). No group arithmetic, negligible cost.
* **Receiver (Verifying Packet):** one $128$-term MSM in the group ($\sum_i s'_i C_{ij}$), and one M-term (32-term) MSM in the group ($\sum_{l=1}^{32} v_l G_l$)

A couple of comments:
- Unlike the RLNC + KZG case, using 1-byte scalars does **not** reduce the computational overhead for the publisher, since this is due to having to compute the Pedersen commitments to the original cells, not related to recombined chunks
- Just like we have [outsourced kzg proof computation to the tx senders](https://github.com/ethereum/EIPs/blob/015f08bba346696a02379f1dec40cd38db38b2c9/EIPS/eip-7594.md#networking), we could in principle outsource the computation of Pedersen commitments, making the computational load on the proposer very low.

## Benefits

Let's briefly discuss the advantages of this class of designs, without focusing on any the differences due to RLNC vs RS etc...

### Publishing

To publish blob data, a proposer/builder can do the following:
1. First send out the `HeaderSidecar`
2. For each column, distribute all corresponding cell sidecars to peers in that subnet, by sending each cell to a single peer, e.g., if the block contains 60 blobs (thus extended columns have 120 cells) and you have 20 peers in a given subnet, send 6 cells to each peer.

This only requires the proposer to send out 4x the original data (2x due to the horizontal extension for DAS, and then another 2x for redundancy in the propagation), rather than the current 16x (2x also due to the horizontal extension of blobs, then each column sent to 8 peers). 


Note that the publishing step cannot be improved only by [moving from push to announce and pull](https://ethresear.ch/t/doubling-the-blob-count-with-gossipsub-v2-0/21893/2?u=fradamt), since all messages from the publisher would be pulled. A more interesting comparison would be with the current system, sending full columns via push, augmented with [batch publishing](https://ethresear.ch/t/improving-das-performance-with-gossipsub-batch-publishing/21713), i.e., prioritizing publishing a first copy of each column in each subnet. Even with that, having at least some redundancy for each column requires publishing at least 2 copies per column, and thus sending 4x of the data, just like with erasure coding. At the same bandwidth cost, erasure coding the columns is much more robust, and much less prone to be slowed down by a few failures.

### Propagation after publishing

Overall, erasure coding lets us have a high level of redundancy and a high branching factor (how many peers we forward *something* to, which determines how quickly we can tap into a larger portion of the bandwidth pool of the network), without paying a huge bandwidth cost for it. In contrast, the mesh size in GossipSub can be seen as trading off between redundancy and branching factor on the one end, and duplication factor on the other end.


### Distributed block publishing

With cell gossiping, anyone who has seen a blob can construct all associated cell sidecars, and thus it can contribute to cell propagation as soon as it sees the relevant`BeaconBlock` or `HeaderSidecar`. It does not need to know *all blobs*, which would instead be required to construct a `DataColumnSidecar`.

### Distributed reconstruction

Currently, reconstruction depends on nodes that subscribe to all subnets. If we added row subnets and allowed cells to be gossiped in them, instead of only full blobs/rows, reconstruction could happen row by row, letting any node contribute to it. Being able to gossip cells in the column subnets would then also be required in order for the reconstructed cells to move from the row subnets to the column subnets and heal the latter as well, again without the need of nodes that participate in all row subnets.

## Summary table

The computation times are all based on multi-threaded benchmarks from zka.lc, except for the publisher cost of RS + KZG.

|Approach | **Publisher computational cost** | **Per-hop work** | **Extra bytes per cell**|
|--- | --- | --- | ---|
|**RS + KZG** | **High** ≈ 10s *single-threaded* (128 FK20, M4 Pro benchmark) | Send: just forward <br> Receive: ≈ 1.5ms, verify KZG proof (2 pairings) | **Low**: +48 B (KZG proof), ~5%|
|**RLC + KZG** (1-byte coefficients) | **High** ≈ 1s, RS encoding the proofs (32 768 × 128-pt G1 MSMs or 512 G1 FFTs, 32× faster MSMs) | Send: just forward <br> Receive:  ≈ 1.5ms, verify KZG proof (2 pairings) | **Low**: +48 B (KZG proof), ~5%|
|**RS + KZG** (distributed proof computation) | **Low** (No group MSMs) | Send: just forward <br> Receive: ≈1.5ms after first hop, verify KZG proof (2 pairings), ≈ 2.5ms first hop, also compute missing cell proof (128-pt G1 MSMs)| **Low**: +48 B in cell sidecars, +72B *on average* including column sidecars, ~7.5% (duplicated original cell proofs)|
|**RLC + KZG** (1-byte coefficients + distributed proof computation) | **Low** (No group MSMs) | Send: just forward <br> Receive: ≈1.5ms, verify KZG proof (2 pairings), *negligible cell proof computation*| **Low**: +48 B in cell sidecars, +72B *on average* including column sidecars, ~7.5% (duplicated original cell proofs)|
|**RS + cell roots** | **Low** (RS encode the cells, no group MSMs) | Negligible | **Low**: In cell sidecar: 0 <br> Total with column sidecar: ~11%|
|**RLNC + KZG** | **Very high** ≈ 68s (65 536 × 128-pt G1 MSMs) | Send: 128-pt G1 MSM (≈ 1ms) <br> Receive: 128-pt G1 MSM + 2 pairings (≈ 2.5ms) | **Very high:** +4.1 kB (scalar vector) +48 B (proof), ~4x overhead|
|**RLNC + KZG** (1-byte scalars) | **High** ≈ 1s (as in RLC with 1-byte scalars + KZG) | Send: low (MSM with 1-byte scalars) <br> Receive: Even with scalar blow-up, cost mostly dominated by 2 pairings (≈ 2.5ms) | **High**: +1KB at last hop, up to ~100%|
|**RLNC + Pedersen** (1-byte scalars) | **Very high** ≈ 22s (32 768 × 32-pt MSMs in curve25519) | Send: negligible <br> Receive: ≈ 3ms one 128-pt + one 32-pt MSM in curve25519 | **High** +1KB B at last hop, up to ~100%|
|**RLNC + Pedersen** (1-byte scalars, txs include Pedersen commitments) | **Low** (no group MSMs) | Send: negligible <br> Receive: ≈ 3ms one 128-pt + one 32-pt MSM in curve25519 | **High** +1KB B at last hop, up to ~100%|


## Appendix

### Linearity of KZG commitments and proofs 

KZG commitments and proofs have this very useful linearity property, which we use both in RS + KZG and in RLNC + KZG, in order to generate the proof for the extension/recoded cells:
> Consider evaluation points $(x_j)_j$ and (values, commitment, proof) triples $((y_{ij})_j, C_i, \pi_i)$, proving that $p_i(x_j) = y_{ij}$ for all $j$, for the polynomial $p_i$ such that $[p_i(s)] = C_i$. Given scalars $(r_i)_i$, the triple $((y_j)_j, C, \pi) = ((\sum_i r_i y_{ij})_j, \sum_i r_i C_i, \sum_i r_i \pi_i)$ is such that $C = [p(s)]$ is a commitment to the polynomial $p(x) = \sum_i r_i p_i(x)$ and $\pi$ is a valid proof that $p(x_j) = y_j$ for all $j$.

For the interested readers, here's a short explanation of this, mostly based on [this great reference](https://dankradfeist.de/ethereum/2020/06/16/kate-polynomial-commitments.html):

> Let $I_i(x) = \sum_j y_{ij} \prod_{k\neq j}  \frac{x-x_k}{x_j - x_k}$ be the interpolation polynomial for $(x_j, y_{ij})_j$ and $Z(x) = \prod_j{(x - x_j)}$ be the vanishing polynomial over $(x_j)_j$. The proof for $p_i(x)$ at $(x_j)_j$ is $\pi_i = [q_i(s)]$ with $q_i(x) = \frac{p(x) - I_i(x)}{Z(x)}$.
$I(x) = \sum_i r_i I_i(x)$ is the interpolation polynomial for $p(x) = \sum_i r_i p_i(x)$ over $(x_j, y_{ij})_j$, because $I(x_j) = \sum_i r_i I_i(x_j) = \sum_i r_i p_i(x_j) = p(x_j)$.
Then, the quotient polynomial to produce the proof for $p(x)$ at $(x_j)_j$ is $q(x) = \frac{p(x) - I(x)}{Z(x)} = \frac{\sum_i r_i p_i(x) - \sum_i r_i I_i(x)}{Z(x)} = \sum_i r_i\frac{p_i(x) - I_i(x)}{Z(x)} = \sum_i r_i q_i(x)$. The proof is $[q(x)] = [\sum_i r_iq_i(x)] = \sum_i r_i[q_i(x)] = \sum_i r_i\pi_i$.


### Validation rationale

At first glance, cell sidecars seem dangerous because they can be completely arbitrary pieces of data, not tied to any block or slot or proposer. However, note first of all that a malicious node *does not* gain the ability to propagate a bad cell (not tied to any block) beyond its mesh peers, because forwarding requires waiting for a `HeaderSidecar`, and possibly a `ColumnSidecar` as well depending on which design, and performing verifications that prove that the cell is indeed tied to a block. What a malicious node can do is only to send a bad cell sidecar to a mesh peer.

It might appear as though even this weaker form of malicious behavior is not possible with a `DataColumnSidecar`, at least not without being downscored, because a column sidecar contains the equivalent of a `HeaderSidecar` and is thus independently verifiable. In fact, this is not quite the case: verification of a column sidecar hinges upon verification of the signed beacon block header it contains, and this has a dependency on its chain: if you don't know the shuffle for the chain to which the header belongs, you cannot verify it. 

Concretely, a peer can always send you a header with a valid signature but a made up parent root, such that you can never retrieve its chain and figure out if the proposer is the correct one. Therefore, you also can't be sure that it is invalid, and any downscoring would at best have to depend on timing, e.g., you downscore if the message stays unverifiable for too long, because you cannot retrieve its dependencies. This is exactly the same situation that a node would find itself in if it received a cell sidecar such that it can't retrieve a corresponding `HeaderSidecar` and possibly `ColumnSidecar`.