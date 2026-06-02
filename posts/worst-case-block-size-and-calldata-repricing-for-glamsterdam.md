# Worst-Case Block Size and Calldata Repricing for Glamsterdam

Ethereum's worst-case block size keeps surfacing as an issue, typically via adversarial constructions rather than honest usage. Average blocks are small; worst-cases are not.

## Background

Pre-Pectra, worst-case block size was driven by Snappy compression inefficiencies and cheap calldata (4/16 gas for zero/non-zero bytes).

**[EIP-7623](https://eips.ethereum.org/EIPS/eip-7623)** (Pectra) addressed this by raising calldata costs to **10/40 gas** for calldata-heavy transactions. This introduced a new worst-case construction:

- ~3/5 of block gas spent on [EIP-2930 Access Lists](https://eips.ethereum.org/EIPS/eip-2930)
- ~2/5 spent on calldata
- Structured to avoid triggering the EIP-7623 floor -> "*just enough execution gas to keep paying the lower price*"

The issue: access list data is essentially free. This circumvents EIP-7623 and inflates worst-case block size again.

## Why This Matters Now

Rising block gas limits and blob counts will further stress propagation. While **[ePBS](https://eips.ethereum.org/EIPS/eip-7732)** (shipping with Glamsterdam) extends propagation time, **[BALs](https://eips.ethereum.org/EIPS/eip-7928) increase raw block data**: counterproductive on this front.

### Proposed Repricings (Both EIPs are CFI'd for Glamsterdam)

#### [EIP-7981](https://eips.ethereum.org/EIPS/eip-7981): Increase Access List Cost

Applies calldata costs to transaction access lists. This closes the circumvention path: gas payment now tracks actual data as if it was calldata.

#### [EIP-7976](https://eips.ethereum.org/EIPS/eip-7976): Increase Calldata Floor Cost

Two options under discussion:

1. **As spec'ed**: raise pricing from 10/40 → **15/60 gas** for calldata-heavy transactions; simple 50% price increase
2. **Alternative**: flat **64/64 gas per byte**, eliminating the zero/non-zero distinction

### Interaction with ePBS

[ePBS](https://eips.ethereum.org/EIPS/eip-7732) might come with a **dynamic payload deadline**: the PTC enforces tighter deadlines for smaller payloads.

The CL does not want to enshrine a specific Snappy encoding. Flat per-byte pricing (option 2) is better here: the worst-case size becomes more predictable when using the **uncompressed payload size**.

## A possible way forward

With EIP-7976, as-is (15/60 for zero and non-zero bytes), we can get to a block gas limit of 150 million without exceeding a worst-case block size of 4 MiB. The alternative, arguably, the more aggressive repricing (64/64; no distinction between zero and non-zero bytes), would get us down to a worst-case block size of 2.25 MiB, leaving room for further gas limit increases toward 300 million in the future.

![calldata pricing vs block size|690x368](images/oP5GUujfHj0GEUBXhClcQpHWKM7.png)

Feedback welcome!