An interesting question is whether a decentralized network can self-evolve to reach strong AI (or stronger AI )

An important milestone would be if a neural network running on a decentralized network can pass Turing test.

Here are some thoughts on how this could be implemented

1. A coin (Turing Coin or TRC) is introduced on Ethereum as an ERC token.

2. There is an initial supply of coins as well as bounty coins that can be mined by winning 
    Turing games. Say 5% of coin supply are mined each year.

3.  Each Turing game includes an investigator and a subject.   Investigators chat with subjects by exchanging messages through an Ethereum smart contract.

4.   Subjects can be both computers and humans.   

5.  A subject enters a game by bidding to enter.  There is a fixed number of games played per day,   1/2 of them include human subjects and 1/2 include AI subjects. The highest bidding subjects enter games by depositing bids.

6. Anyone can be an investigator (both a neural network and a human).  Investigators enter games by bidding, the highest winning bidder enters the game by depositing the bid. The investigator does not know whether the  subject is a human or a neural network.

7.  A game proceeds in a fixed number of steps N (questions and answers). At any time an investigator can call a subject a human or AI.  The investigator wins and gets the bounty, if she correctly calls the subject. If an investigator makes an incorrect call, the deposit she bid with is slashed.

8.  A subject wins if it is called human by an investigator, or if  N steps  are exceeded without the investigator calling the subject.

9. Games proceed in three months epochs.  Bounties are paid cumulatively at the end of each epoch. 

10. In order for a neural network to claim bounty at the end of an epoch, the neural network  source (topology and weights) need to be submitted to by the neural network author to blockchain under a GPL 2.0 license.  At this point, anyone else can use the network to build a yet better network.

11.  The neural networks (both subjects and investigators) are going to evolve and self-improve in the following sense:  if Alice invents a better network, she is going to benefit financially for three months, but in order to claim her cumulative bounties, she will need to reveal the source code under GPL 2.0 license. Then other people can work on incrementally improving the network.  

Under some scenarios, the market value of the token can quickly reach $1T and above, so if bounties say amount to 5% of total circulation,  $50B of bounties can be paid each year, essentially going into improvements of AI algorithms ...

Looking for further comments to improve this proposal  :wink: