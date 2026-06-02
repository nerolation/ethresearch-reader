# Slot Restructuring: Design Considerations and Trade-Offs

> Many thanks to [Francesco](https://x.com/fradamt), [Mark](https://x.com/EthDreamer), [Max](https://x.com/0xKuDeTa), [Julian](https://x.com/_julianma), [Caspar](https://x.com/casparschwa/status/1454511838650150917), [Terence](https://x.com/terencechain), [Vitalik](https://x.com/VitalikButerin), [Ansgar](https://x.com/adietrichs), [Dankrad](https://x.com/dankrad), [Anders](https://x.com/weboftrees) and [Barnabé](https://x.com/barnabemonnot) for feedback and discussions on this topic!

![e5c10283-1f9d-4b73-90c2-29969b15b2bcll|399x399](images/i9aPtXF1QJaXJt04Ti3vQMR8Us.png)


**TL;DR**

* **Pick [EIP‑7886](https://eips.ethereum.org/EIPS/eip-7886) for Glamsterdam:** its EL-side version gives \~80 % of ePBS’s slot‑pipelining throughput without ePBS’s extra moving parts.
* **Keep it simple:** no beacon‑/payload split, no PTC committee and **zero fork‑choice changes**.
* **Big wins, low risk:** we still unlock major L1 scaling headroom and leave today’s MEV‑Boost flow untouched.
* **Future‑proof:** if we ever need the last 20 % of pipelining (or trustless payments), we can cleanly layer full ePBS on top later.


# ePBS: Design Trade-Offs

The recent discussions around [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732) (Enshrined Payload-Block Separation, or ePBS) as the potential headline feature for the Glamsterdam fork raise important questions about Ethereum's future slot structure. 
While the proposal offers some nice benefits, especially for slot pipelining, I believe there's a better alternative: a stripped-down variant of ePBS that gets similar benefits for less complexity. I also want to make the case for a proposed timeline that includes doing delayed execution first - it's less complex and still gives us what we want.

**Let’s first acknowledge what ePBS would give us:**

### 1. Pipelining

* With ePBS, the small beacon block propagates quickly, allowing attesters to begin attesting early in the slot. Meanwhile, the EL payload and the blobs get more time to propagate (and execute) independently. To maximize slot pipelining, ePBS uses a new committee, the PTC, to determine payload + blobs availability.

### 2. Payload-Block Separation

* By decoupling the EL payload from the consensus-layer beacon block, the CL can continue progressing blocks even if the EL only produces invalid payloads. Instead of just looking at a beacon block as a single node, there're now two nodes, a beacon block *with* vs *without* a payload. This separation introduces changes to fork choice, but most agree they are manageable from an engineering standpoint.
* It also removes aggregations from the critical path. Because the attestation deadline can stay the same (or even move slightly earlier), there’s more time for attestation aggregation.

### 3. Trustless MEV-Boost Payments

* ePBS enables unconditional payment, meaning proposers can use MEV-Boost and receive payment trustlessly, unlike today, where the relay holds custody over the payout.

**All 3 features can be shipped separately. ePBS, as it stands today, is just the design supporting them all.**

> The [delayed execution (EIP-7886) designs](https://ethresear.ch/t/delayed-execution-and-free-da/22265#p-54147-h-1-optimistic-attesting-3) achieve almost comparable forms of pipelining while not requiring to separate the beacon block from the EL payload or unconditional payment mechanisms. 

---

## Trustless Payments Come at a Cost

The benefits of unconditional payment are not free. Achieving trustless payments between proposers and builders introduces additional complexity.

* **Proposers** must whitelist builders and pull bids from them. The fallback scenario - local building - stays.
* **Builders**, if proposers want to use the trustless payment option, builders can watch for beacon block equivocations and sufficient attestations to the beacon block with the commitment to their EL payload. Once they see enough attestations confirming the beacon block that commits to their payload, they can safely release the payload without risking unbundling. Today, relays help with propagation and usually first distribute blocks around the globe using trusted p2p connections to then release the payload from multiple locations at the same time. This has been proven sufficient for unbundling protection such that **this new mechanism might not be needed.**

At best, the trustless payment approach puts builders into the same position as today when using MEV-Boost:
* For using the trustless payment option builders *can* wait until they see sufficient attestations for the beacon block before releasing the payload to not risk being unbundled. "*Sufficient*" as defined by the builders themselves. 
* Waiting for attestations means builders have less time available for propagation + execution. 

> Under ePBS - using the unconditional payment mechanism - the beacon block is propagated and attested to in the first seconds of the slot. As soon as the builder sees *sufficient* attestations, it can release the payload, starting the actual payload propagation time.
When not using this "unconditional payment" logic (=*using mevboost instead)*, the proposer/builder gains valuable time for propagation at the beginning of the slot by propagating the EL payload early.

Proposers will want their builders to provide the best possible execution (*profit maximizing*). One can argue that being guaranteed an unconditional, protocol-enforced payment is a nice feature, however, it's a trade-off. It comes with complexity through things like staked builders, CL payments from builder's stake to the proposers fee recipient via withdrawals, conditional unconditional payment logic around 40% attestations vs. 60% and/or epoch transition, etc.

> At the point where everyone ignores the unconditional payment mechanism (*=set it to 0*) and instead goes through MEV-Boost, it might not be worth the complexity it comes with (staked builders, payments on the CL, unconditional payment release at 60% attestations at epoch boundary, etc). In practice, local building remains the true fallback, and MEV-Boost is the default builder selection flow. So designing fallback logic for trustless payment is likely unnecessary.


### Would Builders Waste Valuable Time?

*Although unconditional payment is appealing, the trade-offs might not be worth it.*

Rather than broadcasting the beacon block and EL payload together, ePBS recommends an observation window during which builders must wait for enough attestations before revealing their payload. In the end, it's up to the builder to decide when it's safe enough to release the payload.

Today, relays protect builders from being unbundled by only releasing the EL payload after it's too late for proposers to tamper with it. Trying to remove the relay while preserving that protection leads to actual benefits. Builders, instead of relays, would need to subscribe to subnets and count attestations to the beacon block with the commitment to their EL payload. As they see a *sufficient number* of attestations they can release the payload, avoiding being unbundled.

![timeaxis (2)](images/tQhKAsSSs7K0iSaDeJ3EVVSxdTJ.png)

So, combined with the block-payload separation, this mechanism provides builders a better way to protect themselves against unbundlings. However, this is an answer for a question that was never asked. Builders seem to be fine with today's unbundling protections and it might simply not be worth losing time in return for some additional unbundling safety, in an environment where every ms matters. 


---

## PTC Trade-Offs: ePBS, Preconfirmations, and Builder Information Monopolies

Preconfirmations depend on **post-state knowledge**: without knowing the state, builders can't guarantee inclusion of future transactions (=*preconfs*). The builder of the previous block naturally has this post-state first. Today, this advantage is small - bidding and payload release happen nearly simultaneously.

But ePBS changes this dynamic. Seconds may now pass between **bid selection** (when one builder knows the post-state) and **payload reveal** (when *all* builders know it). Builders can delay payload reveals to maintain a monopoly on post-state knowledge and extract more preconf revenue. It's fair to assume that revenue from preconfirmations grows roughly linearly through the slot.

Here’s the fundamental trade-off:

* For **pipelining**, the protocol wants the PTC as *late* in the slot as possible. Since it only has 512 members and doesn't need aggregation, this is feasible.
* For **minimizing the post-state monopoly**, the protocol wants the PTC as *early* as possible to limit builders' ability to exploit delayed payload reveals.

**These goals are directly at odds.**

![timeaxis (3)](images/y5AHXMDkAK4HDLurDPnF3kkkh24.png)


The sweet spot where to put the PTC is non-trivial to figure out and if we end up moving the PTC forward in time-in-slot, we lose some of the pipelining benefits at the same time. 

> Another reason why builders may want to delay the payload reveal is that this gives them an option to cancel their payload for execution. The builder would still need to pay the unconditional payment but, e.g. if prices move against the builder, they still have the option to 'step back'.


Of course, this assumes proposers would actually use the trustless-payment mechanism ePBS comes with. For proposers, the economic rational choice is using MEV-Boost, same as it works today. Relays would probably still exist, provide builder unbundling safety - as they do today - while payloads can be propagated earlier than the "*sufficient-attestations-seen*" deadline.

**The picture would then look like the following:**
![timeaxis (5)](images/r3ivsoPEpM6Ol9YnQsNwjfhvwE9.png)

---

# Getting rid of PTCs: Unbundling ePBS

We can address ePBS's shortcomings while preserving its benefits with a slightly different approach:

1. **At slot start**, the proposer publishes the beacon block and EL payload as separate objects (=we'd keep the block-payload separation). The beacon block commits to the payload.
2. The **MEV-Boost pipeline remains unchanged**, with relays still preventing unbundling.
3. **Attestation deadline moves to second 8** in the slot.
4. Introduce a **beacon-observation deadline at second 3**:
   - Attesters check whether a valid beacon block has been seen.
5. At **second 8**, attesters only vote for the beacon block if:
   - It was seen at second 3 **and**
   - The EL payload was available (not necessarily valid) by then.

This setup gives the **next proposer** enough data to make a safe fork-choice decision:
| Beacon Block Status      | Payload Status         | Action                                      |
|--------------------------|------------------------|---------------------------------------------|
| Missing or Invalid       | —                      | Build on parent                             |
| Valid                    | Missing                | Build on parent                             |
| Valid                    | Valid                  | Build on that beacon block                  |
| Valid                    | Invalid                | Build on the beacon block with invalid payload   |

In this ePBS variant, **attesters become the availability oracle**, not the PTC. 

![timeaxis (4)](images/tau7PZtPVo3uFX30tq0bjVsoame.png)


This design doesn't get aggregation out of the critical path, however, we get full ~7-9s of propagation a time. This is roughly equivalent to what ePBS with trustless builder payments would achieve.

## So what about EIP-7886: Delayed Execution?

> [EIP-7886](https://eips.ethereum.org/EIPS/eip-7886) is less complex than EIP-7732 and achieves almost the same slot pipelining. By reverting the state in case of invalid payloads, EIP-7886 comes without tricky fork-choice changes.

**Under EIP-7886 can’t move the attestation deadline as early as the PTC could be placed under ePBS since we still require aggregation. In return we reduce complexity while still being able to go full-pipelining (PTC) at a later time:**
![timeaxis (7)](images/bbVmTN1Tz55kWOKoZQC2MzcXkyv.png)



**Even though we might get an additional second for having a PTC, I'd argue it is not worth the complexity. Even though the PTC gives us more time for propagation, the time available for propagation+execution stays the same with the designs.**


![timeaxis (9)](images/fbViLYDYaiZKk0bOzSimrVW9oKI.png)

---

# Minimize Complexity, Maximize Future-Compatibility: A Pragmatic Path Forward

My pragmatic recommendations for core devs is to look at the nice features of ePBS independently and revisit why we are here: 

**For scaling the L1 (more time for execution and full slot for proving) Ethereum needs some form of slot pipelining.**

**Delayed execution, EIP-7886, is the shortest and the least complex path to get there.**

The *beacon block - payload separation* of ePBS sounds nice but introduces additional complexity (3-choice fork-choice, payload availability bit for votes, etc.). The same applies to unconditional payment mechanisms, which introduce unnecessary complexity and are unlikely to see wide adoption (stakes builders, payments through withdrawals, builder safety wastes time, etc.).

**So, we're left with the goal to scale the L1 and agree that pipelining is the right approach here.**

Then the question is, do we need the max. pipelining from ePBS or is the 80% pipelining of delayed execution enough in the mid-term. Delayed execution is less complex than ePBS (the CL variant is essentially a subset of ePBS - just without PTC, uncond. payment and block separation, and the EL variant is simpler than the CL one). ePBS goes all-in, aiming for maximum pipelining regardless of the added complexity.

**As a first step, in glamsterdam, Ethereum should ship delayed execution in its simplest form.** 
**This would get us to the following picture:**
![timeaxis (10)](images/fJciOMFJlrhVPlQOjH8VrxAFIAZ.png)
> Introducing a beacon observation deadline to prevent builders from using extra time for timing games would be a relatively simple change.

**If further pipelining is needed, we can still introduce the PTC** to squeeze out another 1–2 seconds for propagation (not for execution) from the slot and move the attestation deadline earlier in the slot.

If there's interest, **we could also decouple the beacon block from the payload and implement the unconditional payment mechanism** at the same time—**though neither of these changes necessarily contributes to scaling.**

> It's even possible (and makes sense) to introduce the PTC without separating the block and payload. In that case, attesters would optimistically attest to the beacon block’s validity and the payload header's availability early in the slot, while the PTC would later signal payload availability.

**The path to full ePBS can be taken in smaller, sequential steps, derisking it.** We get 80% of the scaling benefits through less invasive changes that do not need block-payload separation or unconditional payments. Rolling out such a major change as ePBS (essentially 3 features in one) - in an unbundled way - when only one of the features is actually needed, would be unnecessary and overly complex.

Rather than going all-in on a high-complexity design, we should first deploy the simplest slot restructuring change that materially improves L1 scalability. Delayed execution is that change.


----


# Appendix
## How would EIP-7886 and EIP-7732 compare at 6s slots?

Both proposals, delayed execution and ePBS are compatible with shorter slot times.

For delayed execution the slot would look like the following:

![timeaxis (17)](images/o4p5Bzmn2M6oNcwXqFJ7bro24eM.png)

* full slot as of payload reveal for execution
* propagation time ends with attestation deadline
* no block-payload separation -> no fork choice changes.
* aggregation time remains in the critical path
* no post-state monopolies

For ePBS, the slot would look like the following:

![timeaxis (18)](images/2EPRbNT1AXYFBSoSDUNWCDiAcSk.png)

* full slot as of payload reveal for execution 
* propagation time ends with PTC deadline
* more pipelining but additional committee
* aggregation time outside critical path
* 75% of the slot could be captured through post-state monopolies.
    * Builders see the beacon block with the commitment to their payload and then delay the payload reveal until very close to the PTC deadline. Between the beacon block propagation and the actual payload release, builders can leverage this information monopoly which can last up to 4.5s (assuming a beacon block release at 0.5s).

There is no delay between commitment and payload reveal under delayed execution because the beacon block and the payload aren't separated. Everything would stay as it is today: the winning builder has the post-state first and all other builders usually see the block way before the attestation deadline and can then get to the post-state too.

This post-state monopoly situation would look like the following:
![timeaxis (20)](images/ftJYtkQYsI81nenl6iiJKgpOGTj.png)

> Builders that wait right before the PTC deadline might choose to use smaller EL payloads, only focusing on keeping the actually valuable transactions in the block. This is done to ensure the EL payload is small and propagates fast.

**Builders exploiting the late PTC availability check can establish a 75-83% monopoly over the state throughout the slot.**