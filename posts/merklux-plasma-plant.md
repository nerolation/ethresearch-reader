I am now implementing a plasma for dApps which manages its state with Merklux(A merkleized unidirectional data flow for state verification across evm based blockchains) pattern. 

The key is using the following concepts for plasma operation
1. **Merklux**: Using flux pattern to make the side chain to be verifiable
2. **PEPoW**: When block proposers are pseudo-randomly selected, gives them different priorities to mine each block to backup an irregular block proposing activities.
3. **Casper for PEPoW**: Using Casper to finalize the plasma blocks and giving maximum incentives when each signed block is proposed by the highest priority block proposer.

Here is a brief introduction to the plasma plant project. (I'll try to update more detail article and spec sheet about this project after the PoC implementation)

https://docs.google.com/presentation/d/e/2PACX-1vTUQzaGMfiSNcM0SWa97s0DJ8jjSNPzlfTwhdCDSF353AvJEJNg9e-4v--QBmsss0MF1wwhzOY_EghG/pub?start=false&loop=false&delayms=3000

<iframe src="https://docs.google.com/presentation/d/e/2PACX-1vTUQzaGMfiSNcM0SWa97s0DJ8jjSNPzlfTwhdCDSF353AvJEJNg9e-4v--QBmsss0MF1wwhzOY_EghG/embed?start=false&loop=false&delayms=3000" frameborder="0" width="960" height="569" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe>

And now I am in Prague for Devcon4, so please let me know if you have any interest to have a talk around the conference hall about plasma together.