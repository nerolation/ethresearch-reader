See also a simpler older idea: https://ethresear.ch/t/call-out-assurance-contracts/466

Suppose that there is a set of N participants that are already playing some lose-lose game. For simplicity, we'll suppose that there are two moves, cooperate and defect, and if the majority cooperates each participant gets H if they cooperate and H - D if they defect, and if the majority defects each participant gets L if they cooperate and L - D if they defect. Casper is an example of roughly this model.

We modify the rules of the game as follows. First, we run the game, and simultaneously use some gadget (eg. voting, quadratic voting, liberal radicalism...) to choose a charity to donate funds to.  If the majority defects, every participant gets L if they cooperated and L - D if they defected. If no charity is chosen and approved by a majority, but the majority cooperates in the game, every participant gets H if they cooperated and H-D if they defected. If the majority cooperates and a charity is chosen, they get some reward M where L < M < H if they cooperated and M - D if they defected, and they themselves can choose whether to donate the difference H - M to the chosen charity or to burn it.

This scheme has the following nice properties:

* It is ~50% fault tolerant in that charities still get funded even if up to 49% are dishonest
* The modification does not cause anyone to suffer a risk of losing funds that they did not suffer before
* The scheme cannot be exploited to extract funds even by a majority attacker, as any "victim" of such an attack would vote to burn the funds, effectively converting an attack on the voting gadget into an attack on the underlying game, which is lose-lose in the case of attacks.

This allows us to do better than assurance contracts and other "fully voluntary" schemes (ie. schemes where no one loses money), by instead leveraging the "involuntary" nature of _existing_  lose-lose games.