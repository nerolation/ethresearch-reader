**TLDR**: We suggest using a plasma chain to pay for gas offchain.

**Construction**

Let $P$ be a plasma chain which accepts token deposits (e.g. ETH or ERC20s) to top-up "gas balances" for offchain gas payments. A user that wants to pay for the gas of some transaction $T$ using his gas balance on $P$ creates a plasma "gas transaction" containing:

1) **Target transaction**: The transaction $T$, which can have a "native" gas price of 0 Gwei.
2) **Gas account**: The account from which the offchain gas payment will be deducted.
3) **Meta gas price**: The offered "meta" gas price for the miner that includes $T$ onchain.
4) **Timeout**: An optional timeout (a block height) after which the offer ends.
5) **Signature**: A signature of the gas transaction against the gas account.

Once the gas transaction has been included in $P$ the miner that includes $T$ onchain is eligible to claim the corresponding gas payment. For this, the miner creates a "gas receipt transaction" on $P$ proving that $T$ was confirmed onchain by him and deducting the appropriate balance.

Specifically, the plasma chain has light-client access to the main chain and the miner provides the Merkle path in the receipt trie corresponding to $T$ and uses `gasUsed` to calculate the meta gas payment. Notice that the nonce of $T$ means that there can only be a single miner claiming the meta gas payment.

**Discussion**

Offchain gas payments can been useful for a variety of reasons. First of all they expand the design space of gas payments, allowing to pay gas with non-ETH tokens and to create exotic conditions for gas payment such as the optional timeout in the construction above.

Second, offchain gas payments can be useful for cheaply paying for gas without touching the EVM's state trie in the context of [state-minimised execution engines](https://ethresear.ch/t/state-minimised-executions/748) or [stateless blob shards](https://ethresear.ch/t/log-shards-and-emv-abstraction/747).

It is also possible to setup offchain gas payments with payment channels to individual miners but that encourages centralisation. The plasma construction is a decentralisation-friendly approach to offchain gas payments.