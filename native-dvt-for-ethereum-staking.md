Distributed validator technology (DVT) is a way for Ethereum stakers to stake without fully relying on one single node. Instead, the key is secret-shared across a few nodes, and all signatures are threshold signed. The node is guaranteed to work correctly (and not get slashed or inactivity-leaked) as long as > 2/3 of nodes are honest.

DVT includes solutions like [ssv.network](https://ssv.network/) and [Obol](https://obol.org/), as well as what I call “DVT-lite”: either the [Dirk + Vouch combination](https://docs.gateway.fm/validators/nodes/validator-clients/3rdparty/) or [Vero](https://github.com/serenita-org/vero). These solutions do not do full-on consensus inside each validator, so they offer slightly worse guarantees, but they are quite a bit simpler. Many organizations today are exploring using DVT to stake their coins.

However, these solutions are quite complex. They have a complicated setup procedure, require networking channels between the nodes, etc. Additionally, they depend on the linearity property of BLS, which is exactly the property that makes it not quantum-secure.

In this post, I propose a surprisingly simple alternative: we enshrine DVT into the protocol.

## The design

If a validator has `>= n` times the minimum balance, they are allowed to specify up to `n` keys and a threshold `m`, with a maximum of `m <= n <= 16`. This creates `n` “virtual identities” that all follow the protocol fully independently, but are always assigned to roles (proposer, committee, p2p subnet) together.

That is, if there are a total of 100000 validators and you have a size-n validator with multiple virtual entitities, and there is a role with `t` participants (eg. `t=1` for proposal, `t=16` for FOCIL, `t=n/64` for some p2p subsystem that shards nodes into 64 subnets, there is a t/100000 chance that *all* of your virtual identities will be assigned to that role.

From the perspective of protocol accounting, these virtual identities are grouped into a single “group identity”. That single object is treated as taking some action (eg. making a block, signing) if and only if at least `m` or the `n` virtual identities signed off on the action. Based on this, rewards and penalties are assigned.

Hence, if you have an identity with eg. `m = 5`, `n = 7`, then if five signatures all attest to a block, you get 100% of the attester reward and your participation is counted, but if four signatures do, you get 0% of the reward and your participation is not counted. Similarly, to slash such a validator, you need to show proof that >= 5 of the nodes votes for A, and >= 5 of the nodes voted for B.

Note that this means that if `m <= n/2`, slashing is possible without any malfeasance, so such a setting is strongly anti-recommended, and should only be considered in situations where some nodes are normally-offline backups.

## Properties

This design is extremely simple from the perspective of a user. DVT staking becomes simply running `n` copies of a standard client node. The only implementation complexity is block production (or FOCIL production): realistically, a random node would need to be promoted as a primary, and the other nodes sign off on it.

This only adds one round of latency on block and FOCIL production, and no latency on attestation.

This design is easy to adapt to any signature scheme, it does not depend on any arithmetic properties.

This design is intended to have two desirable effects:

1. Help security-conscious stakers with medium to high amounts of ETH (both individual whales and institutions) stake in a more secure M-of-N setup, instead of relying on a single node (this also makes it trivial to get more gains in client diversity)
2. Help such stakers stake on their own instead of parking their coins with staking providers, significantly increasing the measurable decentralization (eg. Herfindahl index, Nakamoto coefficient) of the Ethereum staking distribution.

It also simplifies participation in existing decentralized staking protocols, reducing the client load and devops experience to something equivalent to the most basic form of solo staking, allowing such protocols to become more decentralized and more diverse in their participation.