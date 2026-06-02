I learned this idea (if not exactly the same something very similar) from @JustinDrake.  

## Summary 

With EIP-7732 coming in the Gloas fork, we have new on-chain validators with a specific withdrawal prefix `0x03` that are allowed to produce payloads and bid for their inclusion. In this proposal, I describe a very simple to implement way of separating completely the builder role from the proposer role of validators. This mechanism has several advantages:

- It solves completely the \[free option\]( https://arxiv.org/abs/2509.24849 ) problem.
- It removes any comunication proposer <–> builder affecting  latency of block building and slot pipelining. 
- It removes some of the complexity of the consensus specification around builder payments to proposers. 
- It has a positive effect in the economics of ETH the asset. 

## The mechanism

The mechanism is very simple, it consist of

1. Remove any validating duties and rewards/penalties from 0x03 validators. Their stake is only locked up in the beacon chain without getting rewards nor being penalized. 
2. Remove any cap on the stake of 0x03 validators, they are allowed to stake as much as they want. 
3. The protocol chooses builders at random, in a similar way as we do now with proposers, only from 0x03 validators. This choice is sampled randomly but weighted by stake.
4. Add an automatic failsafe mechanism to temporarily blacklist some 0x03 builders if they fail to deliver some payloads and ultimately fall back to self building if no more 0x03 builders are available. 

## Pros

- The free option problem dissapears as there is no commitment to a particular payload from the builder. There is only the deadline at the time of revealing, blocks and blobs. 
- There is no need for the proposer to commit at all to any bid from the builder, the proposer only commits to the parent block hash in the execution layer, the builder needs to build on top of that execution head. This way, the decentralized set of proposers keep decisions on forkchoice. Builders only sequence the chain. 
- There is no need for any communication between consensus proposers and execution builders. 
- There is no need for any payment mechanism to pay a bid from the builder to the proposer. The builder no longer pays anyone, their cost is the capital cost of being staked. 
- MEV revenue shifts from proposers to being shared by builders (as they no longer need to pay bids) and ETH holders (as the cost of the missed interest rate on the locked ETH which is paid by builders, is ultimately shared by all ETH holders). 
- If the protocol so desires, we can even do a form of MEV burn by actually charging the 0x03 stake a constant rate according to market conditions. 


## Cons

- This is a centralizing force on block building. FOCIL or any forced inclusion list mechanism is necessary for this system to be implemented. 
- Staking pools would be affected. However, staking pools by definition have control over large amounts of ETH. If the MEV revenue lost from fees becomes more than the capital cost of staking that ETH as a 0x03 validator, staking pools can themselves be builders and potentially auction out off protocol their slots. 
- Collusion between a centralized set of builders is possible. In many respects, on the one hand multiple slot MEV becomes more predominant when there is a reduced set of builders. On the other hand a small set of builders may collude to minimize their locked capital cost. However, since the system is permissionless, it is rational for ETH holders to stake in this situation, mitigating both aspects.