## Intro 

Auditing is really hard. Knowing who is a good auditor is really hard. If you audit hire an auditor you don't know if they found everything.

Auditing is largely based upon reputation. Which makes it hard for new people to enter and to compete with existing auditors. 

Here we propose to use future markets to incentivize audits. This allows us to build a reputation system around auditing and have a put your money where your mouth is opportunity for people to signal their confidence in the secuirity. 

## Oracle Problem

The oracle problem has always been an issue when dealing with prediction markets. Especially in the case of auditing because its impossible to know on chain whether a bug exists or everyone withdrew. Also there is a whole class of bugs that are subjective and can only be confirmed by objective review. 

In order to over come this problem we make a multisig of security experts that will resolve the prediction market. They can expect to be provided with info about bugs by other auditors but they are the ones to say if it is real or if it is inside the scope of the audit or not.

## Systems 

Anyone can add a dapp to the system by placing its code hash, a time limit and defining the scope. The multisig can provide several sample scope definitions. For example , "Funds are risk" , "DOS", "x Degree of decentralization". 

And a deposit to incentivize review. The deposit is incentivized into the "There are no bugs" side of the prediction market on uniswap. 

## A prediction market

Anyone is able to review the contract, if they find a bug i they are incentivized to trade on uniswap and share it. Once they share the bug the multisig can review it and resolve the prediction market. Basically removing all the money from the "There is no bugs" side of the market and giving it to "There are bugs" side. 

## Example flow

I finish my project, I hire x , y and z to audit it. After the project is finished I also place a some funds in the prediction market to incentivize people to review the project. 

## Future work 

This will let us find who are the best auditors. By finding things that other auditors don't find. Anyone can incentivize audit and review. We can build a reputation system using this.