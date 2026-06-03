I spent a bit of time looking at the psudeo-code in the eth2 specs as well as at the Serenity design rationale and noticed a discrepancy I hope someone could clear up.

It regards the reduction in reward depending on how quickly the attestation is included.  The [design rationale](https://notes.ethereum.org/9l707paQQEeI-GPzVK02lA#Base-rewards) states the reward is "full if included after 1 slot, 1/n of the full reward if after n slots", but it looks like [the code](https://github.com/ethereum/eth2.0-specs/blob/469f3d84a36a72453db503d32c5f2d370b401a1c/specs/core/0_beacon-chain.md#rewards-and-penalties-1) is using (64-n)/64 of the reward, where n is the number of slots delayed.  Obviously the latter is far less severe than the former, but I'm wondering which of these two is the canonical formula.

Related, I'm trying to marry the information supplied in https://github.com/ethereum/eth2.0-specs/pull/971 regarding the maximum annual Ether issuance with the formulae used to calculate it.  Taking an example from the PR if there are 30,000,000 Ether validating it lists maximum annual issuance as 991,483 Ether, but going through the maths gives me:

`per-epoch reward (GWei) = 64 * 30,000,000 * 10^9 // int(sqrt(30,000,000*10^9))`
`= 11,085,125,215`

`yearly reward (Eth) = per-epoch reward * 82,181.25 // 10^9`
`= 910,989`

so I'm about 9% below the expected number.  I assume I'm missing a piece of the reward system to make up the difference, but unsure what it may be.  Any explanation here would be greatly appreciated.