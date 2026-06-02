# Why a Variable Payload Deadline Only Helps by ~6% 

> **TL;DR:** A variable payload deadline offers a theoretical gain of ~6% in gas limit headroom, and that already assumes we anchor on the compressed block size. In practice, the proposal anchors on uncompressed sizes, and combined with the heavily right-skewed distribution of block sizes, linear interpolation effectively fails to scale propagation time. We may even end up with less propagation time than today.

Under [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732), the builder submits a payload, it propagates through the network, the PTC votes on availability, and validators execute it before the next slot.

[A variable payload deadline](https://github.com/ethereum/consensus-specs/pull/4843) proposes to give larger blocks more propagation time, while smaller blocks arrive earlier and benefit from more execution time. In theory, this sounds sensible. In practice, the gains are minimal and the approach has fundamental problems.

## Background: EIP-7976 and calldata pricing

Under [EIP-7976](https://eips.ethereum.org/EIPS/eip-7976), the calldata floor charges 64 gas per byte. Standard pricing charges only 4 gas per zero byte and 16 gas per non-zero byte. The difference (up to 60 gas per byte) is execution gas the transaction gets "for free."

> EIP-7976 iterates on [EIP-7623](https://eips.ethereum.org/EIPS/eip-7623), which shipped in Pectra and set calldata costs to 10/40 for zero and non-zero bytes. EIP-7976 goes further by **unifying costs for zero and non-zero bytes**, since the distinction doesn't matter when dealing with worst-case block sizes.

## Two worst-case blocks

**When talking about data sizes, we usually focus on Snappy-compressed sizes. Since the protocol doesn't enshrine a specific compression algorithm, it must deal with uncompressed sizes. This is important, as this complicates matters significantly.**

When setting the gas limit, every possible block must fit within one slot. There are two extremes:

- **Pure compute block**: no calldata, all gas spent on execution. Needs zero propagation time but maximum execution time.
- **Max calldata block**: filled with calldata, triggers the floor. Needs maximum propagation time, but also gets 93.75% of its gas as "reserved" execution.

**The key observation: the max-calldata block is *almost as execution-heavy* as the pure-compute block.** Of every 64 gas charged at the floor, only 4 gas covers the actual calldata cost. The remaining 60 is "reserved" execution. So the data block uses 93.75% as much execution as the compute block. For details on why, see [this analysis of EIP-7623](https://ethresear.ch/t/analyzing-eip-7623-increase-calldata-cost/19002).

The EIP-7623 approach **effectively maintains backward compatibility for most transactions while capping the worst-case block size**. It also works well with ePBS because it "reserves" execution time after the payload observation deadline (PTC), even for worst-case blocks. But this "reserved execution" is exactly what limits the variable deadline's usefulness.

> [See this page](https://nerolation.github.io/big-blocks/) for the **worst-case compressed block size** today vs. post-EIP-7976: at 60M gas, it's 2.24 MB today and 938 KB post-7976. Worst-case block size scales linearly with the gas limit.

## Fixed vs variable deadline

With a **fixed** deadline, a single deadline must handle all blocks. It reserves enough propagation time for the biggest block AND enough execution time for the most compute-heavy block. These are different blocks, but the fixed deadline can't distinguish them. It adds both worst cases, even though no single block is worst-case in both dimensions.

With a **variable** deadline, each block is judged individually. The biggest block gets more propagation time. The most compute-heavy block gets more execution time. That's the theory.

## So what's the gain?

The gain equals how *different* the two worst-case blocks are. If they were very different, the fixed deadline would waste a lot by summing unrelated worst cases. If they're nearly identical, there's almost nothing to save.

With EIP-7976:

| | Propagation | Execution |
|---|---|---|
| Pure compute block | none (simplified) | 100% of gas |
| Max calldata block | some | 93.75% of gas |

The two blocks differ by only **6.25%** in execution needs. That's all the fixed deadline over-reserves, and the variable deadline reclaims exactly this.

Where does 6.25% come from? It's $\frac{C}{4F} = \frac{4}{64}$: the fraction of the floor cost that represents actual calldata cost rather than "reserved" execution. It's *the fraction of gas in a max-calldata block that actually pays for calldata*.

A variable deadline could still be worth considering for ~6% more gas limit headroom. But this assumes we anchor on the compressed block size. We don't.

## Why the practical gain is even less

The ~6% figure is a theoretical maximum. In practice, the proposal anchors on uncompressed block sizes, not compressed. This undermines the entire approach.

What matters for propagation is the size over the wire, where blocks are compressed. Two blocks can both be 1 MB uncompressed, yet one compresses to 100 KB while the other doesn't compress at all. Despite behaving very differently in propagation, both receive the same deadline:

![image](images/56tqrUJRYImMO1qi0SGq7oxb6kM.png)

Worse, the distribution of block sizes is heavily right-skewed:

![image](images/9w8LvjgjdWvRQU0jripFldaiXwg.png)

By interpolating linearly between 3.6s and 9s over this distribution, most blocks get a deadline barely above the minimum. **We would effectively not scale propagation time at all, and might even end up with less propagation time than today.**

Taking the PR as-is, payload observation deadlines cluster near the attestation deadline, losing much of the propagation time ePBS originally provides:

![image](images/bivZIak6sdRYcwCWSOkyqfLuDTN.png)

Even assuming the PR is updated to use a dynamic maximum block size based on the gas limit and EIP-7976 pricing, the picture doesn't improve much:

![image](images/g4auY8ar3RiBM4HKBp98w2bGfCK.png)

> To be clear, this doesn't mean the blob deadline must equal the payload deadline. These can remain separate, but a variable payload deadline would need to anchor on compressed size to be meaningful.

## Could we improve the theoretical gain?

To get a bigger theoretical gain, the two worst-case blocks need to be more different. That means reducing the "reserved" execution ratio $a = 1 - \frac{C}{4F}$, where $C$ is the standard token cost and $4F$ is the floor cost per byte.

There are **two obvious levers**, but both have serious tradeoffs.

**Lower floor costs (e.g. 64/64 → 32/32).** This shrinks the ratio to 87.5%, doubling the variable deadline gain to 12.5%. Standard pricing stays at 4/16, preserving backward compatibility. But a lower floor means larger worst-case blocks: at 150M gas, max block size doubles from ~2.25 MiB to ~4.5 MiB. Counterproductive if we want to increase the gas limit.

**Raise standard costs (e.g. 4/16 → 8/32).** This directly shrinks the ratio to 87.5% and doubles the gain to 12.5%. But this breaks backward compatibility: every transaction pays more for calldata, not just data-heavy ones. EIP-7976's design goal is that ~98% of transactions stay at today's 4/16 pricing. Raising standard costs undermines that.

**The tension:** a high floor limits block size (EIP-7623's primary goal) but maximizes "free" execution. A low standard cost preserves backward compatibility but also maximizes "free" execution. Both goals push the reserved execution ratio toward 100%, leaving almost nothing for a variable deadline to reclaim.

## Is it still worth considering?

Despite all this, a variable payload deadline has some merits:

- **Low implementation complexity.** It's a relatively simple change to the honest validator specs that only affects the PTC. It wouldn't require a hardfork, at least in theory.
- **Marginal average-case gains.** Average blocks are far from worst-case, so the dynamic deadline can yield small efficiency gains under typical conditions, though whether the protocol can actually use these is questionable given the uncompressed-size anchoring.
- **Reduced builder information advantage.** Today, the builder whose bid is selected is the only party who fully knows the post-state early. A variable deadline slightly reduces this asymmetry.

These are real but modest benefits. Given that the approach anchors on the wrong metric (uncompressed size), the practical gains are a fraction of an already small 6%, and we risk degrading propagation time relative to today, the case is hard to make.

## The real solution

**The best path forward, though significantly more involved, is putting data on its own cost dimension.** [EIP-7999](https://eips.ethereum.org/EIPS/eip-7999) proposes multidimensional fee markets. This would break backward compatibility, but it would let us precisely define the worst-case blocks we're willing to accept, decoupling data and compute entirely rather than trying to paper over their entanglement with dynamic deadlines.