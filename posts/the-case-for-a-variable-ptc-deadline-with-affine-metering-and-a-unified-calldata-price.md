# The case for a variable PTC deadline with affine metering and a unified calldata price

*Thanks to [Toni](https://x.com/nero_eth) for feedback.*

----

This post makes the case for using a variable PTC deadline together with a single unified calldata price. The suggested approach is to couple the variable PTC deadline with a cap that always leaves room for execution after the latest possible PTC deadline—a window that cannot be used for propagation anyway. We refer to the general approach as affine metering, since calldata usage linearly shifts the PTC deadline, defining an affine resource constraint between calldata and execution.

The identified benefits are as follows:

* Allows Ethereum to roughly double the throughput and gas limit, since a larger proportion of the slot can be used for execution. This aspect will be the focus of this post, with equations and figures to support the argument.
* Simplifies gas accounting with a single price for all calldata bytes.
* Avoids gameability. Under EIP-7976, transactions with plenty of execution may start auctioning off their cheap calldata allowance because of the large price differential.
* Is compatible with a multidimensional fee market. The intention is to use the same approach in [EIP-7999](https://eips.ethereum.org/EIPS/eip-7999), until a potential Block-in-Blobs ([EIP-8142](https://eips.ethereum.org/EIPS/eip-8142)) implementation finally requires further adjustments to calldata pricing. This is further explored in the last section of the post.

A downside is that the proposal requires changing the calldata price for all transactions, whereas [EIP-7976](https://eips.ethereum.org/EIPS/eip-7976) only changes the floor cost. But if calldata repricing is forthcoming anyway, this may be the right moment. Several other resources are already being repriced, so the relative impact of changing an additional resource is arguably smaller. If EIP-7976 remains the favored approach for Glamsterdam, affine metering could instead be the next step in calldata pricing, from Hegota and beyond, especially since it is compatible and would provide scaling gains also under a multidimensional fee market.

## Introduction

Under ePBS, the PTC payload-observation deadline is doing two jobs at once. It is a timeliness threshold for payload propagation, and it also determines how much execution time remains before the slot ends. [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732) makes that separation between consensus validation and execution validation explicit. A [variable PTC deadline](https://github.com/ethereum/consensus-specs/pull/4843) has been proposed, shifting with the payload size. A variable deadline would use a [dual-deadline](https://notes.ethereum.org/@anderselowsson/Dual-deadlinePTCvote) design, with a variable payload observation time. It has been noted that under an [EIP-7976](https://eips.ethereum.org/EIPS/eip-7976)-style pricing, the variable PTC deadline does not contribute much to scaling ([1](https://ethresear.ch/t/why-a-variable-payload-deadline-only-helps-by-6/24488), [2](https://notes.ethereum.org/@0YxgBRfbR0OTJbu2fDpY2Q/ry95XqFc-e)), only enabling a $1/16$ gas-limit increase.

In the worst case of all-zero calldata, every 15 execution gas in a transaction lets the user buy 16 gas worth of floor-priced calldata for only 1 gas. A higher global gas limit would admit payloads with a lot of calldata consuming very little gas relative to their true network footprint, as implied by the full calldata price. A variable deadline can only support additional headroom corresponding to the ratio of inexpensive calldata relative to floor-priced calldata, $4/64 = 1/16$. Even though some individual blocks would have much more slack, that slack cannot be translated to a higher gas limit without admitting blocks that cannot propagate and execute on time.

If a unified calldata price, e.g., 32 gas/byte, is instead applied across the board to every unit of calldata, the situation improves. The variable PTC deadline can then provide scaling benefits across its full operational range—from the earliest possible point at which a small payload could be delivered, up to the latest point at which the PTC can vote while leaving time for its votes to propagate. This post reviews affine metering under a variable PTC deadline, sets up the general equations, and illustrates the scaling gain.

## A general model

How should calldata be approached to facilitate maximum scaling under the constraints imposed by ePBS? Let $T_1$ be the attestation deadline, $T_2$ the latest possible PTC deadline, $T_3$ the end of the slot, and $c$ a fixed propagation overhead. More elaborate timing models have [been developed](https://ethresear.ch/t/the-glamsterdam-equation/22760) for measuring propagation time, but a simple model will here suffice. Let $g_c$ denote the calldata gas used by the payload and $G_c$ denote the calldata-gas budget corresponding to a maximally data-heavy payload, namely one that is just allowed to arrive as late as $T_2$. The overall gas limit is denoted by $G$; it is possible to keep $G_c = G$, but preferable to enforce a stricter limit on calldata, $G_c < G$, as illustrated below. Let $t_b$ be the propagation time per calldata byte and $B$ the maximum calldata byte budget. The same approach could extend to other bytes, for example BAL bytes or any bytes covered by a block-size limit such as [EIP-7934](https://eips.ethereum.org/EIPS/eip-7934). Such considerations would be important to integrate, but are not the focus of this post, instead focusing on the baseline modeling.

To ensure that the payload may fully propagate by $T_2$, the maximum byte budget must satisfy

$$

T_1 + c + t_b B = T_2.

$$

Therefore, the constraint on the calldata byte size is

$$

B = \frac{T_2 - T_1 - c}{t_b}.

$$

If calldata has a *single* price and is priced linearly at $g_b$ gas per byte, then the calldata gas budget is

$$

G_c = g_b B,

$$

and so the required calldata gas price is

$$

g_b = \frac{G_c}{B} = \frac{t_b G_c}{T_2 - T_1 - c}.

$$

Equivalently, for a payload using $g_c$ calldata gas, the variable PTC deadline can be written directly as

$$

T_{\mathrm{PTC}}(g_c) = T_1 + c + \frac{g_c}{G_c}(T_2 - T_1 - c).

$$

It is convenient to define the calldata proportion $p = \frac{g_c}{G_c}.$ Since calldata is priced linearly in this model, $p$ is also the proportion of the maximum byte budget used. The previous expression then becomes

$$

T_{\mathrm{PTC}}(p) = T_1 + c + p(T_2 - T_1 - c).

$$

This makes the dependence clear: the deadline moves linearly from $T_1+c$ to $T_2$ as calldata usage moves from $0$ to $G_c$. The execution window left after the PTC deadline is

$$

W_e(p) = T_3 - T_{\mathrm{PTC}}(p).

$$

Substituting gives

$$

W_e(p) = (T_3-T_2) + (1-p)(T_2-T_1-c).

$$

Thus, as calldata usage decreases, the unused propagation time becomes additional execution window. Figure 1 shows how scaling is affected by the pricing and metering under the illustrative conditions:

$$

T_1 = 3\mathrm{s}, \qquad T_2 = 9\mathrm{s}, \qquad T_3 = 12\mathrm{s}, \qquad c = 2\mathrm{s}.

$$

To make the scaling effect easier to see, both axes are normalized. The vertical axis is the byte share $b$, namely calldata bytes divided by the byte cap $B$, so under linear pricing $b=p=g_c/G_c$. The horizontal axis is execution relative to the original full-execution block,

$$

e = \frac{W_e(p)}{T_3-T_2}.

$$

Throughout these normalized examples, one unit of $e$ is the execution work that fills the original $T_3-T_2$ execution window.

![Figure 1|635x500](images/pqy3Udyx7VTdPHID0aAbM4XyHGd.png)

**Figure 1.** Illustrating the scaling gains under a variable PTC deadline with simplified pricing and affine metering. Under the proposal in blue, the gas limit can be increased by a factor $s = 7/3$ relative to a fixed PTC deadline. Under EIP-7976 in red, the headroom is only $1/16$, i.e., a multiplier of $17/16$. Under the current EIP-7623 in orange, a variable PTC deadline could bring about larger gains than under EIP-7976, but that EIP allows too big payloads as the gas limit increases. For a typical block composition indicated by the thin dotted line, around twice as much throughput is achieved with the proposed design as with EIP-7976 (compare the blue and red circles).

Under the proposal, the normalized execution frontier becomes

$$

e = 1 + \frac{T_2-T_1-c}{T_3-T_2}(1-b).

$$

For the suggested conditions, we have $T_2-T_1-c = 4\mathrm{s}$, and $T_3-T_2 = 3\mathrm{s}$. The proposal frontier thus becomes

$$

e = 1 + \frac{4}{3}(1-b).

$$

This is the solid blue line in Figure 1. The fraction $4/7$ comes from the timing split: the variable propagation interval is $4\mathrm{s}$ and the full post-overhead interval from $T_1+c$ to $T_3$ is $7\mathrm{s}$. It corresponds to a calldata cap $G_c=\frac{4}{7}G,$ so that a maximally data-heavy block, $b=1$, still leaves room for one full-execution block, $e=1$. At the other extreme, when $b=0$, the whole interval from $T_1+c$ to $T_3$ can be used for execution, giving $e=\frac{7}{3}.$ Concretely, with $G=300\mathrm{M}$ and $G_c=4G/7$, a unified calldata price of 32 gas/byte gives a maximum of 5.36 MB calldata, and 48 gas/byte gives 3.57 MB.

The dotted blue line instead shows the case when $G_c=G$. In that case, bytes and execution fully trade off against the same gas budget, so a maximally data-heavy block can consume the whole gas limit and leave no execution in the gas accounting. Figure 1 also includes a grey baseline $e+b=1$ where execution and bytes simply substitute one-for-one, as was the case before EIP-7623.

The orange and red lines assume that the byte side is separately capped at the original max-calldata block. Without such a cap, raising the gas limit under EIP-7976 from $G$ to $G'$ would simply grow the all-floor max-byte block from $G/64$ to $G'/64$, so the block would exceed the propagation budget. With the byte cap in place, extra gas can only show up as execution, while each unit of byte share displaces execution by only the zero-byte/floor price ratio: $4/64=1/16$ for EIP-7976 and $4/10=0.4$ for EIP-7623. Thus the red line drops by only $1/16$ as byte share moves from $0$ to $1$, making it almost vertical. A more comprehensive analysis is provided in the next section. The fainter red and orange segments show the corresponding fixed-deadline frontiers at the original gas limit, $s=1$. The variable PTC deadline shifts these frontiers rightward.

The circles mark intersections with the illustrative mix $b=e/9$, corresponding to a normalized 9:1 execution-to-byte mix, or $9/10$ execution and $1/10$ bytes. For EIP-7623 and EIP-7976, the point is shifted according to the assumed transaction mix, where $5/6$ of bytes are bought cheaply and $1/6$ are floor-priced.

## The limits of EIP-7623 and EIP-7976 pricing under a variable PTC deadline

*Separate explanations with a slightly different focus are available here ([1](https://ethresear.ch/t/why-a-variable-payload-deadline-only-helps-by-6/24488), [2](https://notes.ethereum.org/@0YxgBRfbR0OTJbu2fDpY2Q/ry95XqFc-e)).*

The proposal in Figure 1 prices calldata directly in proportion to the propagation burden it creates. In that case, reducing calldata always frees up propagation time, which can instead be used as additional execution time. Under EIP-7976 and EIP-7623, calldata has two effective prices. Some calldata can be carried cheaply together with execution, while the remaining calldata is bought at the higher floor price.

Assume that the fixed-deadline gas limit has already been raised until the pure-compute block just fills the execution window and the max-byte block just fills the propagation window. Under EIP-7976, the all-floor max-byte block has size $B = G/64$. If we now raise the gas limit to $G' > G$, that worst-case all-floor block grows to $B' = G'/64$. Since the old max-byte block already just fit by $T_2$, the new one does not. In that framing, a variable PTC deadline by itself does not justify any gas-limit increase at all.

However, if the byte size is also held fixed at $B$, for example by a separate byte-size cap, then it becomes possible to raise the gas limit to $G'.$ Blocks containing almost only execution can then be assigned an earlier deadline. Once the block starts to carry some cheap bytes along with that execution, the deadline must be pushed later until it eventually reaches its original starting point at $T_2$.

This happens when the block spends $G$ gas on execution and $G'-G$ gas on cheap bytes. The established max-byte amount is $B = G/64$. Since cheap bytes can cost 4 gas/byte, buying the same byte amount at this price costs only $4B = 4(G/64) = G/16$. Therefore, $G'-G = G/16$, and so $G' = (17/16)G$. The proportion spent on cheap calldata gas in the sought block composition is therefore $(G/16)/(17G/16) = 1/17$, whereas the remaining $16/17$ is spent on execution gas.

Figure 2 illustrates this calculation under the previously used timing conditions. The x-axis is the optimal PTC deadline and the y-axis is the gas-limit multiplier $s=G'/G$ relative to the original fixed-deadline gas limit. Each marker fixes a block composition: the label gives the proportion of the raised gas limit spent on cheap bytes, with the remainder spent on execution.

![deadline_vs_scaling|690x466](images/bb4jngwImQ42GaWVv2NP60K0tg0.png)

**Figure 2.** Safe gas-limit multiplier under EIP-7976 as the share of gas spent on cheap calldata increases, assuming the byte cap remains fixed at the original max-calldata block. Each marker labels the cheap-byte gas share; the rest is execution. The curve falls from the pure-execution limit $7/3$ at $T_1+c=5\mathrm{s}$ to the key $1/17$ point at $T_2=9\mathrm{s}$, where the multiplier is $17/16$. The dotted continuation to $1/16$ shows the old max-byte cheap composition, which already fills the byte cap at the original gas limit and therefore has no scaling gain.

Under pure execution ($0$), the PTC deadline can move all the way to $T_1+c$, producing the largest execution window. As the cheap-byte share increases, more bytes must propagate, so the optimal deadline moves later and the safe gas-limit multiplier falls. The key point is the $1/17$ marker. At this composition, the block contains the original max-byte amount $B$ and the original full execution gas $G$. Both constraints bind at the old fixed deadline, so the optimal deadline is again $T_2 = 9\mathrm{s}$ and the gas-limit multiplier is $17/16$. The dotted continuation to $1/16$ is only a visual aid: that composition already fills the byte cap at the original gas limit and therefore provides no scaling gain.

Recovering larger variable-PTC scaling gains under EIP-7976 would require the deadline to vary with raw calldata bytes, not with EIP-7976 calldata gas. However, if raw bytes are the scarce timing resource, then both price levels consume the same propagation budget, but they do not pay the same gas. Cheap calldata might then need to compete for raw-byte capacity through priority fees, which would be a serious UX concern.

## Affine metering under a multidimensional fee market

The affine metering approach of this proposal can also be applied under a multidimensional fee market such as [EIP-7999](https://eips.ethereum.org/EIPS/eip-7999). There are two natural ways to do so:

1. Apply the baseline proposal outlined in this post, which does not require any fundamental changes as long as there is still a single EVM-gas resource. If execution is broken up into several resources, their joint impact on processing time would have to be considered.

2. Break out calldata into a separate resource, but use its raw byte consumption, or a calldata-gas unit that is a constant multiple of raw bytes, to define the variable PTC deadline, just as previously.

We will here focus on (2). The only fundamental difference with this approach is that calldata has its own resource base fee. There will still be a limit $G_c$, determining how much calldata a block at most can consume, and this limit can, as before, be set such that the typical block is far from reaching it. At the block level, calldata bytes would still constrain both the available gas for execution and the PTC deadline by imposing the condition $e+r b\le 1+r$, where $r=(T_2-T_1-c)/(T_3-T_2)$ is the propagation-to-execution timing ratio. Since calldata size can be determined statically upfront, this is straightforward to implement. It does not produce the type of complications that emerge when a resource's consumption must be determined at EVM run-time.

For continuity, calldata byte consumption can still be denominated in gas, provided that this gas is a fixed multiple of raw byte consumption. However, this is not a requirement, and the calldata resource could instead be denominated directly in bytes. The price per byte would still adjust such that a targeted number of bytes is consumed per block on average.

In conclusion, with modest changes to EIP-7999, the scaling gains outlined in this post could be achieved also under a multidimensional fee market, thus improving upon the scaling gains that such a fee market already achieves.