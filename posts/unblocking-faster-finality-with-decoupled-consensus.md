
*Thanks to the EF Consensus team for discussion and comments*

In the current consensus protocol, **the timelines of block production and finality are coupled**. A large committee (consisting of 1/32 of the whole validator set) attests in every slot, in the critical path. Shrinking the size of this committee, for example to 1/64 of the validator set, would enable faster slots, but it would slow down finality, because completing a full voting round (one epoch) would now accrue the overhead of 64 slots instead of 32. At one extreme of this tradeoff space, only a single validator votes in every slot, and a full voting round is only completed once every 1M slots or so, which would take more than a day even with 100ms slots. Even for less extreme committee sizes (and resulting epoch lengths), the overhead from doing "finality via slot-by-slot accumulation" cannot be discounted.

On the other hand, increasing the size of the committee would make finality faster, at the cost of slower block production (longer slots). At this other extreme of the tradeoff space, the whole validator set votes in every slot, and slot time largely depends on how fast we can aggregate it.

![](images/wQwGVxJbfZjxHuTzoAEmQwWzOVx.png)
![](images/cZomxWB4F60qXbCe7lImts1iAkX.png)

Proposed consensus upgrades, like variants of SSF and 3SF [1](#ref1), [2](#ref2), [3](#ref3), do not fundamentally change anything about this tradeoff. They simply accept it and position themselves at one end of it, where the full validator set votes in every slot. To do so, the assumption is that the validator set would be shrunk (through consolidation) to a point where this is feasible, and does not pose too harsh constraints on the slot time.

An alternative path is to **decouple block production and finality**:
- the block production pipeline can rely on a small randomly sampled committee, for example of size 512 (even more so if with a [secret election](#available-committee-selection-vrf)).
- the finality pipeline happens in parallel, outside of the critical path of block production

The tradeoff can be eliminated entirely, and both pipelines can be independently optimized.

![](images/jYP6osQAgcJLZWuHLxMu6VUqrUH.png)


There have been explorations in this direction [4](#ref4), but until recently one piece of the puzzle was missing: no known vote-based (= not longest chain) available chain protocol (the top part of the decoupled picture) has good enough properties when run by a rapidly changing committee. In particular, such available protocols [5](#ref5), [6](#ref6) do not degrade gracefully in the face of temporary asynchrony, and techniques to increase their asynchrony resilience [7](#ref7), [8](#ref8) fail when the active participants are rapidly changing. This is in large part why previous efforts like SSF and 3SF have taken the approach of having the whole validator set vote at once.

In this post, we discuss an approach to resolve this issue, first constructing an available protocol that is both friendly to committees, optimally secure under synchrony (tolerating a 1/2 adversary for both safety and liveness, under synchrony) and asynchrony resilient. We then use this protocol as one of the two building blocks of an ebb-and-flow protocol [9](#ref9), alongside a finality gadget.

## Goldfish

Goldfish [5](#ref5) is a small modification of LMD-GHOST, adding two key features: **vote expiry** and **view-merge** [5](#ref5), [11](#ref11). Vote expiry makes the protocol essentially memoryless: at slot t, only votes from slot t-1 are considered in the fork-choice. This makes Goldfish very simple while achieving optimal security—it tolerates up to 1/2 adversarial stake under synchrony in the sleepy model [6](#ref6) (dynamic participation, i.e., validators can go offline and come back).

The slot structure is simple:
1. (time $0$) - The proposer  runs the fork-choice with all votes from the previous slot that it has seen, and proposes a block to extend the head of the chain. The block contains all votes from the previous slot seen by the proposer
2. (time $\Delta$) - A committee votes on the head of the canonical chain, determined by running the fork-choice with the votes from the previous slot, in particular those obtained by *merging* their *local frozen view* (see below) with the *proposer view* (what's in the block)
3. (time $2\Delta$) - Everyone "freezes their view" of the attestations they have seen, i.e. record which attestations have been seen by this time
![](images/biCSzYJI6oMvvbaS4gojQHH1IBs.png)


The goal of the freezing and merging is to achieve the following property:

> Under synchrony, a block from an honest proposer is voted by all honest committee members

This is because any vote seen by an honest committee member *by the freeze deadline* will be also be seen by the proposer of the next slot, and therefore contained in its block. The merged set of votes will then be the same used by the proposer to run its fork-choice, so all committee members will agree with the proposer on the head of the chain.


![](images/1DBcfPlRxiNK9CPAD2PH3HqoAPZ.png)



Given this, the security argument ([10](#ref10), [5](#ref5)) is straightforward:
1. When an honest proposer produces a block in slot t, all honest committee members, constituting a majority of the committee, see it and vote for it (**view-merge** property above)
2. In the next slot t+1, the only votes that count are those from the committee of slot t (this is **vote expiry**), a majority of which supports the honest block. Therefore, the block is canonical and some descendant of it is voted by all honest validators. By induction, it stays canonical in all future slots.

Below is an example of an ex-ante reorg attempt, which fails precisely due to this combination of view-merge + vote expiry. The votes accumulated by the adversary in the slots they previously controlled are expired, and the honest votes from the latest slot are all for the honest block (due to view-merge) and are a majority of all fork-choice weight.

![](images/cWF9cugo0oGs7pVPMYu5bYMRaR3.png)




Note that vote-expiry is necessary in the second part of the argument, *if we want to support rapidly changing committees*. Consider instead LMD-GHOST, where the latest vote of a validator always counts, regardless of how old. With committees, votes then accumulate over time, and an adversary can accumulate votes across many slots and use them to reorg the chain later (ex-ante reorgs [12](#ref12)). Using only the votes from the previous slot eliminates this problem entirely, as if we had the whole validator set vote in every slot (which is instead how the problem is resolved in [8](#ref8) and related ebb-and-flow protocols [1](#ref1), [2](#ref2), [3](#ref3)).

However, this same memorylessness makes Goldfish vulnerable to temporary asynchrony: if the network experiences delays and honest votes arrive late, the fork-choice becomes devoid of honest contributions, and the adversary can rewrite history at will. Concretely, it can put its own voting weight on whichever fork it wants, and have nodes reorg to that.

The next figure is an example of this. There's a long, stable chain (the top one), until at slot t+1 something prevents honest votes (which would have been for the top chain) from being sent or received (the crossed out green votes, perhaps missing because of a network problem), at which point the adversary is free to concentrate its votes on a different branch (the red block), causing a long reorg, because these are the only votes that count (the grey votes from previous slots are expired). 

![](images/bSQ6k2SQLvfYsm4qJQ4bKrkjdyH.png)





## Stabilization gadget

It is natural to question why we even care about the asynchrony resilience of Goldfish, or of any available chain mechanism, if the whole point is that it's meant to be used in conjunction with a finality gadget, something that's explicitly there to provide asynchronous safety. The reason is that we want the protocol to not be brittle whenever participation is not sufficient to finalize. In other words, there's little point in having an available protocol that can theoretically make progress when participation is very low, if that progress can be completely swept away by even a small period of asynchrony.

While finality gadgets are not the answer due to their high participation requirements, we can take inspiration from them in our attempt to solve this issue. In particular, we can employ what we might call a *stabilization gadget*, a way to augment an available protocol to make it resilient to temporary asynchrony, though not fully asynchronously safe (as this would necessarily only work under high participation).

This might seem a bit circular, because such a stabilization gadget would essentially itself be an asynchrony resilient available protocol, which is what we're trying to create in the first place. However, the difficulty is only that we want our available protocol to support committees. Without this requirement, we already know how to solve this problem, for example with RLMD-GHOST [8](#ref8), Majorum [2](#ref2), or other available protocols (without committees) augmented with the techniques of [7](#ref7). We can use such protocols as stabilization gadgets, acting with a delay determined by the length of a voting round from the full validator set, just like with the finality gadget. This way, the only part of the chain that's vulnerable to asynchrony is the very tip, perhaps up to a few slots.

### Hybrid fork-choice

Concretely, we can utilize a stabilization gadget just like a finality gadget, by having it determine a starting point for the fork-choice of the underlying available protocol. For example, using Majorum (similar to RLMD-GHOST, but requiring a child subtree to be supported by a majority of the unexpired weight in order to continue) and Goldfish, the combined fork-choice looks like this:

1. **Majorum prefix**: Find the highest block whose subtree has a majority of all weight from unexpired latest messages
2. **Goldfish suffix**: from there, run GHOST with the votes from the previous slot

![](images/dJrqX5E5YDyR7rQgZr1wOJHnYpT.png)


There are two caveats:
1. As for an ebb-and-flow protocol, we have to be careful with the interaction between the available protocol and the gadget. A safe interaction pattern is to only input a block to the gadget (send a purple vote) if it has been *confirmed* by the underlying available protocol, as this should mean that the gadget does not interfere with the available protocol under network synchrony, as it can only output blocks that are already safe.
2. Unlike a finality gadget, a stabilization gadget might output something even if it does not have majority support. For example, LMD-GHOST is an eager fork-choice, that always continues until a leaf, regardless of whether the children it encounters have much support. This nullifies the benefits of having honest voters only input confirmed blocks to the stabilization gadget, because a block can be output by it even without any honest votes supporting it, and thus without any confirmation guarantees. This is why the previous example uses Majorum, as it will only output blocks that are supported by a majority of the relevant weight, i.e. unexpired latest messages, which by assumption implies at least some honest support.

Note that we did not previously discuss confirmation rules for Goldfish. For a discussion of this, including how to augment Goldfish to have a *fast* confirmation rule, check the [appendix](#Confirmation-rule).

## Finality gadget

We also want a proper finality gadget, giving asynchronous and economic safety. From a fork-choice perspective, this looks like turning the two-step fork-choice into a three-step fork-choice, adding the familiar step of starting from a latest justified checkpoint (something along these lines when using finality gadgets other than Casper FFG):

1. **FFG (Justified chain)**: Find latest justified checkpoint
2. **Majorum (stable chain)**: from there, find the highest block whose subtree has a majority of all weight from unexpired latest messages
3. **Goldfish (available chain)**: from there, run GHOST with the votes from the previous slot

However, it does not mean that we are now running three separate protocols. In practice, we just need to run the available protocol and then a single gadget on top of it, which bundles finality and stabilization in a single voting round. In this figure, the green votes are used both for FFG and for Majorum.

![](images/8y0qU4LcllwFbwPUu3qg08jD3Vp.png)

Even if the votes for the stabilization and finality gadget are bundled, the two are active in different conditions. The next figure shows precisely the situation in which the stabilization gadget helps us: we have not been able to justify anything in a while, perhaps because < 2/3 of the stake is online, but the online stake is still able to stabilize all but the very tip of the chain, preventing an attempted long-range reorg during a temporary period of asynchrony.

![](images/d545eSu63QNECek8GPV6Gm24t4j.png)

## Appendix

Let's dive a bit deeper into the available chain component, Goldfish.

### Confirmation rule

#### k-deep confirmation

Without any any modifications, Goldfish supports a simple k-deep confirmation rule, i.e., we confirm the *k-deep prefix of the canonical chain*, obtained by chopping off the latest k-1 blocks. This is safe as long as we pick a k such that we have high probability of having an honest proposer in every k blocks (assuming honest majority).

![](images/hhw4ZwFZ9u7rVMowJnQktUrLFTV.png)

#### Fast confirmation

The problem with the k-deep confirmation rule is of course its very high latency. Ideally, we'd want to be able to confirm a block after a single voting round (from a committee). We can do this, with a small modification to the slot structure of Goldfish, in particular adding one more `Δ`, and a confirmation phase at `2Δ`, between the voting phase and the freeze phase. The confirmation rule is simple: you confirm a block if the votes you see by time `2Δ` are at least `3/4` of the committee's size (or `3/4 + epsilon` of the *target* size if the committee size if the committee is not of fixed size. See [Goldfish committee selection (VRF)](#Goldfish-committee-selection-VRF)). 

![](images/7I7IbZ2V9WtRTYy5v7v7FytFbHZ.png)

Let's look at how exactly this works. Consider an attester that confirms a block `B`, by seeing votes for it from `3/4` of the committee at time `2Δ`. These votes then reach all other validators by time `3Δ`, and so they are present in every honest validator's "frozen view". Any block conflicting with `B` can at most be supported from the remaining `1/4` of the votes, *plus any equivocations*. However, equivocations are discarded and do not count when computing the fork-choice. Therefore, the support of `B` when running the fork-choice to vote in the next slot, at time `Δ`, is going to be at least `3/4 - equivocations`, while the support of any conflicting block at most `1/4`. In order for `B` not part of the canonical chain, at least `1/2` of the committee has to have sent an equivocating vote, which cannot be the case under the assumption of honest majority.

![](images/z0fKjEIh0VRfxgZuUpFpUrxYirz.png)

### View-merge

Let's make precise how view-merge works, which is also a chance to specify how to deal with equivocations:
- A node only ever keeps track of votes from the most recent voting round, *and only of the first two votes received for a validator*. Below, the first seen vote for `validator_id` is recorded in`votes[validator_id]`, while an eventual equivocation (second seen) in `equivocations[validator_id]`.
- After the freeze deadline, only the proposer keeps updating its vote records, while everyone else only does so with votes contained in a block.
- Finally, equivocators will be ignored (given zero weight) when running the fork-choice
```python
def on_vote(self, vote: Vote, from_block: bool):
	# Only process votes for the current slot
	if vote.slot != self.current_slot():
		return

	# Ignore votes from known equivocators
	if vote.validator_id in self.equivocations:
		return

	# Non-proposers ignore votes after the view-merge
	# deadline unless they are from a block.
	time_in_slot = (self.network.time % SLOT_DURATION)
	freeze_deadline = SLOT_DURATION * 2 // 3
	if time_in_slot > freeze_deadline:
		if not from_block and not self.is_proposer():
			return

	# Record the vote if it is the first-seen
	if vote.validator_id not in self.votes:
		self.votes[vote.validator_id] = vote
		return

	# If one has been seen, check for equivocation
	if self.equivocations[vote.validator_id] != vote:
		self.equivocations[vote.validator_id] = vote

```

#### Goldfish committee selection (VRF)

The smaller the committee we employ, the more it is important that we maximize the security we get out of the selection method. In particular, we can:
- Select the committee members with probability proportional to stake, and then count their votes rather than weighting them by stake. This is [what we already do for the sync committees and (soon) for the PTC](https://github.com/ethereum/consensus-specs/blob/8a0110a819b87dbd8183542dde9e103e1e716f91/specs/gloas/beacon-chain.md#new-compute_balance_weighted_selection), and it is necessary to have high security with a small committee and variable balances (consider a committee of 512 validators where the first 504 have 32 ETH and the remaining 8 have 2048 ETH. The latter control > 1/2 of the committee by themselves)
- Select the committee members secretly, through a VRF that only they can compute. This is what we do for the [aggregator selection](https://github.com/ethereum/consensus-specs/blob/8a0110a819b87dbd8183542dde9e103e1e716f91/specs/phase0/validator.md#aggregation-selection), though without the proportionality to stake. This way, the committee members are only known when they have already acted, which protects against an adaptive adversary (bribing, targeted DoS...)

We can combine these two as follows:

```python
def get_committee_seats_per_validator(slot_signature: bytes,
                                      balance: Gwei,
                                      total_balance: Gwei,
                                      TARGET_COMMITTEE_SIZE: uint64) -> int:

    balance_per_committee_seat = max(1, total_balance // TARGET_COMMITTEE_SIZE)
    seats = balance // balance_per_committee_seat
    random_value = bytes_to_uint64(hash(slot_signature)[:8]) % balance_per_committee_seat
    remainder_balance = balance % balance_per_committee_seat
    seats += 1 if random_value < remainder_balance else 0
    return seats

```

A validator with stake `balance` receives `balance // balance_per_committee_seat` *deterministic seats* in the committee, and then is randomly allocated one extra seat with probability `(balance % balance_per_committee_seat) / balance_per_committee_seat`, i.e. with probability proportional to its remaining balance after the deterministic allocation.

For example, say `TARGET_COMMITTEE_SIZE = 512` and `total_balance = 2**25 ETH`, so that `balance_per_committee_seat = 2**16` A validator with `balance = 2**16 + 2**15 ETH` will be allocated 1 deterministic seat, and then another seat with probability `1/2`. A validator with balance `1024 ETH` will be allocated one seat with probability `1/64`.

---

## References

<a id="ref1"></a>1. [A Simple Single Slot Finality Protocol For Ethereum](https://arxiv.org/abs/2302.12745)
<a id="ref2"></a>2. [Majorum: Ebb-and-Flow Consensus with Dynamic Quorums](https://arxiv.org/abs/2601.03862)
<a id="ref3"></a>3. [3-Slot-Finality Protocol for Ethereum](https://arxiv.org/abs/2411.00558)
<a id="ref4"></a>4. [LMD GHOST with ~256 validators and a fast-following finality gadget](https://ethresear.ch/t/lmd-ghost-with-256-validators-and-a-fast-following-finality-gadget/22856)
<a id="ref5"></a>5. [Goldfish: No More Attacks on Ethereum?!](https://arxiv.org/abs/2209.03255)
<a id="ref6"></a>6. [Towards Practical Sleepy BFT](https://eprint.iacr.org/2022/1448)
<a id="ref7"></a>7. [Asynchrony-Resilient Sleepy Total-Order Broadcast Protocols](https://arxiv.org/abs/2309.05347)
<a id="ref8"></a>8. [RLMD-GHOST: Balancing Dynamic Availability With Asynchrony Resilience](https://arxiv.org/abs/2302.11326)
<a id="ref9"></a>9. [Ebb-and-Flow Protocols: A Resolution of the Availability-Finality Dilemma](https://arxiv.org/abs/2009.04987)
<a id="ref10"></a>10. [Reorg resilience and security in post-SSF LMD-GHOST](https://ethresear.ch/t/reorg-resilience-and-security-in-post-ssf-lmd-ghost/14164)
<a id="ref11"></a>11. [View-merge as a replacement for proposer boost](https://ethresear.ch/t/view-merge-as-a-replacement-for-proposer-boost/13739)
<a id="ref12"></a>12. [Three Attacks on Proof-of-Stake Ethereum](https://arxiv.org/abs/2110.10086)