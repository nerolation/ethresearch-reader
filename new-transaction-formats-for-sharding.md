Here is a proposed new transaction format.

    [
        version_num,  # Transaction format version, 0 for now
        chain_id,     # 1 for ETH, 3 for ropsten...
        shard_id,     # The ID of the shard the tx goes on
        acct,         # The account the tx enters through
        gas,          # Total gas supply
        data          # Tx data
    ]

Depending on what is done in https://ethresear.ch/t/tradeoffs-in-account-abstraction-proposals/263, fields can simply be added on to the end of this as needed.