We are trying to implement self-recharging wallets in Solidity

Basically, the idea is 
- wait until the very end of a Solidity transaction
- reimburse the transaction sender EXACTLY the gas spent by the transaction by pulling money from the "recharger" account.

In this case, the sender can recharge the wallet once and it will never need to recharge it again, because the funds in the wallet will stay constant.

We thought that we could implement the above by simply using Solidity and retrieving the value of gas spent.

It turns out, the does NOT work.

The reason is AFTER the Solidity call finishes,  there is lots of gas paid back EVM frees the memory.

I wonder if anyone knows how to solve the problem ...