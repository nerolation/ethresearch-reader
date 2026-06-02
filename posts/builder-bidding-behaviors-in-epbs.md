Special thanks to @soispoke for the review

# Background

Builder bidding strategies in the MEV-Boost world have been studied extensively over some time. Numerous [excellent resources](https://arxiv.org/html/2312.14510v3), [literature](https://arxiv.org/abs/2407.13931), [game-theoretic models](https://ethresear.ch/t/game-theoretic-model-for-MEV-Boost-auctions-mma/16206), and [archives](https://collective.flashbots.net/t/MEV-Boost-builder-bids-archive/3561) capture the current builder bidding behaviors on how to win block building right for an Ethereum slot. Today, builder bidding war for MEV-Boost is a complex interplay between latencies, relays, and strategy effectiveness. In this post, we argue that builder bidding strategies become simpler in ePBS world and we highlight the key differences in how bidding strategies change under the new ePBS market space rules, strategy limitations, and reduced latency benefits in ePBS.

# Market Spaces

Here, we summarize three types of market spaces. The first one is MEV-Boost. The second and third ones are ePBS. MEV-Boost is push + pull based market space, meaning the builders push the bids to the relays, and the proposer pulls the bids from the relays. ePBS contains two types of market spaces: the P2P Bid Gossip Netwok, which is push-based, and the Builder RPC Endpoint, which is pull-based.

- **MEV-Boost market space**
  - **Push + pull-based**: The builders push bids to the relay, and the proposer pulls the bids from the relay.
- **ePBS market spaces**
  - **P2P market space**
    - **Push-based**. The builder pushes the bid to the p2p network.
  - **Builder RPC market space**
    - **Pull-based**. The proposer pulls the bids from the builder RPC end points.

We define the following market space characteristics given how the consensus [spec](https://github.com/ethereum/consensus-specs/pull/3828) is written today. Builder-API is still **TBD** for ePBS.

## MEV-Boost Market Space

- **Open auction**: Builders that subscribe to the relay's feed can see the every builder's latest bid.
- **Continuous auction**: Builders can bid multiple times and cancel previous bids.
- **Auction termination**: The auction terminates when the proposer calls `getHeader` and when the relay returns the header to the proposer to sign. The relay may delay the header response for a timing game. This means the relayer has the final control over when the auction terminates.
- **Profit sharing**: Some relays take the difference between the winning bid and the second-highest bid received from builders. This difference goes to the relay, with a portion potentially refunded to the builder. This transforms the auction dynamic into a second-price auction. However, not all relays adopt this approach, and complete trust in the relay is mandatory.
- We assume the market space doesn't verify block contents from the builder, hence it is an [**optimistic market space**](https://github.com/michaelneuder/optimistic-relay-documentation/blob/4fb032e92080383b7b5d8af5675ef2bf9855adc3/towards-ePBS.md). The only delay is when the builder sends the block to the relay.

## ePBS P2P Market Space

- **Open auction**: Anyone can subscribe and listen to the P2P network for gossiped builder bids.
- **Single bid auction**: To prevent DOS attacks on the P2P network, the current spec only allows builders to submit a single bid and above a certain minimum value. Any subsequent bid will be dropped by the nodes. There is no cancellation support over the P2P network.
- **Auction termination**: The auction terminates when the proposer proposes the block which includes the builder's bid. The proposer could play a timing game here and has the final control over when the auction terminates.
- **Profit sharing**: The bid specifies the value, and the proposer gets the full value on the consensus layer as long as the consensus block that includes the bid remains canonical. There's no profit sharing with 3rd parties.
- The market space is still **optimistic** and doesn't need to verify the execution contents at inclusion time. If the execution block later becomes invalid or fails to reveal, the proposer still gets unconditional payment. The only delay here is the builder sending the bid to the P2P network. This delay is argubly **longer** than using a relay in MEV-Boost market space.

## ePBS Builder RPC Market Space

Note: The [Builder API](https://github.com/ethereum/builder-specs) is undefined at this moment. This section is based on what we think the ePBS Builder API might look like, but it's highly subjective to change and open for feedback. Below outlines one version of Builder API which we have been thinking.

- **Private auction**: Only the proposer can request a bid from the builder. The proposer will sign the `getHeader` request using the builder's public key. The builder's bid remains private until requested by the proposer. Builders can't sniff other builders' bids unless the builder API allows this or the builder voluntarily opens their bids to the public.
- **Single** (maybe multiple?) **bid auction**: Builders allow proposers to request a bid once, and any subsequent requests will result in an error. Builders may also allow proposers to request bids multiple times without error; this specific detail is undefined, and it's unclear what the Nash outcome is here. If builders allow multiple requests, then the builder must ensure previous bids are canceled.
- **Auction termination**: The auction terminates when the proposer requests the header and the proposer receives the header. The builder can play a timing game, but this may backfire and lead to the proposer using another builder's bid. Builder timing game will not work here, but proposer timing games are still relevant.
- **Profit sharing**: Same as the P2P market space.
- The market space is still **optimistic**, and the delay here is the builder returning the bid to the proposer. This delay is shorter than the P2P market space and likely the same as MEV-Boost if the builder is well co-located.

# Builder Bidding Profiles under ePBS

In the [Strategic Bidding Wars in On-chain Auctions](https://arxiv.org/abs/2312.14510), four profiles of builder behavior are listed in MEV-Boost auction:
- **Naive Behavior**: Aggressively updates bids based on their valuation as long as the aggregated signal surpasses their profit margin.
- **Adaptive Behavior**: Monitors the current highest bid and places a bid if able to outbid by a small constant. Defaults to the naive strategy if unable to outbid.
- **Last Minute Behavior**: Reveals valuation at the final possible moment before auction termination to minimize the reaction window for other players.
- **Bluff Behavior**: Initially places high bids (bluff) and later reverts to actual valuation, leveraging bid cancellation to compel other players to disclose their valuations.

Given the new market space in ePBS, we will examine which strategies are viable under the auction rules.

### P2P Market Space

- **Naive, Adaptive, and Bluff Behaviors**: These strategies are harder to execute since bids can only be sent once. The builder might use different staked addresses, each sending one bid. However, this requires staking on the consensus layer for each address, assuming payment is handled on the consensus layer. Additionally, bluffing is not possible because bids cannot be canceled.
- **Last Minute Behavior**: This is the **only** possible strategy. Builders will reveal their valuation at the final moment before auction termination to minimize the reaction window for other players.


### Builder RPC Market Space

- **Naive, Adaptive, Bluff, and Last Minute Behavior**: For similar reasons to the P2P market space, these strategies are not possible. Additionally, the auction is private, meaning builders cannot see each other's bids. Most importantly, the auction has shifted from push-based to pull-based, so the builder no longer has control over when to submit bids. The only way for builders to get their bids to the proposer is through the proposer's request.

We conclude that builders' bidding strategies are heavily limited under ePBS. For P2P, only last-minute bidding is possible. For Builder RPC, builders can only respond to the proposer as it is a pull-based model.

# Market Space Considerations

We add a few more concerns in this section that was emphasized in the MEV-Boost market space but may no longer be relevant in ePBS market space.


## Latency and DOS Concerns

Different market spaces impose varying latency constraints. In the P2P market space, builders push bids to the proposers, and the market operates as a large P2P gossip network constrained by anti-DOS measures. With 1 million validators, the worst-case scenario could mean 1 million bids. Due to these concerns, rules like disallowing multiple bids and ensuring bids are above certain values are necessary. The P2P network is inherently slow, so we don't foresee serious bidders using it to win bids. However, the P2P market space is valuable for maintaining a good **baseline for competitive bids** that isn't latency-sensitive. If builders using RPC collude to drive bid prices low, an **altruistic builder** over P2P can ensure the bid value baseline remains healthy and competitive with minimal effort. The baseline P2P bid value may also be used for burning in future iterations, as it only requires a 1/n honest assumption.

In the builder RPC market space, which is pull-based, latency matters significantly. Instead of two latencies (global and individual) defined in the MEV-Boost market space, there's only one individual delay to consider: how fast the builder can return the bids to the proposer. Delaying the return of `getHeader` may result in proposer missing builder's bid.

## Auction Interval Uncertainty

The auction interval uncertainty becomes clearer in ePBS because MEV-Boost middleware and relays no longer control the timing of when the block gets returned to the proposer or released to the network. The proposer either uses the pushed bids from the P2P network or pulls bids from the builders RPC. The proposer has the final say on the auction interval cut-off. From the builder RPC market space perspective, it will keep updating its bids until the proposer requests them.

### New: Bluff Behavior under ePBS

In ePBS, proposers or builders may attempt to bluff other builders. This may not be scalable given the nature of the single bid auction over P2P and the fact that every builder is a validator and needs to have a stake on the beacon chain. One bluff strategy is for the proposer of next slot to reveal a high value P2P bid, intentionally stating that this is the bid it will include for the next slot unless others can beat it. This helps set the base price and forces everyone else to beat it. However, the proposer doesn't have to include its bid.

Although it's obvious that anyone can see that the bid comes from the proposer and just ignore it, the proposer may use sybil validators to perform the same bluff. However, it's still unclear how scalable this strategy is, given that one bid equals one validator.

# Open questions

The current ePBS market space design and requirements leave some open questions. We will summarize the open questions here for feedback:

- **P2P Market Space Conditions**: 
  - Every builder can only submit one bid, and the subsequent bids get dropped. Are there any advantages to allowing multiple bids here? If yes, then how many?
  - Every builder's bid needs to be above a certain value to deter DOS attacks. What should the value be? 
      - We can look at current or past empirical data here.
  - There's a tradeoff between the number of bids allowed and the minimal values. If we set the values high, we may allow multiple bids. 
  - Is there a strong argument for requiring bid cancellation?

- **Builder RPC Market Space's Builder API Interface**: 
  - What does the Builder API interface look like? 
      - We want to leverage the existing Builder API and aim for minimal changes.
      - When the proposer makes a header request to the builder, what should the request look like? Can we use the current get header request with a signature, or should we modify it?
      - Do we allow multiple getHeader requests, such as continuous polling from the proposer, or do we enforce a common standard?
  - What kind of auction is most ideal? 
      - Sealed second-price auction may be most ideal. 
      - How to design this over Builder API? 

- **Comparing MEV-Boost Market Space to ePBS Market Space**: 
  - Do we lose anything in the ePBS market space that is important to maintain from the MEV-Boost market space?

- **Implications of staking pools also bidding:**
  - Pools that hold a significant chunk of validators could be in a privileged position for submitting bids and manipulating the market extensively compared to a builder that doesn't hold as many keys.
      - Is there an advantage to this asymmetry? 
      - Will we see staking pools and builders teaming up, and how will this dynamic play out?