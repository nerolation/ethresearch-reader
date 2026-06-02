## Introduction

This post explores fork choice attacks through the perspective of ePBS, focusing on the new fork choice boost parameters and the rationale behind their design. We'll begin by examining why these parameters are crucial, followed by a review of the existing designs. For background reading, I recommend reading [Payload Boosts in ePBS](https://ethresear.ch/t/payload-boosts-in-epbs/18769) by Potuz. Additionally, for a deeper understanding of how the LMD GHOST fork choice operates today, consider Ben Edgington’s section on fork choice in his book, [Upgrading Ethereum](https://eth2book.info/capella/part3/forkchoice/). Let’s dive in!

#### References
[Payload boosts in ePBS](https://ethresear.ch/t/payload-boosts-in-epbs/18769) - Feb/2024 By Potuz
[Sandwitch attacks on ePBS](https://ethresear.ch/t/sandwitch-attacks-on-epbs/19538/1) - May/2024 By Potuz

## Fork choice attacks today

We analyze these scenarios from both the attacker's and the victim's perspectives, focusing on two consecutive proposal slots, each with distinct proposers. Two primary types of attacks can emerge:

1. The proposer of slot $n+1$ attacks the proposer of slot $n$.
2. The proposer of slot $n$ attacks the proposer of slot $n+1$.

To clarify, by "attack," we mean an attempt to reorg the block out of the canonical chain. The motives behind such a reorg typically include:

1. Stealing the content of the block.
2. Increasing the time available to build the block, making a 24-second block more valuable than a 12-second one.

### Ex-Post attack

The first type of attack is a Ex-Post attack, where the proposer of slot $n+1$ attempts to reorg the block from slot $n$. In this scenario, the proposer of $n+1$ utilizes the [proposer boost](https://eth2book.info/capella/part3/forkchoice/phase0/#proposer-boost) to gain an advantage and potentially reorg the block from slot $n$. Currently, the proposer boost is set at 40%. This means that as long as the block at slot $n$ receives votes from more than 40% of the beacon committee, it is safe against a reorg. Typically, we define the percentage of the beacon committee that belongs to the attacker as $\delta$. An attacker can successfully reorg a block if $\delta > 1 - PB$, which is 60% under today's parameters.

![Screenshot 2024-06-26 at 12.57.24 PM](images/94qRa6yB9FmxWYQnfG0nT5DPwyV.png)

### Ex-Ante attack

The second type of attack is known as the Ex-Anteattack, where the proposer of slot $n$ attempts to reorg the block from slot $n+1$. This type of attack is inherently difficult to pull off because the proposer boost grants a 40% advantage to the block at slot $n+1$. To successfully carry out this attack, the attacker’s beacon committee must withhold their attestations and block then release them synchronously which occurs shortly after the block at slot $n+1$ is published. To reorg the block at slot $n+1$, the attacker’s beacon committee support must exceed the proposer boost. We can assert that an attacker can reorg a block if $\delta > PB$, which is 40% under today's parameter.

It is worth mentioning in Ex-Ante attack, attackers who propose multiple consecutive slots have an added advantage. For two slots, the effectiveness of the attack can be simplified to the expression $\delta / 2 > PB$, requiring only 20% of the stake per slot to reorg an honest block.

![Screenshot 2024-06-26 at 12.57.38 PM](images/tcPXOipxqyVGi1rugZQ6DsNrmt2.png)

## Fork choice attacks in ePBS

In the ePBS model, the introduction of a **builder block between two proposer blocks** complicates the landscape of potential attacks beyond what we see today. This addition expands the array of possible attack scenarios:

### Pre-ePBS Scenarios:

1. **Proposer $n+1$ attacking proposer $n$** - This scenario concerns Ex-Post reorg safety.
2. **Proposer $n$ attacking proposer $n+1$** - This scenario concerns Ex-Ante reorg safety.

### Post-ePBS Scenarios:

1. **Proposer of $n+1$ and builder of $n$ collude and attack proposer of $n$** - This scenario concerns proposer Ex-Post reorg safety.
2. **Proposer and builder of $n$ collude and attack proposer of $n+1$** - This scenario concerns proposer Ex-Ante reorg safety.
3. **Proposer of $n+1$ and $n$ collude and attack builder of $n$** - This scenario introduces builder safety, including reorg safety and withholding safety.

Before we go into the specific attack scenarios under the ePBS framework, it’s important to establish the incentives for honest builder behavior. Similar to the proposer boost, builders are also incentivized through boosts for honest actions through [payload timeliness committee](https://ethresear.ch/t/payload-timeliness-committee-ptc-an-epbs-design/16054).

- **Reveal Boost ($RB$)**: Awarded to builders who timely reveal their payloads.
- **Withheld Boost ($WB$)**: Granted if a builder, feeling unsafe about revealing the payload, opts to release a withheld message. This boost gives weight to the parent block of the committed consensus block.

These boosts also ensure both builder **reveal** and **withhold** safety. Builder reveal safety means that if the builder acted honestly and revealed a payload in a timely fashion (as attested by the PTC), then the revealed payload should be on-chain. Builder withhold safety means that if a beacon block containing a builder's header is withheld or revealed late, then that beacon block should not be the canonical head of the blockchain in the view of honest validators.

To ensure clarity and maintain focus throughout our discussion, we will designate the boosts as follows: Reveal Boost ($RB$), Withheld Boost ($WB$), and Proposer Boost ($PB$). The specific values of these boosts will be displayed towards the end of the post. Now, let's explore the first scenario: the proposer Ex-Post attack in ePBS.

### Proposer Ex-Post attack

As you may have noted, this scenario is similar to the Ex-Post attack today, except that the builder of $n$ colludes with the proposer of $n+1$. We also assume that a portion of the beacon committee is part of the malicious team, represented by $\delta$. The Ex-Post attack is successful if $WB + PB + \delta > 1 - \delta$. This indicates that Ex-Post attack resistance is weaker in ePBS due to the added power of the withheld boost from the colluding builder.

Let's examine the benefits for the attacker in a successful attack:

- The block at $n+1$ gains two slots worth of transactions by reorg out $n$, resulting in more time and more transactions, thereby increasing its block value.
- Since $n$'s payload was revealed as withheld, and both $n$'s builder and $n+1$'s proposer collude, there is no opportunity to steal $n$'s payload transaction content. They are all on the same team.
- From $n$'s proposer's perspective, the loss includes the opportunity to propose a beacon block, and from the protocol's perspective, it results in the loss of one slot worth of consensus liveness.

![Screenshot 2024-06-26 at 12.57.48 PM](images/qXnJ1gNl05bHQXJCDbl0st1Z3aF.png)

### Proposer Ex-Ante attack

Let's move on to the second scenario: the proposer Ex-Ante attack in ePBS. In this scenario, we will examine the most extreme version where the builder's Reveal Boost ($RB$) is leveraged for the Ex-Ante attack. What does this attack look like?

The proposer of slot $n$ withholds the block and the beacon committee, represented by $\delta$, withholds the attestations. The attacking builder of slot $n$ releases the payload on time to gain the $RB$. The Ex-Ante attack is successful if $RB + \delta > PB$. However, realistically, the proposer will try to split the beacon committee into portions seen ($x$) and not seen ($1-x$). This modifies the equation to $RB + x + \delta > PB + 1-x$.

Let's examine the benefits for the attacker in a successful attack:

- The block at slot $n$ reorgs out slot $n+1$. Unlike a Ex-Post attack, the builder of slot $n$ must commit and release the payload on time to gain the $RB$. Due to this commitment:
    - Even if the attack is successful, it only provides one slot of transactions without leading to more time and more transactions. The proposer of slot $n+2$ benefits here.
    - It cannot steal slot $n+1$'s transactions because the payload is pre-committed, leaving nothing to steal from the consensus block.

In other words, the Ex-Ante attack is less valuable than the Ex-Post attack if we assume the worst-case scenario for both.

![Screenshot 2024-06-26 at 12.57.58 PM](images/2f1wGpugRr37GmsAmnwR3VpEas2.png)

### Builder attacks

Finally, let's move to the last section: proposers of $n$ and $n+1$ collude to attack the builder of $n$. We will divide this section into two parts. The first part will focus on reorg out the builder's payload, and the second part will focus on making the payload part of the canonical chain even if the builder chooses to withhold it.

#### Payload reorging attack

Let's examine the first part. The proposer of slot $n$ releases the block late / attempts to split the beacon committee view, resulting in $x$ beacon committee members voting for the block and $1-x$ not voting for it. The builder reveals the payload on time and gains a $RB$. The proposer of slot $n+1$ could then reorg the payload by reorg the entire proposer block of slot $n$, which is more powerful than just reorganizing the payload itself. The attack is successful if $PB + 1 - x > RB + x$.

What does a successful attack provide to the attacker?

- Given that proposers of slots $n$ and $n+1$ are colluding, there is no extra slot advantage gained by reorg out the block at slot $n. It is essentially the same as not proposing a block at slot $n$.
- A minor advantage of the collusion between the two proposers is the ability to steal the payload transactions from slot $n$. This issue is mitigated if transactions are protected by binding them to slot $n. This scenario is known as a next-slot unbundling attack, which differs from same-slot unbundling. Same-slot unbundling is impossible in ePBS.

![Screenshot 2024-06-26 at 12.58.35 PM](images/wGlZmhivExZmbhXE31kjqHprbZ5.png)


#### Payload withholding attack

Let's look at the second part. The proposer of slot $n$ releases the block late or tries to split the beacon committee view, resulting in $x$ beacon committee members voting for the block and $1-x$ not voting for it. The builder withholds the payload on time and gains a Withheld Boost ($WB$). The proposer of slot $n+1$ could attempt to force the builder to fulfill unconditional payment by making the block at slot $n$ canonical, which from the chain's perspective, appears as if the builder did not release the payload. The attack is successful if $PB + x > WB + 1 - x$.

What does a successful attack provide to the attacker?

- The only plausible scenario for this attack is when the builder is not confident in revealing the payload and hence withholds it. In this case, the proposer of slot $n+1$, colluding with the proposer of slot $n$, wants to take the builder's payment regardless.
- Another primary advantage is that the block at slot $n+1$ can contain two slots' worth of transactions since the builder submits an empty payload by withholding.

![Screenshot 2024-06-26 at 12.58.09 PM](images/dyzAmVXHa4DOfATzFHIDC6hfmMD.png)

### Boost numbers

Finally, let's summarize the equations for each worst-case attack scenario if the attacker wins:

1. **Proposers Ex-Post attack**: $WB + PB + \delta > 1 - \delta$
2. **Proposers Ex-Ante attack**: $RB + x + \delta > PB + 1 - x$
3. **Builder reorg payload attack**: $PB + 1 - x > RB + x$
4. **Builder withhold payload attack**: $PB + x > WB + 1 - x$

Overall, we can derive that the parameters are approximately $PB = 20\%$, $WB = 40\%$, $RB = 40\%$, and $\delta = 20\%$. This means we can tolerate a malicious beacon committee up to 20%, whereas today, this tolerance is 40%.

The real question to ask is whether the worst-case scenario of a 20% attack even makes sense, as in the Ex-Ante attack, the builder must release the payload to perform the attack. Nevertheless, it certainly represents a degradation in fork choice. A 20% attack is significantly more dangerous in the Ex-Post attack than in the Ex-Ante attack due to the additional time available.

Something we haven't analyzed here is how multi-slot liveness may play a role in this context. Given (block, slot) voting and under worse network asynchrony conditions, we may experience prolonged empty slots, making recovery difficult. Solutions like a backoff scheme have been proposed, which require further thought and analysis.