By [Conor McMenamin](https://x.com/ConorMcMenamin9), Nikola Mratinic, and Angel Dominguez, all Nethermind. 

*Just as the Web3 and Agentic economies are continuously growing and evolving, so too are the maximal extractable value (MEV) strategies that exploit these economies. MEV defenses must also develop to ensure the long-term sustainability of these systems. This article highlights a recent MEV phenomenon of sniping affecting Agentic Token launches, and some defenses we at Nethermind identified to protect against such sniping.*  

*[Nethermind](https://www.nethermind.io/) are end-to-end solutions experts, from protocol design and architecture to implementation and deployment. If your project is leaking value, or you just want to learn more about our offerings, please reach out.*

*Thanks to the Virtuals Team and Michal Zajac for their reviews of the article. Reviews are not necessarily endorsements. At time of writing, Virtuals are actively considering what long-term Anti-Sniper solution to implement, and have not implemented or deployed any of the proposed solutions in this document.*

# Background

This article is inspired by a [recent announcement by Virtuals to allocate a heap of tokens ($12M worth) to fight sniper bots](https://gov.virtuals.io/proposal/56996763629027767054698714571712096750640983191659498948864059685705038611655) from unfairly profiting from and damaging Agent Token launches. The current strategy being employed by Virtuals is restricting the first buys at a token’s launch to Virtuals themselves. The strategy involves Virtuals submitting the first buy orders when Agent Tokens are released for sale, and then air-dropping the proceeds of these buys to all Virtuals stakers (subset of token holders). This is possible because the team executing the buys are also the protocol designers. 

Putting newly launched Agent’s Tokens in the hands of the same permissioned set is likely better for the ecosystem than allowing permissionless sniping. However, the end goal of a token launch should be to democratize access to tokens at launch and put Agent Tokens in the hands of the investors who believe in the value of the Agent. 

We want a protocol designed for long-term sustainability and for agent token launches to enable price discovery. Sniping / “pump and dumps” prevent this from happening in expectation. Retail buyers with genuine interest in the project can be lured into believing a project is worth more than it is following an initial price spike. Unfortunately, buying after a sniper provides the sniper with exit liquidity and immediate profit if the sniper chooses to dump. This pump and dump cycle leads to an exodus of investor demand, which in turn can cause prices to collapse, especially if known snipers are waiting with tokens to dump. This spiral leads genuine projects to be distrusted, and increases chances of project failure.  

Our proposed solutions, detailed in the Solution Designs Section, turn the end goals of equitable token access, price discovery, and long-term token stability, into achievable realities.

# Snipers

As the focus of this article is on protecting against snipers (also known as sniper bots, front-running bots), it is important to understand a sniper’s profile. By understanding how snipers act, we can protect against them. Snipers are defined by the following two properties, two properties that vanilla token launches enable, and the two properties that our anti-sniper solutions aim to break:

1. **Speed of execution advantages**. Snipers differentiate themselves from other blockchain actors by developing strategies to execute actions directly before or after an event on-chain. Sniper strategies to enable precision execution involve advanced hardware and software optimizations to react fastest to an event, spamming transactions to increase the likelihood of being first/last to act after/before an event, priority fee optimization to incentivize a proposer to select the snipers transactions, and/or tactical bundling of sniper transactions. For more information on MEV strategies see [here](https://x.com/_JonahB_/status/1951046151261634664) and [here](https://arxiv.org/abs/2212.05111). 
2. Snipers depend on maintaining their token inventory in high-liquidity high market cap tokens. This allows snipers to avoid exposure to price volatility and maximize available capital for future sniping opportunities. Sniper’s require **an ability to sell tokens between milliseconds and minutes after buying them**. Most snipers will maintain balances of stablecoins, although Ether and wrapped Bitcoin are also possible. As such, snipers avoid holding a fixed inventory of tokens for days, months or years, especially low-liquidity low market cap tokens.

Our solutions focus on ensuring that at least one of Properties 1 or 2 does not hold. 

# Virtuals Protocol

This Defense Program and our solutions are based on [Virtuals current “Genesis Launch”](https://whitepaper.virtuals.io/about-virtuals/tokenization-platform/genesis-launch) mechanism for launching Virtuals agents. 


![image|690x253, 100%](images/uG1PnEawoFHvnYM3OmZdrnosqb3.png)
*Figure 1. Virtuals Genesis Tokenomics.*

Genesis launches mint 1 billion Agent Tokens, with allocations as per the image above. The developer/team receive 50% while 37.5% is allocated for presale. The remaining 12.5% is paired against 42k $VIRTUAL deposited by participants in the presale, who deposit $VIRTUAL to gain access to presale prices. Presale purchases result in an immediate 300% gain vs the starting pool price. These paired $VIRTUALS and Agent Tokens are used to provide liquidity and enable price discovery for the Agent Token.

For all of its launches, Virtuals has chosen the [Uniswap V2 pool mechanism](https://github.com/Uniswap/v2-core) to deploy the initial liquidity. As mentioned, the starting ratio in the pool is 42,000 $VIRTUALS: 125M Agent Token (AT). In Uniswap V2 pools, trades maintain a constant product invariant, where $K = 42,000 × 125,000,000$. Specifically, when a buyer pays $X$  $VIRTUALS at pool launch, they receive $Y= 125,000,000 - \frac{K}{42,000+X}$

At the launch of these Agent Token pools, sniper behaviour is most prevalent given most of the presale and initial buying action is massively over-subscribed. This provides snipers with a **huge** opportunity.

## Snipers on Virtuals

Snipers execute the first buys on newly deployed pools. As retail have always followed initial snipes with more buys, snipers can easily sandwich these retail buys by dumping the initially sniped tokens for risk free profit.

[The current solution from Virtuals team has been to themselves front run Agent Token launches by submitting the first buy order of 42,000 $VIRTUALS to the pool](https://gov.virtuals.io/proposal/56996763629027767054698714571712096750640983191659498948864059685705038611655), which would receive 62.5M Agent Tokens (Check the pool invariant function!). These tokens are then airdropped to a subset of $VIRTUALS holders. 

![image|618x302, 100%](images/pE636S8p86hLgRxvP3AbkWUMoGp.jpeg)
*Figure 2. Top launches on Base*

This strategy from the Virtuals Defense Fund is highly profitable. This strategy has a **T+1min expected profit of over $7.5M** across all Virtuals launches so far, and a **T+1day expected profit of over $6M**. Although Agent Tokens are now in better hands than a “pump and dump” sniper, the tokens are still not in the hands of retail investors.

Thankfully, all hope is not lost!

By changing the token launch protocol and pool dynamics, we can greatly improve the standing of retail investors, and as such, the chances of developing a sustainable tokenized Agent economy. 

**Note:** A particularly seismic sniping event occurred during the [recent IRIS token launch](https://app.virtuals.io/virtuals/29015) — where the price peaked at almost 40,000% above the opening price — resurfaced the same structural issues this piece addresses. For clarity: although the IRIS agent is built on Nethermind technology and integrates [AuditAgent](https://auditagent.nethermind.io/), Nethermind had no token allocation and did not participate in the IRIS token launch.

## Other Protocols with Pool Launches similar to Virtuals

Virtuals is not the only launchpad suffering from the sniping issue. Zora users have expressed frustrations about snipers being able to buy tokens first and then dump them on retail investors. [Creator.Bid](http://Creator.Bid) has also implemented its own sniping protection at the smart contract level [using bid levels](https://docs.creator.bid/overview/launchpad). Empyreal also uses [uneven liquidity ranges](https://x.com/EmpyrealSDK/status/1886811971598868756). The problem extends beyond the EVM ecosystem to the entire crypto space, with well-known platforms like [pump.fun](http://pump.fun) and [Letsbonk.fun](http://Letsbonk.fun) also plagued by snipers.

# Solution Designs

As mentioned in the Snipers section, the focus of our solutions is removing one or both of the necessary conditions for snipers to participate in a token launch. We employ tactics such as forcing buyers to execute buys slowly, reducing the ability to dump quickly, and/or competing on price or commitments not to sell. We acknowledge that strategies may still exist that benefit professionals over retail buyers. However, in all examples the benefit is significantly less than the multi-million dollar advantages (see Fig. 2) currently being enjoyed by snipers.

Here we mention several such solutions. The dedicated per-solution sections that follow provide intuition for why these solutions enable retail investors to access 

1. **Partial execution of orders**: orders are executed very slowly.
2. **Selling Time-Based Bidding**: Bidders must commit to an “Earliest Time to Sell”, with orders executed in reverse chronological order based on these sell times.
3. **Trusted Third Party (TTP) as an Auctioneer/Sequencer/Executor - “Application Specific Sequencing”.** 
4. **Commit-reveal Batch auction:** Orders are committed to, revealed and then executed. 

## 1. Partial Execution of Orders

### Protocol

This protocol involves orders being executed slowly, forcing buyers and sellers of Agent tokens to lock up large amounts of capital to buy relatively small amounts at each price point.

In this protocol, every order is split into 100/100,000/100,000,000 smaller orders that get executed each round of execution. This would only give snipers advantages in the initial round(s). This advantage can be made negligible by making the execution percentages arbitrarily small.

### Satisfaction of Properties

Snipers can only execute a small amount of buys or sells before retail have a chance to start buying. Although snipers will be able to front run any buys or sells, the same execution percentages can be applied to buying and selling. ***This breaks Property 1 of the sniper requirements.***

The implication of small percentages of orders being executed each round/block is slower time to fill orders. For long term retail investors, this user-experience hit is marginal. Secondary markets can emerge after the initial pool is launched to enable faster execution. Crucially though the initial protocol pool would be protected against snipers at pool launch when price discovery is happening and liquidity is being established.

## 2. Selling Time-Based Bidding

### Protocol

In public, users submit bids with the usual price and size params, but also with an “earliest time to sell” (ETTS) param. ETTS specifies the point in time after the pool opens when the tokens bought by the buyer can be sold again. During the submission phase, users submit these bids. After the submission phase ends, the pool opens, with orders executed in reverse chronological order based on ETTS; the latest ETTS is executed first. 

### Satisfaction of Properties

Snipers do still have a speed advantage in this game, with snipers being able to submit the last bid into the pool to secure the best buy price. However, the only way to gain a preferable price vs. retail is to submit the longest ETTS. This would mean the sniper is the last person who can sell their tokens. ***This breaks Property 2 of the sniper requirements.***

## 3. Commit Reveal

### Protocol

1. Users submit commitments to bids on-chain, locking up a specific amount¡ of tokens which can be observed by everyone, and committing to a specific buy price, which is not revealed yet. 
2. After some commitment deadline, users have a set amount of time before the reveal deadline to reveal their orders, or lose access to the tokens.
3. After the reveal deadline, the auction can be settled deterministically by anyone as all orders are publicly available.
4. Several execution policies are possible, as in Solution 3, such as ordering execution by price, or executing all orders at a volume maximizing clearing price.

### Satisfaction of Properties

As snipers cannot see the prices being submitted, and orders are executed at the same time, ***Property 1 of the sniper requirements is broken.***

***Note:** Requiring users to submit two transactions to participate in Agentic Token buys may be seens as unacceptable from a user experience standpoint.*

## 4. **Trusted Third Party Auctioneer/Sequencer/Executor**

### Protocol

This protocol leverages a Trusted Third Party TTP would be in protocol, either a single entity or committee, including an MPC committee. Orders can be submitted directly to the TTP off-chain, or on-chain to ensure auditability, encrypted using the TTP’s private key for integrity. At pool launch, the TTP executes the orders according to some specified rule. Such ordering rules can include:

- Highest buy price executed first, 2nd highest 2nd, etc., until no more orders can be executed.
- [Batch executed](https://www.cramton.umd.edu/papers2010-2014/budish-cramton-shim-frequent-batch-auctions-aerpp.pdf) at a [volume maximizing clearing price](https://arxiv.org/abs/2202.06384).

### Satisfaction of Properties

As snipers cannot see the prices being submitted, and orders are executed at the same time, ***Property 1 of the sniper requirements is broken.***

**Note:** Trusted third parties can seen as unacceptable for protocols prioritizing decentralization and permissionlessness.

# Conclusion

As discussed in this article, the prevalence of sniper bots poses a significant threat to the long-term health and sustainability of all DeFi economies. Snipers leverage two key properties—speed of execution and reliance on high-liquidity tokens for quick dumping—to unfairly profit from and damage new token launches. This behavior prevents genuine price discovery, creates artificial price spikes, and ultimately leads to an exodus of investor demand and distrust in projects, increasing the chance of project failure.

While some token launchpads have implemented their own defensive sniping strategies to protect their launches, these approaches often fail to achieve key goals of price discovery, sustainable liquidity, and democratized access to tokens for retail investors.

By implementing the alternative protocol designs outlined in this article, we can significantly diminish the multi-million dollar advantages currently enjoyed by snipers. Our solutions enable a more sustainable, decentralized, and equitable tokenized economy where genuine price discovery can occur, and retail investors have an equal chance to participate from a project's inception.