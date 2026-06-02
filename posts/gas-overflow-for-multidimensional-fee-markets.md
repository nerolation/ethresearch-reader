# Gas overflow for multidimensional fee markets

*Thanks to [Vitalik Buterin](https://ethresear.ch/u/vbuterin/summary) for feedback and the main idea.*

**TL;DR:** This post analyzes "Universal overflow" for [EIP-7999](https://eips.ethereum.org/EIPS/eip-7999) as a minimal way to preserve the legacy scalar retained-gas pattern around `CALL` while avoiding the main inefficiency of pricing all aggregate EVM gas at the highest-priced EVM resource.

## Background

A multidimensional fee market is the preferred endgame resource pricing mechanism, enabling precise control over resource consumption. Each scarce resource, such as execution, state growth, calldata, or blob data, is given its own base fee, and a transaction pays according to its realized consumption across these resources. This allows the market to fairly price resources according to targets and limits deemed safe by developers, and it allows resources to be consumed at maximum capacity within these limits. The implementation considered here is [EIP-7999](https://eips.ethereum.org/EIPS/eip-7999), which builds on [EIP-7706](https://eips.ethereum.org/EIPS/eip-7706) and lets the user set a single `max_fee`, simplifying UX while upholding good economic efficiency.

The main concern with a multidimensional fee market is how to deal with gas observability (introspection). Specifically, some contracts rely on the gas parameter of the `CALL`-family opcodes (hereinafter, `CALL` will be used as shorthand) to forward only a fraction of the caller's available gas, retaining gas for the remaining operations to be completed in the calling contract. Since the gas parameter is not multidimensional, developers relying on gas introspection will lack granularity in terms of how much gas they can forward across resource dimensions. While it would be desirable in general to move away from gas introspection, it is not clear at this point that this is acceptable to developers and users.

For this reason, EIP-7999 outlines options for dealing with subcalls with gas parameters. A baseline approach is to let the EVM [reinterpret](https://github.com/ethereum/EIPs/blob/2215c17cde2c7ee0bb5068f2beb573c4776e92ac/EIPS/eip-7999.md#evm-without-gas-observability) legacy subcalls with a gas parameter $g_c$ by forwarding a fraction of the caller’s remaining budget in each resource dimension. If the caller’s remaining budget in dimension $j$ is $g_j$ and the remaining aggregate gas is $g_r := \sum_j g_j$, the call forwards $\lfloor g_j \cdot \min(1, g_c/g_r)\rfloor$ in each dimension $j$.

By having users supply a single transaction gas limit and [aggregating the EVM gas](https://github.com/ethereum/EIPs/blob/2215c17cde2c7ee0bb5068f2beb573c4776e92ac/EIPS/eip-7999.md#multidimensional-fee-market-with-aggregate-evm-gas), processing can proceed as it does currently in the EVM. The downside is that the user must stipulate an unnecessarily high `max_fee` allocation $m$ whenever the aggregate EVM gas limit is not ultimately consumed in the highest-priced EVM resource.

Let $j$ index non-deterministic EVM resources with base fees $b_j$ and counterfactual per-resource limits $g_j$, and let $i$ index resources with deterministic gas usage $g_i$ and base fees $b_i$. Define the highest-priced EVM resource as $b_\text{max} := \max_j b_j$. The aggregate transaction gas limit $g_a$, where $g_a = \sum_j g_j + \sum_i g_i$, then increases the required pre-execution base-fee coverage relative to using individual EVM gas limits $g_j$ by:

$$
\sum_j (b_\text{max} - b_j)g_j.
$$

The base-fee part of the funding check, including deterministic resources $i$, becomes:

$$
m \ge (g_a-\sum_i g_i) b_\text{max} + \sum_i b_i g_i.
$$

Suggested options for alleviating this have been to:

* Invalidate a block when the post-transaction check shows that the total fee for a transaction exceeded its `max_fee`.
* Give the block producer the ability and responsibility to supply any missing funds as part of the post-execution check.
* Give the transactor the ability to provide limits for all dimensions, if they so wish.

The last bullet-point option is a Hybrid EVM gas design. It is the most satisfying option presented in EIP-7999. Users relying on `CALL` with a gas parameter can use aggregate EVM gas and all other users can have separate limits for every resource. Some users can aggregate only certain resources. However, for those relying on aggregate EVM gas, the unnecessarily high `max_fee` allocation remains.

## Universal overflow

One idea for improving on "Hybrid EVM gas" is "Universal overflow". It reduces the proportion of gas that must be priced at the most expensive EVM resource in common use cases involving `CALL` with a gas parameter. Vitalik proposed the design as follows:

> *we have n+1 dimensions of gas, where n+1 is "universal overflow". All ops attempt to consume from their intended form of gas, and if that runs out, they start consuming from universal overflow. The GAS opcode returns remaining universal overflow, and the CALL opcodes forward all new gas dimensions, but only the specified universal overflow.*

In other words, a legacy `CALL` forwards all remaining regular multidimensional gas limits, while the scalar gas parameter controls only how much universal overflow is forwarded. This preserves the key retained-gas use case of legacy gas observability: a caller can still use a scalar gas value to reserve a post-`CALL` buffer, while the bulk of execution is priced in multiple dimensions. Figure 1 shows a subcall with universal overflow in green and regular gas limits in red.

![Universal overflow|690x336](images/zRBQDllXsvJhLJYBh4nmZn720cR.jpeg)

**Figure 1.** Universal overflow in green, specified as an additional transaction parameter alongside regular multidimensional resource limits in red. A legacy `CALL` forwards all remaining regular multidimensional limits, while its scalar gas parameter determines how much of the shared universal overflow is forwarded. Once a resource's regular limit is exhausted, the transaction utilizes its universal overflow.

Under this design, the pre-execution base-fee funding check will not require the `max_fee` to cover the most expensive resource for all EVM gas of the transaction, but only for the universal overflow amount. In the common case where this is mainly the gas that the caller wishes to retain after executing the `CALL`, this can be a small proportion of the total EVM gas allocated for the transaction, improving economic efficiency substantially. Since the universal overflow limit $o_u$ can be spent on any EVM resource $j$, the pre-execution base-fee funding check requires:

$$
m \ge \sum_j b_j g_j + o_u b_\text{max} + \sum_i b_i g_i.
$$

The improvement lies in $b_\text{max}$ no longer being applied to the full EVM gas limits $\sum_j g_j$. A conservative block validity pre-check would need to reserve capacity for the possibility that $o_u$ is spent entirely on any single EVM resource (e.g., by reserving $o_u$ headroom in each EVM dimension).

There is also a second feature, which may or may not be useful: complex transactions with several branches can rely on universal overflow as a more fungible gas buffer, at the cost of having to pre-allocate more funding for that buffer according to the most expensive resource. 

One limitation is that Universal overflow does not preserve `GAS` as a measure of all remaining execution capacity. While the EVM tracks the regular multidimensional limits, the legacy `GAS` opcode reports only the universal overflow that the scalar `CALL` parameter can control. Contracts that need to know how much regular gas remains in each dimension may therefore need a new multidimensional introspection mechanism, or enough universal overflow for the scalar interface to remain useful.

## Relationship to EIP-8037

[EIP-8037](https://eips.ethereum.org/EIPS/eip-8037) uses two resources, regular gas and state gas, which share a single base fee. If the post-intrinsic gas exceeds the [EIP-7825](https://eips.ethereum.org/EIPS/eip-7825) regular-gas budget, the excess is placed in a special state-gas reservoir, which can only be consumed by state-creation operations. The remaining, non-reservoir gas (`gas_left` in EIP-8037) will be referred to here as execution gas. The similarity to universal overflow is that the `CALL` gas parameter controls a budget that can also serve as fallback gas. In EIP-8037, execution gas can also be consumed by state-creation operations, after they have depleted the state-gas reservoir.

However, for EIP-7999, the overflow resource needs to be a separate resource, with a funding check at the highest relevant base fee. If execution gas itself is used as the overflow resource, a conservative funding check would need to be applied to the entire execution-gas limit at the maximum base fee, essentially mirroring "aggregate EVM gas" as described in EIP-7999. This would affect a much wider set of transactions and degrade economic efficiency.

The current plan for EIP-7999 is to split out state creation into its own resource with its own base fee. Special handling due to the EIP-7825 transaction gas cap is then required, just as in EIP-8037. The execution gas limit cannot exceed the EIP-7825 transaction gas cap. To preserve this cap, clients would also track total execution gas consumed, including execution gas consumed from the universal overflow. Execution operations may draw from universal overflow only to the extent that the resulting total execution-gas consumption remains within the cap.

## Overflow vector

It would be ideal to also remove the worst-case term $o_u b_\text{max}$ from the pre-execution funding check. A potential extension to Universal overflow is therefore to use an "Overflow vector" $\mathbf{o}$, with one component for each of the $n$ EVM resources, instead of a single universal overflow. One possible legacy-observability rule is to let $o_r := \sum_j o_j$ and have the `GAS` opcode return $o_r$. For $o_r>0$, a `CALL` with gas parameter $g_c$ forwards $\lfloor o_j \cdot \min(1, g_c/o_r)\rfloor$ overflow gas in each resource dimension $j$; if $o_r=0$, it forwards no vector overflow. Unlike Universal overflow, this aggregate is only a scalar projection of a resource-specific vector, so it may be a poor runtime signal for whether the retained gas mix is sufficient. The regular multidimensional limits are forwarded in full.

Figure 2 illustrates a typical use case: a subcall executes under the regular multidimensional limits, while subsequent caller-side processing can use the retained overflow vector.

![Overflow vector|641x500](images/ozzN5UxEwsqGOsiyudfidXG689V.jpeg)

**Figure 2.** Overflow vector in yellow with one additional overflow per regular multidimensional resource limit in red. The amount of the overflow vector passed on in a subcall is determined by the `CALL` gas parameter relative to the overflow vector's aggregate gas. Once a resource’s regular limit is exhausted, the transaction utilizes its associated overflow. In the example, the caller reserves the full overflow vector for later: the subcall executes under the regular multidimensional limits passed to it, while subsequent caller-side processing can use the retained overflow vector.

If the user has reliable estimates for the transaction's overflow usage in each resource dimension, the overflow vector can avert excessive `max_fee` allocations. Because each overflow component is separately specified and priced, the upfront funding check need not charge any overflow budget at the highest-priced resource unless that budget is actually assigned to that resource:

$$
m \ge \sum_j b_j (g_j + o_j) + \sum_i b_i g_i.
$$

It is not clear whether the improved economic efficiency of the Overflow vector justifies its adoption over Universal overflow, given its added complexity. When the user relies only on the overflow vector, the contract cannot generally determine at runtime, from the aggregate gas returned by `GAS`, whether the remaining mix of overflow gas across resources will be sufficient for the intended execution (for example, the operations that are set to execute after a subcall). This motivates the hybrid variant discussed below: if the resource mix of the retained gas is uncertain, the user can use universal overflow for that uncertain portion, while still using the overflow vector for resource usage that is known in advance.

## Alternative variations

### Gas reservation

The difference between forwarding the gas-limit vector in a `CALL` proportional to the specified gas (a baseline approach explored previously) and forwarding the overflow vector proportional to the specified gas is that the overflow vector can be chosen to have a different *resource composition* than the caller’s regular gas-limit vector. This can be beneficial because the calling contract may want to reserve gas for a different set of post-`CALL` operations (e.g., cleanup, accounting, emitting logs) than those done by the callee, meaning that the resource mix may differ. An overflow vector makes it possible to reserve a different mix than what is forwarded.

A more invasive—but potentially cleaner—EVM change would be to let contracts explicitly reserve a specific gas vector at runtime. Conceptually, this splits the caller’s remaining budgets into an *available* (forwardable) vector and a *reserved* (non-forwardable) vector that is guaranteed to remain for post-`CALL` execution. This could be realized either (a) via an opcode that moves gas from the available vector into a reserved vector (and optionally releases it later), or (b) via a multidimensional `CALL` variant that takes both a forwarded gas vector and a reserved gas vector.

### Hybrid overflow

The two approaches proposed in this post can also be combined by allowing both an overflow vector $\mathbf{o}$ and a universal overflow $o_u$. When the regular gas limit for a resource is exhausted, the protocol first uses any remaining gas in that resource’s overflow-vector component $o_j$, and only then uses gas from the universal overflow $o_u$. The corresponding base-fee funding check would be:

$$
m \ge \sum_j b_j (g_j + o_j) + o_u b_\text{max} + \sum_i b_i g_i.
$$

However, this hybrid would also need a legacy-observability rule. The most straightforward rule is that the `GAS` opcode returns only $o_u$, and the legacy `CALL` gas parameter controls only how much universal overflow is forwarded.The overflow vector is therefore not exposed through legacy gas observability and, under legacy `CALL`, remains with the caller for any processing taking place after the subcall. 

## Conclusion

Universal overflow offers a minimal way to preserve the legacy scalar retained-gas pattern around `CALL` while avoiding the main inefficiency of pricing all aggregate EVM gas at the highest-priced EVM resource. By limiting the highest-price funding requirement to the explicitly supplied universal overflow, it gives contracts a familiar retained-gas buffer without abandoning multidimensional pricing for the bulk of execution. Overflow vectors and hybrid solutions may offer useful refinements. Still, Universal overflow provides an intuitive baseline for reconciling gas observability with a multidimensional fee market.