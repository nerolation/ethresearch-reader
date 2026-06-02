Since in ETH 2.0 validators are going to have BLS key, there is an interesting proposal to include input causality into ETH 2.0.

For input causality, you do not know what transaction is included in the blockchain, until the moment it is included.  The transaction is threshold-encrypted by the user, and only once it is included in the block and finalized,  validators collectively exchange messages, decrypt it and run EVM on it.

A system like this would automatically prevent front running.