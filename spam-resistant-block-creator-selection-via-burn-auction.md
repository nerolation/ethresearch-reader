

## Introduction

In a bunch of different contexts we want to select who is allowed to create a block. 

Currently we have a compeition (pow, pos) to decide who is allowed to create a block. This is to

1. Rate limit the blocks that a node needs to check.
2. Provide a level of censorship resistance by randomly selecting this block creator so that censorship efforts need to involve a large percentage of the network to prevent a transaction from being minded for a long time. 

These schemes are wasteful in that they require a large amount of stake to be deposited or work to be done. Both are costs that need to be reimbursed via fees. It creates this monopoly where a single person is created for creation of block x and they are insentivized to extract as much funds as possible in the form of transaction fees. 

Here we propose a method to auction the right to create a new block to the person willing to burn the most eth. This results in a cencorship resistant block creation that requires that an amount == fee of the transaction they are consoring, be burned in order to censor it.

## Mechanizim

We have an auction where everyone bids the amount of eth they are willing to burn in order to get the right to create the next block. 

The winning bid is the highest amount of eth. This address is assigned teh right to create the next block. 

## Incentives 

Every block proposer has the following properties 

`target_profit` the profit they want to make mining this block.

They also have a list of transactions that can be included in a block they calculate 

`sum_total_fees` = SUM (tx1.fee , tx2.fee, tx3.fee ... txN.fee) where tx1 to txN are the transactions ordered by fee. 
They caculate their `burn_bid` =  `sum_total_fees` - `target_profit`

and publish this as they bid. 

1. If everyone has the same `sum_total_fees` we select the bid that has the lowest `target_profit`
2. If bidders have a different view of `sum_total_fees` we select either highest overall bid. This means that if a block creator wants to censor tx.2 they need to 
reduece their target profit by tx.2.fee in order to win the auction. 

## Incentives to relay transactions

This mechanizim reduces the incentives to relay transactions around the p2p network. Because having transactions that no one else is helpful during this bidding process. 

This puts the users strongly in control of who they relay their transactions to which also means that they are able to select the winning block creator if they work together. 

## Conclustion

We are unable to know in protocol how many transaction of what fees are available to go in a block. 

We want to include the transaction with the highest economic value. 

We use the fee burn to show us in protocol who is going to add the most economically valuable transactions.