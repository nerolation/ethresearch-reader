# The risks of LRTs

### or The Commonalities Between Staking, Restaking, and Sovereign Bonds

![upload_47f72cbe1306af6381dff44b3d862f90|503x499](images/l7EFnlpPZBUutSR4whiRkIc5HUo.jpeg)
<sub>***^actual photo of money flowing into LRTs right now***</sub>
$\cdot$
*by Mike Neuder and Tarun Chitra – Monday, February 26, 2024.*
$\cdot$
***Acks***
*Many thanks to Carson Brown and Walter Li for their comments.*
$\cdot$
**tl;dr;** 
*The [TVL](https://defillama.com/protocols/Liquid%20Restaking) of liquid restaking tokens (LRTs) grew from \$250mm to over \$4 billion in the past two months. This massive influx of capital precedes the launch of restaked services, representing speculation on the potential future yield generated from active restaking and the financial incentives for early use of LRT protocols. To contextualize LRTs, we present an ["asset-backed"](https://www.investopedia.com/terms/a/asset-backedsecurity.asp) case study, exploring six different yield-bearing instruments along five attributes; row-by-row, we construct two tables, partitioning the six assets into two broad categories of three assets each. We highlight the similarities and differences between the assets, aiming to be expositional rather than opinionated. The intent of the article is two-fold:*
***(i) Improve LRT comprehension through juxtaposition with more familiar assets.***
***(ii) Highlight that LRTs are risky. There is no free lunch; risk accompanies the additional rewards for holding LRTs.***
$\cdot$
***Organization*** 
*Section 0 lays out the preliminaries, introducing the asset types and the attributes. Sections 1-5 each cover a specific attribute, characterizing the relationship to each asset. Section 6 concludes with overall themes and high-level takeaways.*
$\cdot$
| Acronym | Definition | 
|---|---|
| LST | *liquid staking token* |
| LRT | *liquid <u>re</u>staking token* |
| L1 | *layer 1* |
| AVS | *actively validated service* |
| TVL | *total value locked* |

$\cdot$
**Related work**
| Article | Description| 
|---|---|
|[*Making the Risk in Restaking Less Scary*](https://www.gauntlet.xyz/resources/making-the-risk-in-restaking-less-scary) | Tarun talk |
|[*Semantics of Staking 1: Liquefaction*](https://mirror.xyz/barnabe.eth/v7W2CsSVYW6I_9bbHFDqvqShQ6gTX3weAtwkaVAzAL4) | Barnabé post #1 |
|[*Semantics of Staking 2: Re-staking*](https://mirror.xyz/barnabe.eth/96MD_A194uXLLjcOWePW3O2N3P-JG-SHtNxU0b40o50) | Barnabé post #2 |
|[*Semantics of Staking 3: Advanced Constructions*](https://mirror.xyz/barnabe.eth/62E79gUSqiwS9NEbbfdwTdy7G9Hh098fcV38vWv8VQo) | Barnabé post #3 |
|[*The risks of LSD*](https://notes.ethereum.org/@djrtwo/risks-of-lsd) | Danny post (titular inspo) |

$\cdot$

## Section 0: Preliminaries

When people hear of staking, there are often two modes of thought:
1. a method of securing a decentralized network, or
2. a yield opportunity by agreeing to capital lockups and potential loss conditions.

While these two views are closely intertwined, there have been fewer discussions about how to think about (2) when one considers the world of restaking and liquid restaking —  this post aims to bridge this gap.
 
Staking allows token holders to earn interest on their capital by contributing to the security of a blockchain. In exchange for locking their capital and performing their duties (including validating blocks, proposing blocks, or generating proofs), stakers are compensated with new tokens. In this way, staking is a perpetual duration bond. The staker *lends* their economic value to the protocol in exchange for *interest* and the ability to regain their *principal* upon stopping their participation. In addition to locking up their capital, stakers are also responsible for honoring the protocol; they forfeit their *principal* if they commit an attributable slashing violation [0]. Stakers may run validators but commonly delegate to a third-party node operator. This delegation also fits nicely into the bond analogy. The delegated staker *lends* their tokens to a node operator, who pays the *interest* and keeps the additional profit.

### Restaking
Restaking extends this paradigm to allow token owners to use their capital to provide economic security to multiple protocols. In the [parlance of Eigenlayer](https://docs.eigenlayer.xyz/eigenlayer/overview), each of these protocols is termed an *Actively Validated Service* (abbr. AVS). By doing so, capital earns additional rewards exceeding the underlying staking yield while also being subject to additional slashing conditions. As with regular staking, capital owners may choose to run their services, but delegation is the likely outcome for most tokens in the system; the delegated restaker *lends* their tokens to a node operator, who participates in protocols to earn further rewards paid as *interest*. Restaking offers a clean generalization to staking but adds complexity and layering to the protocol mechanisms. Additionally, restaking may grow to present a risk to the underlying core protocol by subsuming a significant portion of the stake. Vitalik voiced this concern early, penning [*"Don't overload Ethereum's consensus."*](https://vitalik.eth.limo/general/2023/05/21/dont_overload.html)

### Liquid Staking and Restaking

[Liquid staking tokens](https://defillama.com/lsd) (LSTs) represent an extension to delegated staking by issuing tokens to represent the staker share of the capital in the pool. These tokens represent a fraction of the capital and node-operator generated fees, allowing usage of the assets within DeFi by providing delegators liquidity (at a cost). Liquid staking tokens first became popularized as a way to realize liquidity or take leverage on locked beacon chain positions that were \*not withdrawable* before the Merge.

In much the same way, [liquid restaking tokens](https://defillama.com/protocols/Liquid%20Restaking) (LRTs) are garnering significant attention. While LSTs represent a basket of L1 stake positions, a basket of restaked positions underwrites LRTs. LRTs, analogous to the growth of LSTs before the Merge, present a way to provide liquidity and/or leverage to users who are restaking within Eigenlayer before the launch of AVSs such as EigenDA. While this distinction seems innocuous, it contains many subtleties that make LRTs a meaningfully differentiated asset class. We outline a brief timeline of events over the past four years to contextualize the extreme growth of LRTs in the past two months. 

### Historical context
The figure below provides a recent timeline of milestones within traditional, staking, and restaking markets. These events illustrate similarities in asset adoption, highlighting temporally correlated risks between these markets.

![diagram-20240226|690x251](images/ucuPxFuljuMIzbQnIhDNYIIsLqy.png)


- ***Macroeconomic events** (bottom row, purple)*. The past four years represent extreme macroeconomic conditions. Starting with the US's [zero interest rate policy (ZIRP)](https://en.wikipedia.org/wiki/Zero_interest-rate_policy) beginning almost exactly four years ago at the beginning of 2020 as the COVID-19 pandemic swept the globe, we saw significant consumer price inflation beginning in 2022. The resulting interest rate hikes put significant pressure on the banking sector, resulting in dramatic bank failures during 2023. With inflation declining gradually and the pause of interest rate hikes, the macroeconomic condition (at least temporarily) appears to have stabilized.
- ***Staking events** (middle row, green)*. The past four years contain the full lifecycle of Ethereum staking. With the beacon chain launch at the end of 2020, staked `ETH` began accumulating in the consensus layer. Lido, which launched along with the beacon chain, quickly accumulated \$1 billion in TVL. By mid-2022, Lido had amassed a 30\% share of Ethereum stake. Around the same time, the failures of large cryptocurrency trading institutions in May 2022 led to `stETH`'s first crisis when its price relative to ETH [deviated significantly](https://www.nansen.ai/research/on-chain-forensics-demystifying-steth-depeg) from par (1 `stETH`/`ETH`). The ensuing liquidation of several large leveraged positions involving `stETH` on markets such as Aave rocked the markets. Presently, the $27 billion of TVL in Lido continues to represent over 30\% of staked `ETH`.
- ***Restaking events** (top row, red)*. The history of restaking is much shorter than the other two categories. With EigenLayer launching in June of 2023, the stake capping of the protocol resulted in the $1 billion TVL milestone occurring by the end of 2023. Since then, the TVL in both EigenLayer and LRTs has grown by an order of magnitude in the first two months of 2024; the landscape is evolving at an unprecedented pace.

### Case Study: Asset-backed instruments
We present an asset-backed case study to help illustrate the relationships between these instruments, dividing them into two tables and incorporating the concepts above alongside the traditional finance counterparts.
1. ***Non-fungible yielding assets:***
    - *Sovereign bonds*
    - *L1 staking positions*
    - *AVS restaking positions*
2. ***Fungible baskets of non-fungible yielding assets:***
    - *Bond funds*
    - *LSTs*
    - *LRTs*

For each of the six assets, we walk one-by-one through five attributes:
1. *Liquidity / Leverage*
2. *Yield*
3. *Duration*
4. *Default*
5. *Portfolio construction*

The following sections follow the above numbering, with each attribute defined at the beginning of each section.
    
### Brief Aside: Notes on Traditional Instruments 
We note the similarities and differences between traditional financial instruments (sovereign bonds and bond funds). One can view a sovereign bond as non-fungible because a sovereign sells each bond to an entity (an individual, a corporation, or another sovereign). If the buyer 'holds to maturity' (e.g., akin to Silicon Valley Bank, discussed in Section 4), their position is only salable in a peer-to-peer transaction. In the staking context, this is equivalent to an L1 staker selling their private keys to another individual – the same 'level' of non-fungibility as a bond. We note that there also exist explicit sovereign bonds that do not allow for resale whatsoever (US savings bonds that are explicitly [non-transferrable](https://www.bankrate.com/banking/savings/savings-bonds-guide/)).

Individuals owning [money market funds](https://www.ici.org/research/stats/mmf) and capital in savings accounts constitute a significant portion of sovereign bonds. One can think of this as analogous to delegating funds to a fund operator or commercial bank in exchange for interest payments less a fee (much like the role of node operators for an LST). These funds tend to hold many bond positions of different maturities, á la a LST with many different L1 positions held through a set of node operators. As we discuss below, the rules for creating or redeeming shares in such funds can vary (see [here](https://investor.vanguard.com/investor-resources-education/mutual-funds/what-are-money-market-funds) for example). We consider any such fund a *bond fund*, as it shares features with LST positions [1].


> ***Editorial note*** — The following is a Gedanken or thought experiment and a (hopefully) valuable framework for understanding the different properties of LRTs in the context of assets that the reader is more familiar with. This list is not exhaustive, nor is each analogy perfect; we merely found it helpful as a lens to reason about the ever-more complex staking landscape. We note that, for instance, different LRTs have different withdrawal or redemption conditions and/or AVS allocation strategies, which can meaningfully change the risk inherent to holding these assets.

## Section 1: Liquidity & Leverage
We begin our journey with the *Liquidity & Leverage* category, the simplest when comparing these assets. We clump these two concepts together because they dovetail nicely; more liquid assets are more straightforward to borrow against and thus create better leverage opportunities. To be more precise, we define these terms explicitly (these are just the definitions as we use them – we do not aim to be authoritative):

> **Liquidity**: The liquidity of an asset is a measure of the transaction cost (in percentage terms) that it takes to divest `X`  units in exchange for a numéraire. The more liquid an asset, the lower the transaction cost to divest a range of sizes of `X`.

> **Leverage**: Leverage refers to the ability to borrow against an asset to reinvest. Whether through direct lending (such as collateralized on-chain lending) or synthetic forms (such as perpetual futures), a levered user increases the risk of loss of their initial investment if they violate the default conditions of the loan (e.g., due to a loss in value of collateral or margin). On the other hand, the user increases their payoff with leverage if the asset price appreciates substantially.

--
![upload_0dcdfa035aceb6fb7393a85f9072900a|690x257](images/vlLCTfxtJCvTJd4Yo8PyYNVNcMe.png)

--
**Table 1 assets**
- **Sovereign bonds** – As described above, sovereign bonds are non-fungible if held to maturity and thus are not very liquid. A US treasury bond, for example, has a specific maturity and interest rate associated with it; each *specific* bond is not trivial to borrow against.
- **L1 staking positions** – L1 staking positions are not fungible and thus not very liquid. A cryptographic key (or set of keys) controls the validator stake and authenticates their messages to the protocol; each specific staking position is not trivial to borrow against.
- **AVS restaking positions** – AVS restaking positions are not fungible and thus not very liquid. A cryptographic key (or set of keys) controls the EigenPod (or similar) that designates the AVSs the stake is accountable for.

**Table 2 assets**
- **Bond funds** – Bond funds are highly liquid. This liquidity and fungibility compared to individual bonds makes them good candidates for borrowing against. Much of the multi-trillion dollar [overnight repurchase agreement market](https://www.newyorkfed.org/markets/domestic-market-operations/monetary-policy-implementation/repo-reverse-repo-agreements) builds upon leverage in pooled vehicles containing bonds.
- **LSTs** – LSTs are fungible L1 staking positions. The market regards large LSTs as lower risk (maintaining their peg to the underlying asset through successful, non-slashable node operation), making LSTs good candidates for crypto lending.
- **LRTs** – LRTs aim to be fungible AVS restaked positions. LRTs maintain their peg to the underlying asset through successful restaked node operation. LRTs may be future candidates for crypto-lending; due to their infancy, LRTs are yet to establish sustainable liquidity (either on-chain or off-chain).

--
**Key points:**
1. The Table 1 assets represent individual, illiquid assets that map to the fungible, liquid counterparts in Table 2. 
2. The Table 1 assets have lower liquidity and are less viable as collateral than the higher liquidity Table 2 assets.


## Section 2: Yield
The second attribute we consider is yield. 

> **Yield:** Interest earned on an investment.

For the non-fungible assets (Table 1), we analyze both the *source*, the generator of the interest, and the *denomination*, the unit-of-account of the interest. For the fungible assets (Table 2), we also examine the *aggregation*, how the yields of many individual instruments are combined.

--
![upload_9401f6c48943e6d125ab2ed847429f94|690x271](images/qL5uQjAh5HKzrZXXZVPYrOTOQdH.png)

--
**Table 1 assets**
- **Sovereign bonds** – Sovereign bonds have specific interest rates depending on market conditions. The sovereign currency denominates this interest.
- **L1 staking positions** – L1 staking positions earn a protocol-prescribed interest rate by participating in the consensus mechanism. The L1 token denominates this interest.
- **AVS restaking positions** – AVS restaking positions earn an AVS-defined interest rate by participating in the restaking protocol. The L1 token or *another token* may denominate this interest.

**Table 2 assets**
- **Bond funds** – Bond funds derive yield from aggregating across many individual bonds. 
- **LSTs** – LSTs derive yield from aggregating across many different L1 node operators.
- **LRTs** – LRTs derive aggregated yield from many AVSs *and* node operators. Note that many different tokens may denominate the yield.

--
**Key points:**
1. The Table 2 assets accrue yield from the same sources as the corresponding Table 1 assets. 
2. The Table 2 assets each aggregate yield across many different sources, which is the source of the fungibility.
3. LRTs differ from LSTs in that they aggregate across AVSs and node operators. The interest rate and yield denomination underlying LRTs are AVS-dependent.


## Section 3: Duration

The third attribute we consider is duration. 

> **Duration:** The amount of time an investment lasts. We also define it as how long it takes to withdraw the underlying principal without selling the asset on the open market.

--
![upload_cbbc8afb2ee8eb6536713c02b89623d7|690x296](images/lvidkOt1PVhz84gkVVbwf6Cvgr0.png)


--
**Table 1 assets**
- **Sovereign bonds** – Sovereign bonds have a fixed maturity date.
- **L1 staking positions** – L1 staking positions are subject to the withdrawal rate specified by the L1 protocol. For Ethereum, see the [Exit Queue](https://www.validatorqueue.com/) for example.
- **AVS restaking positions** – AVS restaking position withdrawals are subject to the rate-limiting of the AVS itself, the L1 protocol, *and* the restaking protocol.

**Table 2 assets**
- **Bond funds** – Bond funds contain portfolios of bonds of many different maturities, but buying and selling the bond fund itself is instantaneous. Generally, there is a creation-redemption mechanism, akin to the one used for [ETFs](https://www.etftrends.com/financial-literacy-channel/primary-market-primer-how-bond-etf-units-created-redeemed/), which an arbitrageur uses to buy a basket of bonds that meet some standards (e.g., a 5-yield bond fund by allowing for arbitrageurs to tender bonds between 4 and 6 years) to create/mint a single share of the bond fund. We note that these conditions can vary based on the portfolio tendered (e.g., if you tender a portfolio of only 4-year maturity bonds, you only create 80% of the shares you would get if you tendered a portfolio of 5-year maturity bonds). 
- **LSTs** – Similar to bond funds, LSTs represent assets whose prices are arbitraged via a creation-redemption process. LSTs have a creation process where users provide 1 unit of `ETH` and receive a fixed number of units of an LST (usually one if it is reward-bearing – see [this article](https://www.swellnetwork.io/post/reward-bearing-vs-rebasing-tokens) for the distinction between reward-bearing and rebasing LSTs). The redemption process has multiple durations: 
    1. *Instant* – LSTs may sell with a slight discount (the cost of time) on the open market because of their fungibility.
    2. *Delayed* – LSTs are redeemable for the underlying token. These redemptions are rate-limited by the LST, which may keep a pool of redeemable assets for instant access, and by the underlying protocol.
- **LRTs** – LRTs also have a creation process where a user tenders a unit of `ETH` to mint a fixed number of the LRT token. Again, the redemption process has different durations (similar to LSTs). 
    1. *Instant* – LRTs may sell with a slight discount on the market because of their fungibility.
    2. *Delayed* – LRTs are redeemable for the underlying token. These redemptions are rate-limited by the LRT, which may keep a pool of redeemable assets for instant redemptions, by the per-AVS rate limits (which may be variable), and by the underlying protocols (both the restaking protocol and the L1). 

Note that "native restaked `ETH`" (where the restaker also controls the L1 staking position) and "liquid restaked `ETH`" (where the restaker uses an LST) may have different rate limits from the restaking protocol itself too. In the case of EigenLayer, all unstaking incurs a [7-day escrow period](https://docs.eigenlayer.xyz/eigenlayer/restaking-guides/restaking-user-guide/liquid-restaking/withdraw-from-eigenlayer) in addition to the AVS and Ethereum rate limits. For liquid restaked `ETH`, the withdrawal may be from the restaking position alone and *not* from the L1 protocol. Long story short, durations for these instruments are critically detail-dependent. 

--
**Key points:**
1. The Table 2 assets each have an instant (which has a market-defined cost) or long-durations (defined by the underlying asset); the Table 1 assets each have a single, longer-term duration.
2. LSTs and LRTs may keep liquidity on hand for in-protocol, instant redemptions, but once that pool is empty, withdrawals are rate-limited by the underlying protocols. There is a tradeoff between yield and duration; more tokens in the instant redemption pool means fewer tokens earning interest in the underlying protocol.
3. LRTs differ from LSTs because the withdrawals depend on the AVS details and the restaking protocol in addition to the L1 protocol.

## Section 4: Default 

The fourth attribute we consider is default conditions. 

> **Default:** The event when the principal investment is not returned to the lender upon request. TradeFi and DeFi have different default procedures, so we informally use the term to refer to a situation where the instrument liabilities exceed the underlying assets.

--
![upload_23d4b8bc066435357be0d5c431d0db26|689x276](images/nFq4TRkpfkXJSu04N3i5XR65dXr.png)

--
**Table 1 assets**
- **Sovereign bonds** – Sovereign bonds are not defaultable because the sovereign controls the money supply and thus can repay arbitrarily. However, we note that sovereign bonds denominated in a currency that the issuer \~does not\~ control _can_ default, such as [the Argentine defaults on dollar-denominated bonds](https://en.wikipedia.org/wiki/Argentine_debt_restructuring).
- **L1 staking positions** – L1 staking positions are accountable to the protocol-defined slashing conditions. Depending on the severity, some of the principal capital is destroyed.
- **AVS restaking positions** – AVS restaking positions are accountable to both the AVS and L1 slashing conditions. Depending on the severity, some of the principal is destroyed.

**Table 2 assets**
- **Bond funds** – Unlike cryptoeconomic systems, where slashing events and default are directly attributable, bond funds often have indirect default conditions. One example of a bond fund default is the [collapse of Silicon Valley Bank](https://en.wikipedia.org/wiki/Collapse_of_Silicon_Valley_Bank) in March 2023. One can view the SVB balance sheet as a bond fund — users deposit cash at the bank to earn yield while the bank uses their deposits to buy bonds of different maturities, giving some of the yields from those bonds to depositors. SVB bought portfolios of long-dated (e.g., 15/30-year maturities) hold-to-maturity bonds in 2020 and 2021 with exceedingly low interest rates. However, when the US Federal Reserve increased interest rates sharply in 2022, SVB had to pay higher yields to stay competitive with the prevailing market rate. Forced to borrow against their portfolio, itself losing value quickly because it had low yield components, to pay these yields, SVB eventually became insolvent. This is an example of a duration mismatch default event for a bond fund. We note that this type of default impacts many asset-backed securities (including LSTs, as demonstrated in [this paper](https://arxiv.org/abs/2006.11156)). Finally, redemptions that are not processed, potentially due to the lending market being unable to deliver correctly (such as the [September 2019 Repurchase Agreement market failure](https://www.federalreserve.gov/econres/notes/feds-notes/what-happened-in-money-markets-in-september-2019-20200227.html)) can also lead to default. 
- **LSTs** – One/some of the constituent node operators getting slashed could cause a default on the LST conditioned on the slashing size. The LST could trade heavily discounted if there is a "rush for the exit" scenario. The LST protocol may have a "freeze withdrawals" mechanism (e.g., the Lido [bunker mode](https://research.lido.fi/t/withdrawals-for-lido-on-ethereum-bunker-mode-design-and-implementation/3890)). 
- **LRTs** – One/some of the constituent node operators getting slashed <u>on the AVS</u> or <u>on the L1</u> could cause a default on the LRT depending on the size of the slashing. The LRT could trade heavily discounted if there is a "rush for the exit" scenario. LRT withdrawal designs are still evolving.

--
**Key points:**
1. The Table 1 assets have a single counterparty capable of causing a default; Table 2 assets have the default risk spread among many more counterparties.
2. LSTs and LRTs depend on various node operators to not get slashed. A slashing event in either case could cause a "race for the exit" as all the principal tokens exit from the AVS and L1 protocol.


## Section 5: Portfolio construction

The fifth and final attribute we consider is portfolio construction. 

> **Portfolio construction:** The selection process for the assets that underpin a basketized product.

Note that the non-fungible (Table 1) assets do not require portfolio construction; this attribute only applies to the construction of the fungible basket assets (Table 2).

--

![upload_9f9b65ccef864f0ea65974807cdb0381|690x242](images/sq0H62EclaqG7M5xoUXgkLPojJL.png)

--
**Table 1 assets**
- **Sovereign bonds, L1 staking positions, AVS restaking positions** – No portfolio construction.

**Table 2 assets**
- **Bond funds** – Bond funds (including money market funds) describe selection criteria for creating a share in the fund. These creation criteria include (but are not limited to):
    - Time to maturity (e.g., will only hold bonds that mature within 1 to 5 years)
    - Quality of bond (e.g., AAA rated by a rating agency)
    - Quality of yield (e.g., bounds on the volatility of interest payments, such as avoiding private credit and variable payments)
The creation-redemption process for these funds effectively serves as a means to maintain a particular portfolio that meets the selection criteria or constraints of the fund. A fund manager picks a portfolio and a set of constraints. If the fund manager, such as SVB, picks a poor set of portfolio constraints (e.g., a long-dated hold-to-maturity portfolio), the fund may default.
- **LSTs** – The two main design axes are the node operator selection and the node operator bond. Using Lido and Rocketpool to highlight the difference in design:
    - *Lido* – [Permissioned node operator set](https://www.rated.network/o/Lido?network=mainnet&timeWindow=1d&viewBy=operator&page=1&idType=pool) curated by the Lido DAO. Node operators post no collateral.
    - *Rocketpool* – [Permissionless node operator set](https://rocketscan.io/nodes). Node operators post `8 ETH + 2.4 ETH (denominated in RPL)` of collateral to match with `24 ETH` of external capital.
- **LRTs** – Constructing an LRT portfolio requires managing multiple AVSs, node operators & their mapping to AVSs, different yield rates/variabilities/denominations, and various risk profiles. <u>This complexity likely far exceeds the design space of LST constructions.</u> 

--

**Key points:**
1. The Table 2 assets require portfolio construction, incurring risk and complexity by pursuing liquidity and fungibility.
2. LSTs have a relatively small design surface for constructing who the node operators are and how they are collateralized.
3. LRTs have significantly more design decisions over AVS management to ensure the fungibility of the token.


## Section 6: Pulling it together

Combining each row we iterated above, let's construct our complete asset + attribute table! 

![upload_4ec421de37c3268c40543a9b9b2fc83d|587x500](images/3up9SprqQkozCoi9i5Gh8UdHtDR.png)

While the tabular text maximally captures the essence of this article, it is helpful to distill some of the themes. To that end, we present two additional diagrams encapsulating the \~attributable essence\~ of each section. The first diagram draws the link between the non-fungible and fungible assets.

![upload_197d86e7088bbd762e73f31fcc71c90b|605x500](images/lgaoZHhZzCKMeY8Qk7U4GaZDhDd.png)

Moving left to right, we highlight the five aforementioned attributes (e.g., *"going from L1 staking positions to LSTs liquifies and enables leverage on the asset"*). Each number maps to the corresponding section above. 

In addition to comparing the two tables, we also consider the following progressions within the non-fungible and fungible classes: 
- **Non fungible:** *Sovereign Bonds -> L1 staking positions -> AVS positions*, and 
- **Fungible:** *Bond funds -> LSTs -> LRTs*.

The figure below captures the theme of each attribute when using this "top-down" view.

![upload_4615bcbcc26dc01a370489ea8f4f2a82|596x500](images/sgWuqhV0shyNM3Z4Fwt3L7kjQNU.png)


Again, each number maps to the corresponding section above. The (5) box only applies to the right "fungible" set of assets, and thus is connected only to the right side.

### So what? 

Phew ... that was ... a lot. Thanks for sticking with us. The exasperated reader may wonder, "So what?"; this reaction is justified :D. Reiterating the two-fold goals of this article:
1. *Presenting a framework for thinking about LRTs by comparing them to more familiar assets.*
2. *Highlight that LRTs are risky; there is no free lunch, and increased risk accompanies additional rewards for holding LRTs.*

"That's it...? It took you 4500 words to say that?". Well dear reader, yes, ["that's it, that's all."](https://www.youtube.com/watch?v=SvUbfsbHPGw)

*— made with ♥ by mike and tarun.*



**Footnotes**:
[0] This is slightly different than a bond where the counterparty is the source of a default, which closer resembles the delegated staking setting
[1] We note that the centralized nature of bond funds means that the creation-redemption, trade execution, and custody semantics are different from those of LSTs and likely impact the precise financial performance of these assets differently than LSTs. In this note, we ignore these differences for the sake of simplicity.

<!-- 

it was a blast to team up with @tarunchitra on "The risks of LRTs"!

we present an "asset-backed" case study of yield-bearing instruments to frame the discussion around LRTs – hopefully, the juxtaposition is as helpful to you as it was to us!
💧🥞⚠️
↯↯↯
https://ethresear.ch/t/concurrent-block-proposers-in-ethereum/18777
 
-->