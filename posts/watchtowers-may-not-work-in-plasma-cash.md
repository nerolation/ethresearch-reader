I recently realized that the kind of watchtowers supported in Lightning may not be fully possible in Plasma Cash. (I believe this is true of classic Plasma and Plasma MVP as well; this fact may be well-known in those contexts, so apologies if this is trivial).

Watchtowers are entities to which a user can outsource the task of watching the chain and challenging invalid attempted withdrawals.

While Plasma Cash would support watchtowers that challenge attempted withdrawals of _spent coins_—since, if the user is cooperating with them, they will be aware of subsequent state that invalidates the prior state—they cannot always challenge attempted withdrawals of _coins with invalid histories_ (as can occur if a Plasma Cash chain operator is malicious). If they tried, a Plasma Cash chain operator and user could collaborate to defraud the watchtower (by withholding blocks to prevent the watchtower from determining whether the attempted withdrawal is valid or not).

Watchtowers can still ping users to notify them that there is an attempted withdrawal. However, this still requires the user to be online. Additionally, there is no way to prove that such a notification was or was not sent, so there is no way to punish the watchtower for misbehavior.

The best solution I can see would be to require the watchtower to effectively bear the risk of operator misbehavior, by promising to challenge any invalid withdrawals (and therefore relying on the Plasma Cash operator not to misbehave).