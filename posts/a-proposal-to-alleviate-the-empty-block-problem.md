If you look at ETH block explorer you see that some pools like Spark Pool are producing empty blocks. 

The reason for this is they start mining  the block once hash is available, without having to wait for or distribute the actual transactions. Since they do not have the previous block transactions, they can not include transactions in a block without the risk of a double spend.

A simple proposal to alleviate this would be to allow transactions that specify exactly the target block id. A transaction like that would have to be included in the specific block that has the requested block ID. 

Arguably, miners could include these transactions without risking a double spend, therefore filling up blocks which are currently empty. Transactions like this would arguably be less convenient, but much cheaper in terms of gas price.