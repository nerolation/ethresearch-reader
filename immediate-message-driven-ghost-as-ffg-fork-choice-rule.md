_Edit 2018.08.16: I am from now on going to use "immediate message driven GHOST" to refer to what I previously referred to as "recursive proximity to justification" or "RPJ"._

There are two desirable goals for fork choice rules that the current proposed fork choice rules [[1]](https://ethresear.ch/t/attestation-committee-based-full-pos-chains/2259) [[2]](https://ethresear.ch/t/attestation-committee-based-full-pos-chains-version-2/2427) fail to satisfy:

1. **Bad proposer resistance**: if there is a medium-length run of bad proposers (possible because of RNG manipulation), then this could lead to damaging the chain's guarantees with relatively small coalitions (eg. censorship attacks with much less than 50% participating)
2. **Stability**: the fork choice should be a good prediction of the future fork choice

As an example of (1), consider the following case:

[yuml]
[G] -> [A1]
[G] -> [B1{bg:red}]
[B1{bg:red}] -> [B2{bg:red}]
[B2{bg:red}] -> [B3{bg:red}]
[B3{bg:red}] -> [......{bg:red}]
[/yuml]

Suppose the red chain consists of only malicious proposers and attesters, and is published after the fact. In the grey "chain" (really not a chain at all), the proposers are malicious, but the attesters are honest. Suppose the fraction of malicious attesters is, say, 1/4. The attacker publishes A1, waits, and then after some time reveals the chain with B1......

In this model, the attacker's chain clearly wins in the longest chain rule. The solution to these kinds of attacks is a GHOST scoring rule (see [[2]](https://ethresear.ch/t/attestation-committee-based-full-pos-chains-version-2/2427)), which would keep increasing the weight of A1 as more honest validators attest to it, ensuring that it continues to overtake the attacker's chain.

However, GHOST has one weakness in the context of FFG, which is lack of stability. For example, consider this case, where each box represents a checkpoint and the number inside of it is the percentage of validators voting for that checkpoint.

[yuml]
[G] -> [55{bg:green}]
[55{bg:green}] -> [56{bg:green}]
[G] -> [15{bg:yellow}]
[15{bg:yellow}] -> [16{bg:yellow}]
[16{bg:yellow}] -> [65{bg:yellow}]
[/yuml]

A GHOST implementation that tries to naively replicate GHOST in PoW would add up all votes in the subtree, and the green subtree would get 111 votes relative to 96 on the yellow subtree, so the green subtree would win, even though the yellow tree is clearly much closer to getting a justified checkpoint.

One could try to change this by instead only looking at most recent votes. But this would break in a different case:

[yuml]
[G] -> [65{bg:green}]
[G] -> [15{bg:yellow}]
[65{bg:green}] -> [20{bg:green}]
[15{bg:yellow}] -> [51{bg:yellow}]
[/yuml]

Here, yellow would win, even though the green subtree is clearly only 2% attestations away from being justified. This is dangerous because an attacker with 2% of stake could wait for such a scenario to arise (realistically, trigger it by forcing high network latency), then wait until the opportune moment to release their attestations, suddenly flipping over the chain.

Our fork choice rule will start from the first version of GHOST above, but make one modification: instead of _adding_ the votes for the checkpoints in a subtree, we take the _maximum_. The philosophy here is that if a block is justified, that implicitly justifies its ancestors as well, so the distance of a block to being justified is really the minimum of the distances of any of its descendants, and so the _proximity_ to being justified is the _maximum_.

Hence, in the first example, yellow is preferred over green because max(15, 16, 65) > max(55, 56), and in the second example, green is preferred over yellow because max(65, 20) > max(15, 51).

(As a historical note, I'll add that this exact algorithm was considered for hybrid Casper FFG, but was ultimately rejected because there was no proof that some chain closer to justification had a longer PoW chain, and epoch numbers were tied to PoW lengths, but in the latest protocol epoch numbers are tied to slots, ie. timestamps, which resolves this issue).

Within an epoch, the GHOST rule can be used to find the preferred head to improve safety against bad proposers, though from the point of view of stability it does not theoretically matter as much which fork choice rule is used inside an epoch.

It is worth noting that there _is_ one weakness of this fork choice rule:

[yuml]
[G] -> [60{bg:green}]
[G] -> [40{bg:yellow}]
[60{bg:green}] -> [5{bg:green}]
[40{bg:yellow}] -> [51{bg:yellow}]
[/yuml]

Here, even though the green chain is "closer" to justification according to the fork choice rule (60 > 51), it is "further away" in practice because getting it justified would require 7% equivocation, whereas the yellow chain could be justified with no equivocation. However, this kind of scenario could only arise in a fairly extreme circumstance with either a majority attacker or very high network latency.