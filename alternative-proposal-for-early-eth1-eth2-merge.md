This is an alternative proposal for eth1 <-> eth2 merging that achieves the goal of getting rid of the PoW chain and moving everything onto the beacon chain on an accelerated schedule. Specifically, it requires stateless clients, but NOT stateless miners and NOT webassembly, and so requires much less rearchitecting to accomplish.

### Prerequisites

* Stateless client software (a "pure function" for verifying blocks+witnesses, along with a method for generating witnesses for a block) available with multiple implementations
* Eth1-side protocol changes to bound witness sizes to ~1-2 MB

### New beacon chain features

* The state of shard 0 houses the state root of the eth1 system.
* We add a new list of validator indices, `eth1_friendly_validators`. Any validator has the right to register themselves as eth1-friendly (and deregister) at any time.
* The proposer on shard 0 at any given slot is chosen randomly out of the eth1-friendly validators.
* The shard 0 committee verifies the shard 0 blocks, which are expressed in a format that contains both the block body as it currently exists, plus the stateless client witness. All other shard committees verify their own shard blocks, but they would only be verifying data availability, not state execution, as shard 0 is the only shard that would be running computation.

### Operation

The eth1 system would "live" as shard 0 of eth2 (eventually, we can adjust it to be one of the execution environments, but at the beginning it can be the entire shard). Validators that want to participate in the eth1 system can register themselves as eth1-friendly validators, and would be expected to maintain an eth1 full node in addition to their beacon node. The eth1 full node would download all blocks on shard 0 and maintain an updated full eth1 state.

### Transition

The transition would still be done using a procedure similar to https://ethresear.ch/t/the-eth1-eth2-transition/6265.