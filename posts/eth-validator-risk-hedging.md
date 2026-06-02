I would like to thank @danrobinson for previous discussions.

 
An interesting question is how a validator can participate in staking without taking a risk of 
the underlying token. For example, I want to stake ETH, but I do not want to become ETH investor and worry about ETH going up or down.  What I want is invest $100, and get my $100 plus a guaranteed profit after, say, 6 months.

Here is a way to do it using options (I assume the current price of the token is $5):

1. You stake 20  tokens.
2. You buy an option to sell 20  tokens at the current price of $5 at expiration of 6 months
3. You underwrite (sell) an option to buy 20 tokens at  $5 at expiration of 6 months


So essentially you pay the price of a difference between the two options. Plus in order to underwrite an option, you pay to get for a slashing insurance to from a third party.

An interesting possibility to eliminate slashing insurance is as follows:

1. If a slashable event occurs:
a)  instead of slashing the token, you pass the ownership of the tokens and the corresponding underwritten option to an escrow "slash later" contract.

b) After 6 months, if the option ends up  being executed, the escrow account will get $USD(Tether) instead of the token, and this $USD is slashed. In this case, the underwritten option will not be dependent on slashing and the buyer of the option will not have to take the risk.