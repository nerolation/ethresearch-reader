# Constantine announcements

- v0.1.0 (Jul 2024)
- v0.2.0 (Jan 2025, [direct link](https://ethresear.ch/t/releasing-constantine-v0-2-0-jan-2025-a-modular-cryptography-stack-for-ethereum/19990/2))

# Constantine v0.1.0 announcement (Jul 2024)
I am very proud to release the very first version of [Constantine](https://github.com/mratsim/constantine), a high-performance modular cryptography stack for blockchains and proof systems.
It is currently as of July 2024 the fastest implementation of Ethereum-specific cryptographic primitives:
- BLS signatures
- BN254 precompiles (EIP-196 and EIP-197, repriced in EIP-1108)
- BLS12-381 precompiles (EIP-2537)
- KZG Polynomial commitments (EIP-4844)

Constantine has bindings in C, Go, Nim and Rust.

## History

Constantine is written in [Nim](https://nim-lang.org/), the language was chosen by Status for Nimbus for its expressiveness, its type system strength, the ease to wrap C and C++ and syntactic closeness to Python so that ethereum/research and PyEVM could be ported with ease.

In February 2018, after woes with C++ in Nimbus, the first library I built was a fixed precision big integer library for uint256.
Then we (at Status) realized that we would also need elliptic curves for secp256k1 and BN254 (also known as BN256 or alt_bn128).

How hard could it be to implement elliptic curves, with cryptographic hardening, once you know how to write big integers?

Turned out it was too hard, after a week or so another approach was taken for time-to-market and correctness reasons:
- Use libsecp256k1 from Bitcoin
- Port 1-1 bncurves from Zcash for BN254
- Use Apache Milagro for BLS12-381

It was then restarted as a personal side-project in February 2020 after learning a lot from implementing hashing-to-curve and Ethereum BLS signatures and identifying significant performance gap. _Note that this predates BLST which was initially released in June 2020._

Since then Constantine has seen regular contributions (sometimes with couple months gap) up to where it is today.

## Performance

### Ethereum BLS signatures (Consensus Layer)

Benchmarks are done on an AMD Ryzen 7840U, a low-power ultra-mobile 8-core CPU from 2023.

#### BLST (through nim-blscurve)

Nim-blscurve is the backend of Nimbus-eth2. As Nim compiles to machine code through C (or C++), calling C has zero-overhead from Nim.

Repro.
Install the latest Nim version, Nim v2.0.8.

```
git clone https://github.com/status-im/nim-blscurve
cd nim-blscurve
git submodule update --init
nimble bench
```
2 benchmarks will be done with 2 different memory management solutions (different implementations of refcounting)
BLST is as-of v0.3.12 (May 2024) with runtime CPU features detection

```
Backend: BLST, mode: 64-bit
====================================================================================================================================

Scalar multiplication G1 (255-bit, constant-time)                             10332.180 ops/s        96785 ns/op       318784 cycles
Scalar multiplication G2 (255-bit, constant-time)                              4622.247 ops/s       216345 ns/op       712585 cycles
EC add G1 (constant-time)                                                   1795332.136 ops/s          557 ns/op         1836 cycles
EC add G2 (constant-time)                                                    713775.874 ops/s         1401 ns/op         4617 cycles
------------------------------------------------------------------------------------------------------------------------------------
Pairing (Miller loop + Final Exponentiation)                                   1484.823 ops/s       673481 ns/op      2218271 cycles
------------------------------------------------------------------------------------------------------------------------------------
Hash to G2 (Draft #9) + affine conversion                                      6795.232 ops/s       147162 ns/op       484712 cycles
------------------------------------------------------------------------------------------------------------------------------------
BLS signature                                                                  3490.864 ops/s       286462 ns/op       943532 cycles
BLS verification                                                               1212.302 ops/s       824877 ns/op      2716928 cycles
BLS agg verif of 1 msg by 128 pubkeys                                          1139.886 ops/s       877281 ns/op      2889519 cycles
------------------------------------------------------------------------------------------------------------------------------------
BLS verif of 6 msgs by 6 pubkeys                                                203.231 ops/s      4920498 ns/op     16206824 cycles
Serial batch verify 6 msgs by 6 pubkeys (with blinding)                         359.968 ops/s      2778025 ns/op      9150078 cycles
Parallel batch verify of 6 msgs by 6 pubkeys (with blinding)                    615.452 ops/s      1624822 ns/op      5351722 cycles
------------------------------------------------------------------------------------------------------------------------------------
BLS verif of 60 msgs by 60 pubkeys                                               20.310 ops/s     49236672 ns/op    162172626 cycles
Serial batch verify 60 msgs by 60 pubkeys (with blinding)                        42.709 ops/s     23414406 ns/op     77120772 cycles
Parallel batch verify of 60 msgs by 60 pubkeys (with blinding)                  250.298 ops/s      3995236 ns/op     13159139 cycles
------------------------------------------------------------------------------------------------------------------------------------
BLS verif of 180 msgs by 180 pubkeys                                              6.746 ops/s    148237745 ns/op    488256390 cycles
Serial batch verify 180 msgs by 180 pubkeys (with blinding)                      14.419 ops/s     69354258 ns/op    228434104 cycles
Parallel batch verify of 180 msgs by 180 pubkeys (with blinding)                 99.467 ops/s     10053540 ns/op     33113513 cycles
------------------------------------------------------------------------------------------------------------------------------------

Using nthreads = 16. The number of threads can be changed with TP_NUM_THREADS environment variable.
```

#### Constantine

GCC generates poor code everwhere assembly is not used, hence we force Clang as a compiler.

```
git clone https://github.com/mratsim/constantine
cd constantine
CC=clang nimble bench_eth_bls_signatures
```

```
--------------------------------------------------------------------------------------------------------------------------------------------------
Pubkey deserialization (full checks)                                                     BLS12_381 G1          22295.550 ops/s         44852 ns/op        147729 CPU cycles (approx)
Pubkey deserialization (skip checks)                                                     BLS12_381 G1          92515.496 ops/s         10809 ns/op         35602 CPU cycles (approx)
Signature deserialization (full checks)                                                  BLS12_381 G2          16808.418 ops/s         59494 ns/op        195958 CPU cycles (approx)
Signature deserialization (skip checks)                                                  BLS12_381 G2          46453.291 ops/s         21527 ns/op         70906 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------------------------
BLS signature                                                                            BLS12_381 G2           4005.078 ops/s        249683 ns/op        822392 CPU cycles (approx)
BLS verification                                                                         BLS12_381              1498.960 ops/s        667129 ns/op       2197347 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------------------------
BLS agg verif of 1 msg by 128 pubkeys                                                    BLS12_381              1423.694 ops/s        702398 ns/op       2313504 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------------------------
BLS verif of 6 msgs by 6 pubkeys                                                         BLS12_381               249.683 ops/s       4005085 ns/op      13191614 CPU cycles (approx)
BLS serial batch verify of 6 msgs by 6 pubkeys (with blinding)                           BLS12_381               420.912 ops/s       2375795 ns/op       7825187 CPU cycles (approx)
BLS parallel batch verify (16 threads) of 6 msgs by 6 pubkeys (with blinding)            BLS12_381               683.399 ops/s       1463273 ns/op       4819062 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------------------------
BLS verif of 60 msgs by 60 pubkeys                                                       BLS12_381                24.863 ops/s      40220998 ns/op     132477024 CPU cycles (approx)
BLS serial batch verify of 60 msgs by 60 pubkeys (with blinding)                         BLS12_381                48.878 ops/s      20459201 ns/op      67387049 CPU cycles (approx)
BLS parallel batch verify (16 threads) of 60 msgs by 60 pubkeys (with blinding)          BLS12_381               280.961 ops/s       3559207 ns/op      11722847 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------------------------
BLS verif of 180 msgs by 180 pubkeys                                                     BLS12_381                 8.334 ops/s     119995222 ns/op     395232558 CPU cycles (approx)
BLS serial batch verify of 180 msgs by 180 pubkeys (with blinding)                       BLS12_381                16.488 ops/s      60650899 ns/op     199767961 CPU cycles (approx)
BLS parallel batch verify (16 threads) of 180 msgs by 180 pubkeys (with blinding)        BLS12_381               112.215 ops/s       8911481 ns/op      29351939 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------------------------
```
#### Analysis

- 15% performance improvement on signatures
- 24% performance improvement on verification

Furthermore, it is in theory possible to achieve a 2x performance improvement for signing if there is a need for it.

### KZG Polynomial commitment for EIP-4844 (Consensus Layer)

I will reuse my benchmarks from Dec, 2023: https://github.com/mratsim/constantine/pull/304#issuecomment-1844795359

|             Bench              | c-kzg-4844 (serial) | go-kzg-4844 (serial) | go-kzg-4844 (parallel) | constantine (serial) | constantine (parallel) |
|:------------------------------:|:-------------------:|:--------------------:|:----------------------:|:--------------------:|:----------------------:|
|     blob_to_kzg_commitment     |      37.773 ms      |          -           |        5.823 ms        |      23.765 ms       |        4.425 ms        |
|       compute_kzg_proof        |      39.945 ms      |          -           |        7.146 ms        |      24.255 ms       |        4.710 ms        |
|     compute_blob_kzg_proof     |      40.212 ms      |          -           |        7.205 ms        |      24.288 ms       |        4.794 ms        |
|        verify_kzg_proof        |      0.915 ms       |       0.923 ms       |           -            |       0.782 ms       |           -            |
|     verify_blob_kzg_proof      |      1.531 ms       |          -           |        1.390 ms        |       1.266 ms       |        1.113 ms        |
| verify_blob_kzg_proof_batch 1  |      1.528 ms       |       1.392 ms       |        1.405 ms        |       1.286 ms       |        1.130 ms        |
| verify_blob_kzg_proof_batch 2  |      2.589 ms       |       3.233 ms       |        1.591 ms        |       2.006 ms       |        1.152 ms        |
| verify_blob_kzg_proof_batch 4  |      4.553 ms       |       4.671 ms       |        1.914 ms        |       3.437 ms       |        1.250 ms        |
| verify_blob_kzg_proof_batch 8  |      8.446 ms       |       7.410 ms       |        2.738 ms        |       6.115 ms       |        1.891 ms        |
| verify_blob_kzg_proof_batch 16 |      16.228 ms      |      12.734 ms       |        3.542 ms        |      11.567 ms       |        3.091 ms        |
| verify_blob_kzg_proof_batch 32 |      32.016 ms      |      23.048 ms       |        7.215 ms        |      21.779 ms       |        6.764 ms        |
| verify_blob_kzg_proof_batch 64 |      63.415 ms      |      43.224 ms       |       14.438 ms        |      43.099 ms       |       11.538 ms        |

- A 37% performance improvement over c-kzg-4844 for serial commitment
- A 39% improvement for proof generation
- A 17% improvement for a single blob verification
- A 32% improvement for 64 blob verification

And Constantine offers paralellization to improve those numbers 4~6x on my 8-core machine.

### EVM precompiles (Execution Layer)

Note:
- Constantine also offers a fast MODEXP precompile that reaches 80% to 110% of GMP, without assembly.
- SHA256 is faster than OpenSSL and BLST for data size less than 4MB and within 3% otherwise.

```
git clone https://github.com/mratsim/constantine
cd constantine
CC=clang nimble bench_eth_evm_precompiles
```

```
--------------------------------------------------------------------------------------------------------------------------------
SHA256 -  32 bytes            72 gas    1714.29 MGas/s    23809523.810 ops/s           42 ns/op          140 CPU cycles (approx)
SHA256 -  64 bytes            84 gas    1584.91 MGas/s    18867924.528 ops/s           53 ns/op          176 CPU cycles (approx)
SHA256 -  96 bytes            96 gas    1777.78 MGas/s    18518518.519 ops/s           54 ns/op          179 CPU cycles (approx)
SHA256 - 128 bytes           108 gas    1333.33 MGas/s    12345679.012 ops/s           81 ns/op          267 CPU cycles (approx)
SHA256 - 160 bytes           120 gas    1481.48 MGas/s    12345679.012 ops/s           81 ns/op          268 CPU cycles (approx)
SHA256 - 192 bytes           132 gas    1233.64 MGas/s     9345794.393 ops/s          107 ns/op          353 CPU cycles (approx)
SHA256 - 224 bytes           144 gas    1321.10 MGas/s     9174311.927 ops/s          109 ns/op          359 CPU cycles (approx)
SHA256 - 256 bytes           156 gas    1130.43 MGas/s     7246376.812 ops/s          138 ns/op          454 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
BN254_G1ADD                  150 gas      87.41 MGas/s      582750.583 ops/s         1716 ns/op         5652 CPU cycles (approx)
BN254_G1MUL                 6000 gas     229.66 MGas/s       38276.047 ops/s        26126 ns/op        86050 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
BN254_PAIRINGCHECK 1       79000 gas     166.99 MGas/s        2113.754 ops/s       473092 ns/op      1558009 CPU cycles (approx)
BN254_PAIRINGCHECK 2      113000 gas     191.99 MGas/s        1699.056 ops/s       588562 ns/op      1938370 CPU cycles (approx)
BN254_PAIRINGCHECK 3      147000 gas     183.15 MGas/s        1245.930 ops/s       802613 ns/op      2642801 CPU cycles (approx)
BN254_PAIRINGCHECK 4      181000 gas     191.76 MGas/s        1059.434 ops/s       943900 ns/op      3108745 CPU cycles (approx)
BN254_PAIRINGCHECK 5      215000 gas     169.72 MGas/s         789.374 ops/s      1266827 ns/op      4171120 CPU cycles (approx)
BN254_PAIRINGCHECK 6      249000 gas     181.10 MGas/s         727.321 ops/s      1374909 ns/op      4528210 CPU cycles (approx)
BN254_PAIRINGCHECK 7      283000 gas     189.03 MGas/s         667.965 ops/s      1497084 ns/op      4930714 CPU cycles (approx)
BN254_PAIRINGCHECK 8      317000 gas     204.18 MGas/s         644.095 ops/s      1552566 ns/op      5113680 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
BLS12_G1ADD                  500 gas     164.10 MGas/s      328191.664 ops/s         3047 ns/op        10034 CPU cycles (approx)
BLS12_G2ADD                  800 gas     161.75 MGas/s      202183.583 ops/s         4946 ns/op        16289 CPU cycles (approx)
BLS12_G1MUL                12000 gas     141.66 MGas/s       11805.400 ops/s        84707 ns/op       279001 CPU cycles (approx)
BLS12_G2MUL                45000 gas     325.51 MGas/s        7233.639 ops/s       138243 ns/op       455333 CPU cycles (approx)
BLS12_MAP_FP_TO_G1          5500 gas     161.82 MGas/s       29422.149 ops/s        33988 ns/op       111947 CPU cycles (approx)
BLS12_MAP_FP2_TO_G2        75000 gas     659.96 MGas/s        8799.486 ops/s       113643 ns/op       374305 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
BLS12_PAIRINGCHECK 1      108000 gas     216.83 MGas/s        2007.665 ops/s       498091 ns/op      1640562 CPU cycles (approx)
BLS12_PAIRINGCHECK 2      151000 gas     222.00 MGas/s        1470.214 ops/s       680173 ns/op      2240287 CPU cycles (approx)
BLS12_PAIRINGCHECK 3      194000 gas     219.98 MGas/s        1133.901 ops/s       881911 ns/op      2904762 CPU cycles (approx)
BLS12_PAIRINGCHECK 4      237000 gas     222.97 MGas/s         940.782 ops/s      1062946 ns/op      3500927 CPU cycles (approx)
BLS12_PAIRINGCHECK 5      280000 gas     221.08 MGas/s         789.576 ops/s      1266502 ns/op      4171417 CPU cycles (approx)
BLS12_PAIRINGCHECK 6      323000 gas     223.09 MGas/s         690.679 ops/s      1447851 ns/op      4768780 CPU cycles (approx)
BLS12_PAIRINGCHECK 7      366000 gas     222.28 MGas/s         607.311 ops/s      1646603 ns/op      5423299 CPU cycles (approx)
BLS12_PAIRINGCHECK 8      409000 gas     221.94 MGas/s         542.640 ops/s      1842844 ns/op      6069597 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
BLS12_G1MSM   2            21312 gas     120.40 MGas/s        5649.430 ops/s       177009 ns/op       583004 CPU cycles (approx)
BLS12_G1MSM   4            30768 gas     101.53 MGas/s        3299.960 ops/s       303034 ns/op       998108 CPU cycles (approx)
BLS12_G1MSM   8            43488 gas      81.23 MGas/s        1867.787 ops/s       535393 ns/op      1763434 CPU cycles (approx)
BLS12_G1MSM  16            64128 gas      66.43 MGas/s        1035.864 ops/s       965378 ns/op      3179510 CPU cycles (approx)
BLS12_G1MSM  32           103296 gas      57.99 MGas/s         561.362 ops/s      1781382 ns/op      5867248 CPU cycles (approx)
BLS12_G1MSM  64           170496 gas      50.89 MGas/s         298.504 ops/s      3350039 ns/op     11034035 CPU cycles (approx)
BLS12_G1MSM 128           267264 gas      42.24 MGas/s         158.035 ops/s      6327700 ns/op     20841720 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
BLS12_G2MSM   2            79920 gas     269.62 MGas/s        3373.637 ops/s       296416 ns/op       976301 CPU cycles (approx)
BLS12_G2MSM   4           115380 gas     225.12 MGas/s        1951.109 ops/s       512529 ns/op      1688121 CPU cycles (approx)
BLS12_G2MSM   8           163080 gas     177.21 MGas/s        1086.654 ops/s       920256 ns/op      3031066 CPU cycles (approx)
BLS12_G2MSM  16           240480 gas     130.56 MGas/s         542.920 ops/s      1841892 ns/op      6066436 CPU cycles (approx)
BLS12_G2MSM  32           387360 gas     126.36 MGas/s         326.195 ops/s      3065648 ns/op     10097244 CPU cycles (approx)
BLS12_G2MSM  64           639360 gas     118.26 MGas/s         184.965 ops/s      5406423 ns/op     17807268 CPU cycles (approx)
BLS12_G2MSM 128          1002240 gas     100.70 MGas/s         100.471 ops/s      9953136 ns/op     32782906 CPU cycles (approx)
--------------------------------------------------------------------------------------------------------------------------------
```

Constantine achieves over 200Mgas/s for a wide range of cryptographic precompiles on a laptop CPU with restricted power consumption (7840U, 15W to 30W)

note, I suggest a repricing for EIP-2537 to help SNARKS applications.

## Security

Constantine, as it names indicates, as a strong focus on security and especially constant-time cryptography is used by default in the core of the library.
It HAS NOT been audited yet, but it has undergone extensive fuzzing by Guido Vranken, thanks to the sponsoring of the Ethereum Foundation in Summer 2023. It has also been added to OSS-Fuzz (https://github.com/google/oss-fuzz/pull/10710), the Google 24/7 open-source fuzzing initiative.

## The Future

Constantine will follow and support future Ethereum cryptographic needs. In particular I thank the Ethereum Foundation Fellowship Program and Status for sponsoring work on implementing Verkle Tries in Constantine the past year.

Constantine also supports accelerating Zero-Knowledge proof systems, for example it is possible to use it through PSE (Privacy Scaling Explorations, a branch of the EF) Halo2: https://github.com/mratsim/constantine/pull/308.

Constantine has the fastest MSM on x86, all libraries benchmarked as of July 2024 (Arkworks, Barretenberg, Bellman, Gnark, Halo2) and by a factor 2x over popular Rust libraries Arkworks and Halo2. And I do plan to build proof systems on top.

Hidden in Constantine is a compiler for GPU code generation and there are plans for accelerating ARM.

Now I don't know what a snarkified EVM will look like, but I certainly hope to contribute to make it a reality.