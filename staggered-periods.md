**TLDR**: We suggest staggering period boundaries across shards. This smooths out main chain demand, spreads out notary "multi-bursts", and may come with other advantages.

**Construction**

We stager period boundaries across shards (as opposed to aligning them). To illustrate with [5-block periods and 100 shards](https://ethresear.ch/t/sharding-phase-1-spec-retired/1407) we get five 20-shard groups with period starting at main chain heights $i$ modulo 5 for $i = 0, 1, 2, 3, 4$.

**Discussion**

Staggering period boundaries comes with several potential advantages:

1) **Smooth main chain demand**: Aligning shard periods creates artificial demand cycles on the main chain. Staggered periods leads to smoother sharding overhead on the main chain, reducing gas price variations, and creating less opportunity for main chain miners to do mass censorship of SMC transactions.
2) **Spread out notary multi-bursts**: A notary selected on multiple shards in the same period will incur multiple bandwidth bursts simultaneously. With staggered periods those multi-bursts can be spread out.
3) **Faster cross-shard communication**: Receipt-based cross-shard communication is done by creating a receipt in shard A, waiting for the relevant data root of shard A to "settle", and then referencing that data root in another shard B. Assuming no fancy infrastructure (e.g. cross-shard witness auto-update, or sub-period roots) we can expect receipt-based transactions to take ~1 period in the best case, and only ~0.5 periods with staggered periods. With long periods (e.g. [100-block periods](https://ethresear.ch/t/a-minimal-sharding-protocol-that-may-be-worthwhile-as-a-development-target-now/1650)) this can be a significant speed-up.
4) **Vote chains**: In an upcoming ethresear.ch post we introduce vote chains to constrain notaries for good behaviour. Staggered periods can make vote chains more effective by reducing effective voting windows.