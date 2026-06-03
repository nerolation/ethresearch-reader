Following a grant from the Ethereum Foundation I have recently added PeerDAS support to Constantine.

With careful engineering combined with state-of-the-art research, I managed to get a 30% acceleration over c-kzg-4844 while using 4x less memory for precomputation tables (and more memory → more acceleration), this should significantly help resource-constrained devices


| Benchmark                      | Precompute                 | c-kzg-4844 (serial) | constantine (serial) |   Δ%   |
|:-------------------------------|:---------------------------|:-------------------:|:--------------------:|:------:|
| blob_to_kzg_commitment         | —                          |      29.857 ms      |      19.556 ms       | -34.5% |
| compute_kzg_proof              | —                          |      31.482 ms      |      20.235 ms       | -35.7% |
| compute_blob_kzg_proof         | —                          |      31.691 ms      |      19.858 ms       | -37.3% |
| verify_kzg_proof               | —                          |      0.802 ms       |       0.568 ms       | -29.1% |
| verify_blob_kzg_proof          | —                          |      1.196 ms       |       0.955 ms       | -20.2% |
| verify_blob_kzg_proof_batch 1  | —                          |      1.203 ms       |       1.044 ms       | -13.2% |
| verify_blob_kzg_proof_batch 2  | —                          |      2.017 ms       |       1.608 ms       | -20.3% |
| verify_blob_kzg_proof_batch 4  | —                          |      3.600 ms       |       2.760 ms       | -23.3% |
| verify_blob_kzg_proof_batch 8  | —                          |      6.637 ms       |       4.967 ms       | -25.2% |
| verify_blob_kzg_proof_batch 16 | —                          |      13.056 ms      |       9.205 ms       | -29.5% |
| verify_blob_kzg_proof_batch 32 | —                          |      25.704 ms      |      17.765 ms       | -30.9% |
| verify_blob_kzg_proof_batch 64 | —                          |      51.174 ms      |      34.736 ms       | -32.1% |
| precompute_load (L0)           | —                          |     1163.746 ms     |          —           |   —    |
| **PeerDAS (EIP-7594)**         |                            |                     |                      |        |
| compute_cells                  | —                          |      1.932 ms       |       1.020 ms       | -47.2% |
| compute_cells_and_kzg_proofs   | no precomp                 |     183.384 ms      |      141.489 ms      | -22.8% |
| compute_cells_and_kzg_proofs   | ckzg precomp=1, 768 KiB    |     608.452 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=2, 1536 KiB   |     315.771 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=3, 3 MiB      |     226.319 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=4, 6 MiB      |     182.381 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=5, 12 MiB     |     156.495 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=6, 24 MiB     |     138.634 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=7, 48 MiB     |     129.472 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ckzg precomp=8, 96 MiB     |     120.608 ms      |          —           |   —    |
| compute_cells_and_kzg_proofs   | ctt t=64, b=6, 32.2 MiB    |          —          |      115.359 ms      |   —    |
| compute_cells_and_kzg_proofs   | ctt t=64, b=8, 96.0 MiB    |          —          |      105.269 ms      |   —    |
| compute_cells_and_kzg_proofs   | ctt t=64, b=10, 312.0 MiB  |          —          |      95.802 ms       |   —    |
| compute_cells_and_kzg_proofs   | ctt t=64, b=12, 1056.0 MiB |          —          |      87.591 ms       |   —    |
| compute_cells_and_kzg_proofs   | ctt t=128, b=6, 16.5 MiB   |          —          |      114.424 ms      |   —    |
| compute_cells_and_kzg_proofs   | ctt t=128, b=8, 48.0 MiB   |          —          |      101.874 ms      |   —    |
| compute_cells_and_kzg_proofs   | ctt t=128, b=10, 156.0 MiB |          —          |      95.423 ms       |   —    |
| compute_cells_and_kzg_proofs   | ctt t=128, b=12, 528.0 MiB |          —          |      88.957 ms       |   —    |
| compute_cells_and_kzg_proofs   | ctt t=256, b=6, 8.2 MiB    |          —          |      117.055 ms      |   —    |
| compute_cells_and_kzg_proofs   | ctt t=256, b=8, 24.0 MiB   |          —          |      98.698 ms       |   —    |
| compute_cells_and_kzg_proofs   | ctt t=256, b=10, 84.0 MiB  |          —          |      97.307 ms       |   —    |
| compute_cells_and_kzg_proofs   | ctt t=256, b=12, 288.0 MiB |          —          |      93.098 ms       |   —    |
| recover_cells_and_kzg_proofs¹  | see ¹                      |     137.245 ms      |      97.272 ms       | -29.1% |
| verify_cell_kzg_proof_batch²   | —                          |     439.979 ms      |      381.058 ms      | -13.4% |

**Notes:**
- ¹ Recovery: c-kzg-4844 uses precompute=8 (96 MiB); constantine uses t=256, b=8 (24 MiB)
- ² c-kzg-4844 verifies 8192 cells (64 blobs); constantine matches this config
- Δ% shows constantine relative to c-kzg-4844 (negative = faster)
- c-kzg-4844 precompute levels and constantine (t, b) configs are not directly comparable
- Precompute=8 (c-kzg-4844) trades 96 MiB memory for ~34% speedup in FK20 operations

**Some highlights:**

* For FK23 ( https://eprint.iacr.org/2023/033 - Fast amortized KZG proofs), rewriting the Toeplitz matrix multiplication with an accumulator API, delaying and batching as much as possible (field inversions, inverse FFTs, scalar muls) at the end, limiting allocations and strided iteration in hot path: https://github.com/mratsim/constantine/blob/e6bee85e8c7a89af279460e4ca03283d817d1ce9/constantine/math/matrix/toeplitz.nim (I had a perf bug that cost me 5x perf by not delaying inverse FFT and another 2x for not batching scalar multiplications https://github.com/mratsim/constantine/pull/616)

* And introducing precomputed MSMs like c-kzg-4844 but instead of the approach from BLST: https://github.com/supranational/blst/blob/e7f90de551e8df682f3cc99067d204d8b90d27ad/src/ec_mult.h#L87-L96 / https://github.com/ethereum/c-kzg-4844/blob/9f4bcc83cbb17b3dbc3432de7320790968143ab9/README.md?plain=1#L111
  ```C
  static void ptype##_precompute_w##SZ(ptype row[], const ptype *point) \
  { \
      size_t i, j; \
                                        /* row[-1] is implicit infinity */\
      vec_copy(&row[0], point, sizeof(ptype));        /* row[0]=p*1     */\
      ptype##_double(&row[1],  point);                /* row[1]=p*(1+1) */\
      for (i = 2, j = 1; i < 1<<(SZ-1); i += 2, j++) \
          ptype##_add(&row[i], &row[j], &row[j-1]),   /* row[2]=p*(2+1) */\
          ptype##_double(&row[i+1], &row[j]);         /* row[3]=p*(2+2) */\
  }                                                   /* row[4] ...     */\
  ```
  The precomputation table follows the techniques described by Gottfried Herold (https://hackmd.io/WfIjm0icSmSoqy2cfqenhQ) and Ignacio Hagopian ( https://hackmd.io/@jsign/vkt-another-iteration-of-vkt-msms ) → https://github.com/mratsim/constantine/blob/e6bee85e8c7a89af279460e4ca03283d817d1ce9/constantine/math/elliptic/ec_multi_scalar_mul_precomp.nim to get an incredible 4x reduction in memory while keeping and even improving over the 22.% advantage Constantine had without precompute tables

**On multithreading**

Contrary to EIP-4844, I haven’t parallelized PeerDAS yet but Constantine parallel backend is highly tuned (see vs go-kzg-4844 here https://ethresear.ch/t/releasing-constantine-v0-2-0-jan-2025-a-modular-cryptography-stack-for-ethereum/19990#p-48991-kzg-polynomial-commitment-for-eip-4844-consensus-layer-9 22% speedup) and can do nested parallelism with low overhead, in fact my MSM has 3 level of parallelism and the bottleneck of PeerDAS is an embarassingly parallel for loop over 128 precomputed MSMs: https://github.com/mratsim/constantine/blob/e6bee85e8c7a89af279460e4ca03283d817d1ce9/constantine/math/matrix/toeplitz.nim#L344-L362

```nim
proc finish*[EC, ECaff, F; N: static int](
  ctx: var ToeplitzAccumulator[EC, ECaff, F],
  output: var openArray[EC],
  polyphaseSpectrumBank: openArray[PrecomputedMSM[EC, N]]
): ToeplitzStatus {.raises: [], meter.} =
  ## Finalize using precomputed MSM tables (one per output position).
  ## For each output position `i`, extracts the `L` scalars from `coeffs`
  ## and computes `output[i]` using `polyphaseSpectrumBank[i].msm_vartime`.
  ## After all MSMs, an in-place EC IFFT is applied to `output`.
  let n = ctx.size
  if n == 0 or output.len != n or ctx.offset != ctx.L or polyphaseSpectrumBank.len != n or N != ctx.L:
    return Toeplitz_MismatchedSizes
  let scalars = cast[ptr UncheckedArray[F.getBigInt()]](ctx.scratchScalars)
  for i in 0 ..< n:
    for offset in 0 ..< ctx.L:
      scalars[offset].fromField(ctx.coeffs[i * ctx.L + offset])
    polyphaseSpectrumBank[i].msm_vartime(output[i], scalars.toOpenArray(ctx.L))
  checkReturn ec_ifft_nn(ctx.ecFftDesc, output, output)
  return Toeplitz_Success
```

*Hence assuming a mini-PC with 8 cores Zen 4 (Ryzen 7840HS is quite popular in laptops and mini-PCs), I'm quite confidence we can reach below 15 ms for proving 64 blobs.*

---

Related PRs:

* Initial structure: https://github.com/mratsim/constantine/pull/613
* C, Go, Rust API: https://github.com/mratsim/constantine/pull/617
* Final perf tuning with benches: https://github.com/mratsim/constantine/pull/619