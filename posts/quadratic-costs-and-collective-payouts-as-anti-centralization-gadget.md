The following is a proposal for a kind of gadget that could be added to Casper (or potentially other mechanisms) to explicitly discourage concentration and create a fairer environment for small validators.

Suppose that every validator $v_i \in V$ (with weight $w_i$, weights summing to 1) can specify a value $x_i$ that represents their "vote" in the gadget. At the end of every round, each validator $v_i$ pays $\frac{1}{2} * w_i * x_i^2$, and gets back $w_i * \sum_j{(w_j * x_j)}$.

Suppose $R = w_i * \sum_{j \ne i}{(w_j * x_j)}$ is the contribution to a validator's payout from all other validators. A validator's net payout is $R + w_i * (w_i * x_i - \frac{1}{2} * x_i^2)$. The derivative equals zero (and hence the payout is maximal) at $x_i = w_i$. Hence, larger validators have an incentive to choose larger values of $w_i$, and as a result, their payouts will be lower.

For example, suppose other validators' contribution, $\sum_{j \ne i} (w_j * x_j)$, is $0.25$, and some given validator has $w_i = 0.15$. Then this is their payout curve:

![Screenshot_2018-07-04_00-19-39|324x215](images/tbeGDv36TVaqCpRIvU3O8oYeoCe.png)

The optimum is at $x=0.15$, with a payout of $R + w_i * (w_i * x_i - x_i^2)$ $= 0.15 * (0.25 + 0.0225 - 0.01125)$ $= 0.0391875$ ($0.26125$ per unit weight). However, some smaller validator in this scenario, with $w_k = 0.01$ would have voted $x_k = 0.01$, and they would be getting a payout of $0.01 * (0.2725 - 0.0001) = 0.002724$ ($0.2724$ per unit weight). The result is that smaller validators, and validators that are _less_ capable of forming collusions, get higher payouts than validators that are _more_ capable of forming collusions.

This has implications beyond the blockchain space: it shows how [quadratic voting](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2343956) in general, which works very similarly to this mechanism in terms of private costs and collective effects, has an even larger egalitarian effect than originally expected, and particularly how it can have pro-egalitarian consequences even without taking into account any explicitly built-in egalitarian properties (eg. distributing the revenue proportionately to all unique humans).