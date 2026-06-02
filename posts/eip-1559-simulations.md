Hi all!

I wrote a notebook introducing simple simulations of EIP 1559, the anticipated fee market proposal by @vbuterin, @econoar and now many others. The notebook is [here](https://github.com/ethereum/rig/blob/9de2ecbba130fba13011eca2b229979b0adcba52/eip1559/eip1559.ipynb).

EIP 1559 was discussed quite a lot on other forums (see links section below). I wouldn't want to add to the noise and start yet another thread, so I will focus this post on the approach of the notebook above, the next steps and some literature I am looking at. The notebook also prompted discussion on Twitter that would fit better here it seems.

## The notebook

The simulations assume some demand comes in between two blocks, is either included in the block or not, sometimes stays in the mempool and sometimes not. I increasingly add complexity to the simulation but stop short of having "smart users" who act based on the current market or "smart producers" who strategically try to improve their payoffs.

## Next steps

1. Real demand is not that simple. Users look at the current market conditions before deciding how to set their fees, so we need to model this behaviour (there was an [interesting post](https://ethresear.ch/t/estimating-cryptocurrency-transaction-demand-elasticity-from-natural-experiments/2330) a few years ago by Vitalik). If clients set the parameters for them, this is also something we want to model. Looking at historical prices may help identify the processes at play. We want to be able to express time-preferences.

2. Block producers may (will?) have more sophisticated behaviour than just include anything. More importantly, we need to make sure the mechanism is incentive-compatible (producers behave honestly, in a timely fashion). Formal analysis is probably more helpful here than simulations.

3. Integrating the simulation with Hive (suggested by @AFDudley). More generally, there is work to do on matching real conditions (down to the client implementation) with the simulations. There was chatter about an EIP 1559 testnet too over at the EthR&D Discord.

4. Mechanism tuning. EIP 1559 is "simple" (though I would argue, not that simple either) in that it looks like a fairly standard control mechanism: number go up, resistance go up; number go down, resistance go down. Variants exist, e.g., the [escalator algorithm](https://ethresear.ch/t/another-simple-gas-fee-model-the-escalator-algorithm-from-the-agoric-papers/6399) (suggested by @danfinlay).

5. I still have many unknowns and blind sides. The notebook was my attempt to build some intuition for myself and others, but many of the hard questions remain ahead. I'll be looking into the modelling a bit deeper over the next weeks too.

## Some links

- [Blockchain resource pricing, by Vitalik](https://ethresear.ch/t/draft-position-paper-on-resource-pricing/2838)
- [EIP 1559 proposal](https://eips.ethereum.org/EIPS/eip-1559)
- [Ethereum Magicians thread](https://ethereum-magicians.org/t/eip-1559-fee-market-change-for-eth-1-0-chain/2783)
- [Formation of a working group and amendment](https://ethereum-magicians.org/t/fee-market-change-working-group-formation-and-my-proposed-amendment/3195)
- [The escalator algorithm](https://ethresear.ch/t/another-simple-gas-fee-model-the-escalator-algorithm-from-the-agoric-papers/6399) + [EIP](https://github.com/danfinlay/EIPs/blob/ddb7a6afc477705ffdd8ba8b57774954a7955871/EIPS/eip-x.md)