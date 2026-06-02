One challenge I'm seeing in the current design is that we want to have fixed-size deposits (32 ETH), for two reasons (i) to make random selection convenient, (ii) to have a minimum deposit size so that slashing always destroys at least some minimum amount of money. But fixed-size deposits don't really play well with rewards and penalties, which in the current Casper FFG approach simply directly go into deposits.

One possibility is to have rewards and penalties tracked in a separate variable, and then applied only at point of withdrawal. However, this has the issue that it ignores another important function of penalties in Casper FFG: to weed out and reduce the influence of validators that are offline, particularly so that if more than 1/3 of validators go offline at some point, those validators' deposits start quickly dropping, until they can go online again.

Here is one proposed solution (from @JustinDrake). Validators have 32 ETH deposits, and have a separate variable that tracks rewards and penalties. If a validator's penalties minus rewards exceed some critical threshold (eg. 8 ETH), then the validator can be kicked out of the validator set.

Does this achieve the intended objectives? It seems to, but the analysis is somewhat nontrivial:

* If some portion of validators go offline, then their penalties will start accruing, and eventually the online validators will be able to kick them out. That said, it may take longer than before, because we would have to wait until their deposits go all the way down to 24 ETH, instead of possibly exiting earlier.
* If an online majority want to censor a minority, they can do that, just as before. The need to make an active kick-out message is not an impediment to the majority, because they control the chain anyway. So in this regard, nothing is made worse. There's no gain to a majority from censoring kick-out messages.

Does this scheme have any other issues? Are there any better alternatives?