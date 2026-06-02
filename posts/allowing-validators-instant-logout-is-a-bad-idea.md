Suppose that validators are infinite-term, so no logout or withdrawal is possible. Suppose that a (51%+) attack begins, which degrades performance and causes even honest validators to start losing small amounts of money from inactivity penalties. Honest validators have one of three choices:

* Keep attempting to validate on the main chain
* Coordinate on a minority fork
* Do nothing (ie. shut down)

The first strategy might give them a payoff of -1 on the main chain and -10 on the minority fork (because that's what minority forks do; they heavily penalize any validator that is not participating in the fork). The second strategy would give them a payoff of -5 on the main chain and 0 on the minority fork. The third would give them a payoff of -5 on the main chain and -10 on the minority fork. Hence, honest validators have to make a judgement: could they successfully coordinate a minority fork? If probably yes, they go for strategy 2, if probably no, they go for strategy 1.

However, suppose that we add "log out" into the decision set. Log out gives a payoff of 0 on the main chain and 0 on the minority fork; hence, it strictly dominates all other strategies. However, validators logging out is quite a pathological outcome, because it only further cements the attacker's stranglehold on the blockchain.

Hence, it seems that allowing logging out during any situation that might look like an attack is a bad idea. However, we also want to prevent or at least discourage griefing attacks that make it impossible for validators to ever leave.

I see two approaches:

1. Allow validators to log off with 1 month's notice (replacing 1 month with the length of time needed to perform a minority fork under near-worst-case conditions)
2. Remove the concept of logging off entirely, in favor of fixed-term deposits (say, 4 month term). Allow validators that are in "term ended, waiting for withdrawal" mode to extend their terms for another term length, potentially indefinitely.

(2) can serve the secondary function of enforcing fairness if conditions for depositing change. For example, if the minimum deposit size increases between the start of one term and the start of the next term, then term extension can only be allowed if the deposit satisfies the same conditions that a newly logging in validator would.