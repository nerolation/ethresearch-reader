I just published a draft paper outlining a design for a synthetics-based off-chain exchange: 
https://twitter.com/danrobinson/status/1108406385442803714

The core idea is a payment channel collateralized by a single asset, but where the channel states can include balances in any asset. When the channel is closed, the balances that are sent to the parties are computed based on the current prices of some assets. In other words, the channel state is a contract-for-difference that cash-settles based on the prices of some reference assets.

This can be implemented in state channels (in a framework like Counterfactual) by having the channel-closing logic refer to a price oracle. Alternatively, it can be implemented on simple bidirectional payment channels without a price oracle, by having parties continuously settle the current prices to the channel (apparently Vitalik had this idea a while ago!).

There are some research areas I'd particularly love any input on:

- How can we combine this with plasma?
- What's the most flexible format for representing channel states?
- What other derivatives (such as options) can usefully be represented in the channel?
- How safe is the continuously-settled approach? How can we model the safety of it economically, based on the volatility of the positions in the channel?