Here a balancing attack on gasper is described.

https://ethresear.ch/t/a-balancing-attack-on-gasper-the-current-candidate-for-eth2s-beacon-chain/

The essence of the attack IMO is to bring the complex network into an undecided equilibrium of a split vote and then use a small number of malicious nodes to keep the system in the undecided equilibrium forever.

I think it may be impossible to solve problems like this while staying purely PoS  in large systems, since essentially resolving an undecided equilibrium is equivalent to binary consensus, which is  O(N^2)

An interesting question is whether VDF can be used to "unstuck" the network by creating an alternative branch that honest parties can switch into.

Here is a simple example of how this can be done.

In addition to the default block proposer, add a list of secondary block proposers where 
each secondary proposer needs to solve a VDF to propose, where the VDF time increases exponentially for each subsequent secondary proposer.

The VDF time for the secondary proposer number 1, can be, say, twice the typical finalization time. 

During normal operation, secondary proposers won't play a role since they will not be able to compute the VDF in time. 

If the network is not able to finalize for time larger than typical,  a secondary proposer will solve the VDF puzzle and propose a new block with a higher weight.

All honest validators switch to the new branch resolving the deadlock.

So essentially the undecided equilibrium created by a malicious proposer is resolved by adding an honest proposer after a VDF-based time delay.