Front-runners take lots of money on Uniswap. The question is if there is a simple-but-better strategy to pay less money to front runners.

One strategy I came up with is to write a script that observes Uniswap pending transactions and issues matching ones.

As an example, if I want to buy, say, 10 tokens  of X,  the script will wait until it sees someone in the pending queue selling, say, 6 tokens, and then immediately issue a high gas price transaction to buy 6 tokens.

The question is whether the strategy above is better than simply buying on Uniswap immediately.