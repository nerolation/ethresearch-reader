The current sharding spec describes dispensing collation rewards (coinbase rewards plus transaction fees) in the corresponding child shard. Rewards can also be given to validators in the main shard, and both approaches have pros and cons.

**Pros of dispensing in the main shard**

* **No witness required**: Because of statelessness specifying a receive address in a child shard requires providing a witness. Having validators maintain witnesses for receive addresses across all shards is not really an option, as that defeats the purpose of sharding. Validators can request witnesses from the network, but this is not ideal as it creates a dependency. In an adversarial setting, this could even prevent validation. In the main shard, the receive address can be specified without providing a witness.
* **Consolidated rewards**: Instead of being spread across 100 shards as fragmented dust, collation rewards can be consolidated on the main shard on a single address.
* **Deposit address reuse**: Validators already have a readily available address on the main shard, namely the deposit address, which can be reused as a receive address.

**Pros of dispensing in the child shard**

* **Economic bootstraping**: Providing collation rewards in child shards is a way to bootstrap child shards' economy. This is especially relevant in the early days because child shards start empty with no economic value attached.
* **Faster access to rewards**: To preserve integrity of the main shard's Ether supply, collation rewards in the main shard would have to undergo a long "confirmation period" before being redeemable. In the child shards rewards can be spent immediately.
* **Less main shard gas**: Pushing collation rewards in the child shard means that adding a collation header in the VMC consumes slightly less gas in the main shard.

There are very good reasons to dispense rewards in either the main or child shards. My personal recommendation would be to give the option to validators to chose where they want receive collation rewards.