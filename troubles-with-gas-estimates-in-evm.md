At SKALE we need to charge the exact cost of a particular transaction to a particular user.

The fundamental problem we need to solve is that at the very end of a Solidity transaction we need to find out exactly how much gas this transaction uses. 

It turns out that simply measuring gas used as the last line in a Solidity function does not work, because there is some gas used and freed AFTER the last line when the function returns.

We would be happy to issue a token grant to someone who knows how to solve it.