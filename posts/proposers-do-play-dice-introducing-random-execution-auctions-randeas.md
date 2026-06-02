![Screenshot 2024-10-09 at 10.25.42|498x500](images/3PoGh6OTqakNKNxJlnBI3N38Wlg.jpeg)

*by [Thomas Thiery](https://x.com/soispoke)* - November 6th, 2024

*Thanks to [Julian](https://x.com/_julianma), [Barnabé](https://x.com/barnabemonnot), [Anders](https://x.com/weboftrees) and [Jonah Burian ](https://x.com/_JonahB_) for discussions, feedback and comments on this post.*

## Introduction

[Execution Auctions](https://mirror.xyz/barnabe.eth/QJ6W0mmyOwjec-2zuH6lZb0iEI2aYFB9gE-LHWIMzjQ) (EAs) have been proposed as a candidate implementation of [Attester-Proposer Separation](https://youtu.be/MtvbGuBbNqI?si=YXgH0JkF8EZCMvPg) (APS). EAs aim to prevent the negative externalities of Maximal Extractable Value (MEV) by further [separating the roles of attesting/validating](https://collective.flashbots.net/t/isolating-attesters-from-mev/3837) and block execution proposing. Specifically, EAs address two key issues: the incentive to engage in beacon proposer timing games and the variance in execution proposer payoffs.

By auctioning the right to propose execution payloads well in advance (e.g., 32 slots ahead), EAs potentially mitigate timing games by removing the immediate incentive to delay block proposals. Additionally, by burning the value of the winning bid, EAs could reduce the variance in proposer payoffs and help [improve both micro and macro consensus stability](https://ethresear.ch/t/mev-burn-a-simple-design/15590). In essence, EAs involve the protocol running an auction to sell future execution proposing rights, with attesters monitoring bids to ensure the highest bid is selected and the proceeds are [burned](https://ethresear.ch/t/mev-burn-a-simple-design/15590).

The simplicity of EAs and some of their [economic properties](https://ethresear.ch/t/execution-auctions-as-an-alternative-to-execution-tickets/19894) make them a potential candidate for implementation in Ethereum. By running auctions to allocate proposing rights, EAs (1) effectively separate block execution proposing from attesting/validating, (2) enforce a new competition for every slot, and (3) aim to resolve the “value-in-flight problem” by removing reliance on time-sensitive block value fluctuations (e.g., from CEX-DEX arbitrages).

However, concerns have been raised regarding the centralizing forces inherent in Execution Auctions (EAs) and other Attester-Proposer Separation (APS) designs. These concerns specifically include:

- Moving from relying on ex post to ex ante MEV valuations for winning execution proposing rights can influence which actors are able to secure these rights (see papers from [Burian, Crapis, Saleh](https://arxiv.org/abs/2408.11255) and [Pai and Resnick](https://arxiv.org/abs/2408.03116)).
- Allowing proposers to know in advance if they have won proposing rights for multiple consecutive slots may lead to the emergence of toxic [multi-block MEV](https://ethresear.ch/t/does-multi-block-mev-exist-analysis-of-2-years-of-mev-data/20345) (MMEV), where a single actor can exert excessive control over multiple blocks in succession.

Importantly, randEAs solely focus on proposing a candidate design to mitigate problems related to MMEV. One potential solution to mitigate MMEV is to introduce a second auction—conducted by the execution proposer (i.e., the winner of the initial auction)—just in time (e.g., during slot `n+32`). In this second auction, the right to insert the first set of transactions—the Top-of-Block—would be sold to a party potentially different from the winner of the first auction (see [Barnabé’s thread](https://x.com/barnabemonnot/status/1808444733305258047) and [Mike’s post](https://ethresear.ch/t/mechan-stein-alt-franken-ism/20321)). Introducing this additional auction during the slot eliminates the certainty of controlling the full content of multiple blocks in a row ahead of time, thus mitigating MMEV. Additionally, inclusion list (IL) designs like [FOCIL](https://ethresear.ch/t/fork-choice-enforced-inclusion-lists-focil-a-simple-committee-based-inclusion-list-proposal/19870), which require the execution proposer to include transactions from multiple parties (e.g., IL committee members) in the block, could further alleviate some concerns related to MMEV by adding constraints to the execution proposer.

In this post, we propose an alternative way to address MMEV concerns without the need for an additional auction. In randEAs, similar to [execution tickets](https://arxiv.org/abs/2408.11255) (ETs), winning the initial auction guarantees execution proposing rights within a specific slot window (e.g., from slot `n+16` to `n+32`), but the exact slot for which the proposing rights are won is only **assigned and revealed one slot in advance**. However, unlike ETs, the mechanism to assign execution proposing rights is an auction. This simple approach allows participants to secure future execution proposing rights if they win the auction without knowing exactly if or when they would control multiple consecutive slots.

## Design

We begin with a high-level overview of the randEAs design (see **Figure 1**), intentionally omitting some implementation details for simplicity.

![Sept 23 Screenshot from Notion|689x500](images/s9WxN2dI1xuUxvaqidamT7lGobR.png)

1. **Auctioning Execution Proposing Rights**: During slot `n`, the beacon proposer conducts an auction for execution proposing rights within a future slot window (e.g., slots `n+16` to `n+32`). Participants submit bids to acquire the right to propose an execution payload in one of these future slots. Attesters of slot `n` monitor these bids and ensure that the beacon proposer commits to the highest bid (e.g., `0.2 ETH`) and the execution proposing right winner’s associated public key (e.g., execution proposer `0xA12`). They will only attest to the beacon block if the committed bid matches the highest bid they have seen, using a [MEV burn](https://ethresear.ch/t/mev-burn-a-simple-design/15590) like mechanism.

2. **Revealing the Exact Execution Slot**: The exact slot assignment is revealed by the beacon proposer right before the execution slot occurs. For example, during beacon slot `n+22`, the beacon proposer discloses that the winner of the auction in slot `n`, Execution Proposer `0xA12`, will have to provide the execution payload for execution slot `n+22`. This means that although the auction winner knows they will propose within the window `n+16` to `n+32`, they only learn their specific execution slot (e.g., `n+22`) right before they have to propose.

By randomizing the exact slot assignment within a known window and revealing it just in time, randEAs prevent proposers from knowing far in advance whether they will control multiple consecutive slots. 

### **Beacon Proposer Slot Assignment Mechanism**

To ensure that beacon proposers exclusively and securely assign execution slots to winners, we incorporate a mechanism inspired by [**attestation aggregation](https://github.com/ethereum/consensus-specs/blob/a09d0c321550c5411557674a981e2b444a1178c0/specs/phase0/validator.md#aggregation-selection).** We use cryptographic signatures and deterministic selection functions to maintain randomness and fairness in execution slot assignments.

**1. Key Components**

- **Execution Proposer Pool**: A list of execution proposers who have won the initial randEA auction for a specific slot window.
- **Slot Signature**: A unique BLS signature generated by the beacon proposer for each execution slot to introduce randomness.
- **Selection Function**: A deterministic method that uses the slot signature to select an execution proposer from the pool.

**2. Generating Slot Signatures**

For each execution slot within the auction window (e.g., `n+16` to `n+32`), the beacon proposer of that specific slot generates a unique **slot signature**. This signature serves as a cryptographic source of randomness for selecting the execution proposer for that specific slot.

```python
def get_slot_signature(state: BeaconState, slot: Slot, privkey: int) -> BLSSignature:
    domain = get_domain(state, DOMAIN_EXECUTION_SLOT_SELECTION, compute_epoch_at_slot(slot))
    signing_root = compute_signing_root(slot, domain)
    return bls.Sign(privkey, signing_root)
```

- **Function Breakdown**:
    - **`get_domain`**: Defines the context for slot selection.
    - **`compute_signing_root`**: Combines slot and domain to create a unique message for signing.
    - **`bls.Sign`**: Generates the BLS signature using the Beacon Proposer's private key.

**3. Selecting an Execution Proposer**

Using the generated **slot signature**, the beacon proposer of slot `n+22` deterministically selects an **Execution Proposer** from the **Execution Proposer Pool** for execution slot `n+22`.

```python
def select_execution_proposer(proposer_pool: List[str], slot_signature: BLSSignature) -> str:
    signature_bytes = bls.Signature.to_bytes(slot_signature)
    hashed_signature = hashlib.sha256(signature_bytes).digest()
    hashed_int = int.from_bytes(hashed_signature[:8], 'big')
    proposer_index = hashed_int % len(proposer_pool)
    selected_proposer = proposer_pool[proposer_index]
    return selected_proposer
```

This function **(1)** converts the slot signature into a hash using SHA-256 to ensure unpredictability, **(2)** maps the hashed value to an index within the Execution Proposer Pool, and **(3)** chooses the proposer at the determined index, ensuring each proposer has an equal chance of being selected.

**4. Delayed Reveal**

The selected execution proposer for a specific slot is revealed during the beacon slot **immediately preceding** to the execution slot.

- **Example**: For execution slot `n+22`, the assignment is revealed during beacon slot `n+22` by the beacon proposer of slot `n+22`.

## **Model**

To demonstrate how randEAs could work, we present a simple model based on the following assumptions:

- **Slot Windows**: Each proposer is assigned a slot from a predefined window of slots.
- **Random, Non-Reassignable Slots**: Slots within the window are assigned randomly, and once assigned, a slot cannot be taken by another proposer.
- **Window Progression**: Once all slots in a window are assigned, the process moves to the next window.
- **Delayed Slot Reveal**: Although execution proposers are pre-assigned slots, the exact slot is revealed only one slot before they are scheduled to propose.

We define the following variables:

- $W$: Slot window size (e.g., $W = 16$). Note that the size of the window is a parameter that should be carefully set after conducting further analyses.
- $S_i$: Slot assigned to execution proposer $i$.

### **Slot window**

Each execution proposer $i$ is assigned a slot from the following window:

$
W_i = \{ \text{slot}_{n+16}, \dots, \text{slot}_{n+15+W} \}
$

Execution proposer $is slot is chosen randomly from the available slots in $W_i$.

The slot assignment follows these rules:

- **Random Selection**: A slot is randomly allocated to execution proposer $i$ from $W_i$, and once assigned, it cannot be reassigned.

- **Window Progression**: Once all slots in $W_n$ are assigned, the next window,
$W_{i+W} = \{ \text{slot}_{n+32}, \dots, \text{slot}_{i+31+W} \},$ is opened for the next set of execution proposers.
- **Delayed Slot Reveal:** Although execution proposer $i$ has a slot assigned within their window, the exact slot  $S_i$ is revealed to them is revealed to them only one slot before they are scheduled to propose.

### Probability of Knowing the Exact Slot

As more slots within a window are assigned, the probability that an execution proposer knows their exact slot increases because they can observe which slots have already been allocated. This probability reaches certainty when only one slot remains unassigned (see **Figure 2**).

![Slot Allocation Mechanism output (1) (1)|601x500](images/3gKN6wloG6LTeN2yqpISEBsH5Na.png)

Let $k$ represent the number of slots already allocated in proposer $is window $W_i$. The probability that proposer $n$ knows their exact slot prior to the final reveal is:

$$
P_i(k) = \frac{1}{W - k}
$$

Here's why:

**Total Remaining Slots:** There are $W - k$ unassigned slots remaining in $W_i$:

$$
\text{Total Remaining Slots} = W - k
$$

**Equal Probability:** Since slots are assigned randomly, each of the remaining slots has an equal chance of being assigned to proposer $n$.

**Certainty with One Slot Left:** When only one slot remains unassigned $W - k = 1$, the probability becomes:

$$
P_i(W - 1) = \frac{1}{W - (W - 1)} = \frac{1}{1} = 1
$$

As the window fills up, the probability of knowing the exact slot increases, ultimately reaching certainty when only one slot remains unassigned.

## Pros

- **Simplicity**: Employing slot windows with random slot allocation, instead of introducing a second [just-in-time (JIT) auction](https://hackmd.io/@mikeneuder/mechan-stein), simplifies implementation and requires fewer resources from protocol actors like attesters, who would otherwise need to ensure that the additional auction is conducted properly and that participants adhere to the rules.

- Random EAs effectively differentiate between **knowing that you will propose** and **knowing the exact slot in which you will propose**. This allows proposers to leverage the certainty of having won the right to propose in the near future to price the value of winning the auction while limiting potential abuses  that could arise from knowing the exact slots they will control well in advance (e.g., MMEV).

- **Reduced edge for sophisticated bidders**: Not knowing the exact slot you will control may also reduce the edge that sophisticated parties gain when bidding during the execution proposing rights auction. For example, if a token or NFT is scheduled to launch at a specific slot, the uncertainty in slot allocation might prevent sophisticated actors from exploiting this information to extract more MEV by pricing the expected block value ahead of time.
- Random EAs allow execution proposers to provide both short-lived (lookahead of 1) and long-lived (guaranteed to get the execution proposing rights in a given slot window) **preconfirmations**. We could also envision proposers who have won the right to propose within a given time window coordinating off-chain to offer better guarantees to users.

## Things to look out for

- The current market structure, which employs out-of-protocol Proposer-Builder Separation (PBS), tends to centralize block proposals among a few actors with the highest ex post MEV (Maximal Extractable Value) extraction abilities. This concentration leads to significant variability and results in an oligopoly, where only two builders are responsible for producing more than 85% of all blocks. In contrast, random Execution Auctions (randEAs), similar to Execution Tickets (ETs), may shift this concentration toward actors with the highest ex ante value for MEV extraction (see [Pai and Resnick, 2024](https://arxiv.org/abs/2408.03116)). Under randEAs, the winners of execution proposing rights might have limited MEV extraction capabilities themselves and instead outsource block construction. This outsourcing causes execution proposing rights to concentrate among those with the lowest capital costs. If capital costs are uniform across participants, the concentration instead favors those with superior MEV extraction abilities. In more realistic scenarios, when both capital costs and MEV extraction abilities vary among participants, the interplay between these two factors might lead to further concentration, potentially resulting in a monopoly (see [Burian, Crapis, Saleh, 2024](https://arxiv.org/abs/2408.11255)). This shift in market structure could cause greater centralization than the current PBS system, and the possibility of increased concentration with randEAs must be carefully considered.

- If slot windows are relatively small (e.g., 16 slots), random EAs may introduce some inequality among proposers within a given window. Proposers assigned to slots towards the end of the window have a higher probability of knowing their exact slot in advance, as more slots are allocated and revealed. Conversely, an infinitely long time window would provide a memoryless property (i.e., the probability of knowing the exact slot remains constant), but it would make pricing highly complex: Without a bounded window, assigning a fair value to execution proposing rights is inherently difficult, as there are no natural limits or constraints to guide pricing decisions.

- Bidders that win multiple auctions gain an increased ability to predict the exact slots they will propose, especially as the number of unassigned slots decreases and if their own slots haven't been assigned yet. For example, if a single party has won three auctions in a row and their slots have not been assigned while only three slots remain unassigned in the window, they are certain to be allocated those three remaining slots. This certainty allows them to control multiple consecutive slots, potentially giving them an unfair advantage and enabling them to exploit MMEV opportunities.