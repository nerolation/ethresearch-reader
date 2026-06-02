Many thanks to [Caspar](https://twitter.com/casparschwa?s=21&t=YeRrbBitxQ2f6XFXk1HmMg), [Ansgar](https://twitter.com/adietrichs?s=21&t=YeRrbBitxQ2f6XFXk1HmMg), [Barnabé](https://twitter.com/barnabemonnot?s=21&t=YeRrbBitxQ2f6XFXk1HmMg), [Anders](https://twitter.com/weboftrees?lang=en) and [Thomas](https://twitter.com/soispoke?s=21&t=YeRrbBitxQ2f6XFXk1HmMg) for feedback and review. Review $\neq$ endorsement.

## Introduction

Ethereum issues ETH to validators for performing their consensus duties. The amount of issuance depends on the amount of ETH staked. The current issuance curve may result in a very high long-term staking ratio. This post aims to analyze whether a change in the level of issuance, as [proposed to be implemented in the next Electra upgrade](https://ethereum-magicians.org/t/electra-issuance-curve-adjustment-proposal/18825), affects the distribution of staking mediums investors use. We differentiate between three mediums of staking: 1) investors may solo-stake, 2) investors may deposit their tokens with a decentralized staking service provider (SSP), or 3) investors may deposit their tokens with a centralized SSP. Subsequently, we define the cost structures of each staking medium. Finally, we model a linear programming problem in which an investor decides what fraction of their endowment to hold or stake via which medium based on the expected monetary return and an investor’s non-monetary preference, such as convenience, trust, and decentralization. Our main result is that the distribution of stake does not depend on the level of issuance. We show how the model can be used with two examples.

This post presents a minimum non-trivial model to analyze the distribution of stake with respect to the level of issuance. We refer the reader to this [post](https://ethresear.ch/t/properties-of-issuance-level-consensus-incentives-and-variability-across-potential-reward-curves/18448) for an explanation of why a change to the issuance curve may be useful. This post does not aim to discuss the motivation for an issuance reduction, nor does it aim to be maximally precise about the cost structures of different SSPs. What this post does aim to do is to ground the conversation around staking distributions in an addressable manner.

## Model

Consider an investor who receives a large endowment, $E$. It needs to decide how to invest this wealth. It can invest in a combination of the following products: solo-staking, “decentralized” SSP, “centralized” SSP, or simply holding the endowment. 

We want to highlight the words decentralized and centralized because, in practice, the state of an SSP is not so binary. Decentralization is a spectrum, and an SSP may be more decentralized than other SSPs while still being more centralized than others. For simplicity, we assume an SSP is either decentralized or centralized.

Let $y$ be the yield from issuance and MEV that each unit of stake accrues over some finite time interval.

## Cost Structure

Staking also incurs costs. The cost structure of the different staking mechanisms is given as

- **Solo-Staking.** Solo-stakers need to acquire hardware in order to function; we model this as a fixed cost solo-stakers incur, $C^{Solo}_{F}$. Furthermore, unlike SSPs, solo-stakers forgo the liquidity of their stake as they cannot issue liquid staking tokens (LSTs). We model this as a variable cost per unit of stake, $C^{Solo}_{V}$, that resembles the *liquidity gap.* The liquidity gap is the foregone returns that a solo-staker could have gotten if it were able to issue LSTs. Therefore, the cost function of a solo-staker is given by the following: $S^{Solo} \geq 0$ is the amount of solo-staked capital deposited by the investor.

$$
C^{Solo} = C^{Solo}_{F} + C^{Solo}_{V} \cdot S^{Solo}
$$

- **Decentralized SSP.** Decentralized SSPs must create nodes at different locations to remain decentralized. We assume that a decentralized SSP creates a new node for every $K \cdot 32$ ETH staked with the SSP. Furthermore, when staking with a decentralized SSP, the investor receives liquid staking tokens as a receipt for their provided capital, meaning that there is no - or little -  loss in the liquidity of capital. Therefore, we model the cost of a decentralized SSP as a step function that incurs a variable cost for every $K \cdot 32$ ETH staked with the decentralized SSP. $X^{DSSP} > 0$ is the amount of exogenous stake deposited with the decentralized SSP, and $S^{DSSP} \geq 0$  is the amount of stake deposited by the investor.

$$
C^{DSSP} = C^{DSSP}_{V} \cdot \lfloor \frac{X^{DSSP} + S^{DSSP}}{32 \cdot K} \rfloor
$$

- **Centralized SSP.** Centralized SSPs have negligible variable costs per unit of stake. However, they have large fixed costs, such as legal fees and infrastructure costs, that come with setting up a company to run a scalable staking operation. Moreover, stake deposited with a centralized SSP can also be exchanged for an LST. Thus, we model the costs of a centralized SSP as follows. In practice, we observe $C^{CSSP}_{F} \gg C^{Solo}_{F}$.

$$
C^{CSSP} = C^{CSSP}_{F}
$$

## Returns

The return on stake is given by the yield minus the costs. We assume SSPs *socialize* the costs and do not discriminate between stakers. Then, the yield on each unit of stake is defined as follows.

$$
r^{i} = y - \frac{1}{X^{i} + S^{i}}C^{i}
$$

where $i = \{Solo, DSSP,CSSP \}$. Furthermore, we define $r^{Hold} = 0$. Let $r^{T} = \{r^{Solo},  r^{DSSP},  r^{CSSP}, r^{Hold}\}$ denote the vector of returns. 

An investor measures its utility as follows

$$
U = (r + \gamma)^{T} \cdot S
$$

where $S^{T} = \{S^{Solo}, S^{DSSP}, S^{CSSP}, S^{Hold}\}$ is the vector of stake and $\gamma^{T} = \{ \gamma^{Solo}, \gamma^{DSSP}, \gamma^{CSSP}, \gamma^{Hold}\}$ is the preference vector of the investor. It represents factors that an investor cares about that are not expressed in yield, such as decentralization, trust, technical capabilities, and convenience. In this post, we assume that preferences are fixed and do not depend on other factors, such as other stakers or the level of issuance. In the discussion, we add more nuance to this assumption; therefore, we present it here as Hypothesis 1.


 > **Hypothesis 1.** Investor’s preferences are independent of the level of yield.

## Main Results

The optimization problem of the investor is then given as

$$
\max_{S} \quad (r + \gamma)^{T}S \\
\text{subject to} \quad S \in \mathbb{R}_{+}^{4} \\
\qquad 1^{T}S = E
 
$$

This is a very simple linear programming problem. The Fundamental Theorem of Linear Programming states that if there is an optimal solution to a linear programming problem, and if the feasible region is non-empty and bounded, then there exists an optimal solution at one of the vertices of the feasible region. Therefore, solving the optimization problem is as simple as choosing the vertex that leads to the highest utility for the investor. This will lead to the investor depositing all assets in the maximum component of $(r + \gamma)$. This leads us to our first result presented in Corollary 1.

> **Corollary 1.** If an investor decides to stake, it will stake its entire endowment via one medium.

We assume that an investor deposits their entire endowment with one staking medium in the event of multiple optimal solutions 

The decision whether to stake or not depends on the level of issuance. If issuance is too low, an investor will opt to hold ETH instead of staking it. However, by using Hypothesis 1, it becomes clear that an investor's choice of a staking medium does not depend on the level of issuance. Aggregating this across investors, we obtain our main result presented in Theorem 1.

> **Theorem 1.** The level of (issuance) yield does not affect the staking mediums used by individual stakers.

Informally, Theorem 1 supports the argument that competition between staking mediums is similar at every level of issuance. Therefore, a lower level of issuance, as proposed to be implemented in Electra, does not necessarily lead to a decrease in the number of solo stakers. Further research may expand this model into a game-theoretic model that includes frictions investors may see when (un)staking. 

## Example

In this section, we consider two examples. The first example is of an investor who only cares about monetary gains and has no preferences for, e.g., decentralization or trust. It shows that this will lead to the investor depositing its assets with a centralized SSP (in the case of no rent extraction). The second example is of a solo staker. This example is constructed to show how the model allows putting a monetary amount on revealed preferences.

**Indifferent Investor**

Consider an investor who does not care about any non-monetary factors and solely wants to maximize returns. Let the preferences of this investor be given as $\gamma = 0$. We find then, by Lemma 1, that this investor deposits its entire endowment with the medium that gives the highest return. For this example, consider the price of 1 ETH to be 3000 USD and assume $y = 4\%$ per year.

Solo-staking would cost the investor 1000 USD in fixed costs, depreciated over 10 years, so say 100 USD fixed per year. Furthermore, assuming the liquidity gap is $1\%$, then the return for solo staking is roughly $2.9\%$ per year.

Suppose a decentralized SSP has variable costs of 3000 USD per node per year, and creates a new node for every $1,000,000$ ETH deposited ($K = 31,250$). Assume there is 10 million ETH staked through this SSP. The reward for staking through the decentralized SSP is then around $3.7\%$.

Finally, the centralized SSP has fixed costs of 10 million USD per year and it has 5 million ETH staked with it. The reward for staking with the centralized SSP is then around $3.9\%$.

Therefore, the indifferent investor will choose to stake with the centralized SSP.

**Solo Staker**

Consider an investor who is a solo-staker. Furthermore, assume that $r^{T} = \{r^{Solo}, r^{DSSP}, r^{CSSP}, r^{Hold}\} = \{2\%,  3\%,  4\%, 0\}$, then we know that $r^{Solo} +\gamma^{Solo} \geq r^{CSSP} + \gamma^{CSSP}  \implies \gamma^{Solo} \geq 2\%$. Therefore, if this solo-staker has staked $32$ ETH,  its preference for solo-staking is worth at least $0.64$ ETH per year in monetary terms.

## Conclusion & Discussion

In conclusion, this model presents an investor’s optimization problem as a linear programming problem of the monetary and non-monetary returns that an investor will gain from depositing stake via a certain staking medium. Corollary 1 shows that an investor who stakes deposits their entire stake through one staking medium. Our main result is presented in Theorem 1. Since preferences do not depend on the level of yield, we find that the level of (issuance) yield does not affect the distribution of staking mediums used by investors. Although the model is very simple and does not consider frictions, this Theorem could be used to argue that a change in issuance, as proposed in Electra, will not change the distribution of staking mediums used.

The model presented in this post is meant as a minimum non-trivial model to analyze the distribution of stake with respect to the level of issuance. Clearly, this model is very simplified and makes idealized assumptions about the cost structure of different staking mediums. The intention is not to be maximally precise but to capture the core characteristics that differentiate staking types. This post aims to ground the conversation around staking distributions in an addressable manner. Further, this model's assumptions can be adjusted accordingly, and the reader is invited to do so.

Finally, some other questions that might be considered are:

- How important are other investors' investment decisions for an individual investor? For example, an investor's preference for a staking medium may depend on the number of other investors who stake through it. Liquid staking tokens that are owned by more people could provide more use cases.
- As issuance reduces, which investors will unstake first? Potentially liquid stakers will unstake earlier as the SSP fees reduce future expected profits, whereas solo stakers’ costs can largely be considered sunk costs, thus not reducing future expected profits. In [this podcast](https://podcasts.apple.com/us/podcast/ethereum-devs-debate-account-abstraction-eips-for-electra/id1728091874?i=1000648049543), Christine Kim and nixo.eth discuss that liquid staking protocols will likely see investors unstake their capital quickly as frictions are low. Solo stakers may not unstake as quickly as frictions are higher.
- Some of the investors’ preferences can potentially be endogenized into an extended model. How do preferences develop over time? Is there a potential survivorship bias in the preferences?