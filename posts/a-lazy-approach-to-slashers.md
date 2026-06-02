Today there exist two different implementations for slashers. One by Lightouse and another by   Prysm.  Both of them follow @protolambda's design [[1]](https://github.com/protolambda/eth2-surround#min-max-surround). See also [[2]](https://hackmd.io/@sproul/min-max-slasher) for Lighthouse's adaptation and [[3]](https://hackmd.io/@prysmaticlabs/slasher) for Prysm's. In short, slashers are heavy resource consuming beacon nodes that keep a very large database of every single attestation cast by every single validator for the last few months. Most of the complexity in designing these comes from optimization strategies towards keeping the database manageable. Most of the complexity of running these comes from the fact that a heavy resource machine is needed, and it is needed at the times that it matters most: when the network may have contending forks and nodes are stressed as much as possible. In this short note I want to explore a different concept that would allow for any beacon node to act as a slasher with minimal extra burden to the normal operations.

The bottleneck for slashers is the handling of surround attestations. An attestation is a pair $a=(s,t)$ consisting of the *source* and *target* epoch respectively.  An attestations $a=(s,t)$ is said to *surround* another attestation  $a'=(s' ,t')$  if both are cast by the same validator,  $s < s'$ and $t' < t$, In order to detect these surround votes, slashers keep the following structures in their database. Let $V$ be the set of validators, for each $v \in V$ let $A_v$ be the set of all attestations cast by validator $v$. For each $v \in V$, and an epoch $i$ we define the sets 

$m_{i,v} = \{ (s,t) \in A_v |  s > i \},  \qquad M_{i,v} = \{ (s,t) \in A_v |  s < i \} $

And use these sets to build the functions $m_v, M_v$:

$m_v(i) = \min_{(s,t) \in m_{i,v}} t$
$M_v(i) = \max_{(s,t) \in M_{i,v}} t$

These sets are used for example as follows, if a new attestation $a=(s,t) \in A_v$ is seen, the slasher checks if $t > m_v(s)$, if this is the case then there exists another attestation $a'  \in A_v$ surrounded by $a$. Similarly if $t < M_v(s)$ then there exists another attestation $a' \in A_v$ that surrounds $a$. 

The problem is that the space needed to store all values $\{ m_v(i), M_v(i) | v \in V, I - i < W \}$, where $I$ is the current epoch and $W$ is the weak subjectivity period, consist of several Gigabytes. The slasher needs to sift through these many attestations looking for the offending ones. 

This note is based on the following list of simple observations

-  Violating attestations are only really harmful if included in blocks. This is not entirely true, there is harm in attestations that skew forkchoice, however as long as these attestations are not in blocks, syncing nodes will not follow a bad chain (as syncing nodes only get their forkchoice from blocks). 
- Violating attestations are only really harmful if there are many attestations being cast at the same time. A handful of validators would not really pose a risk to Ethereum's consensus. This was cemented in the penalty changes for Pectra in which the correlation penalty for attackers is still stiff, but the penalty for operator errors has been drastically reduced. 
- Violating attestations typically require only a few blocks to be found. 

The last two points are the core, lets consider what the behavior would be under a successful attack. For this we have an actual example to draw data: the Holesky Pectra fiasco. The majority of  validators attested to finalize an invalid block, and these malicious validators then moved to revert that finality. Slashers had problems to deal with this situation, it goes beyond the point of this note to explain what those problems actually were, but it suffices to say that we would have expected to see many more slashings on Holesky than the ones we saw. In fact, **slashers only need about 32 blocks** to slash every offending validator. The reason for this is that all validators  were chosen to attest during the first reverted epoch. And any of these attestations would be enough to slash these offending validators. An honest node that has kept the 32 blocks after the first invalid checkpoint, could have simply gone back looking for these bad attestations after the fact. 

## The Lazy Slasher

Our proposal follows a very simple algorithm

- Beacon nodes that opt in will keep functions $m(i), M(i)$ that are defined very similar to $m_v$ and $M_v$ above, but only a single pair is needed instead of one pair per validator. These functions are defined as follows. Let $A$ be the set of all attestations the node has ever seen. 

$m_{i} = \{ (s,t) \in A |  s > i \},  \qquad M_{i} = \{ (s,t) \in A |  s < i \} $
$m(i) = \min_{(s,t) \in m_{i}} t$
$M(i) = \max_{(s,t) \in M_{i}} t$
- When a beacon node receives an attestation $a=(s,t)$ it checks if $t > m(s)$. If this happens, then the node knows that there exists an attestation $a' = (s', t' ) \in A$ that is surrounded by $a$ **but it does not know if they were cast by the same validator**. 
- The node then grabs all the blocks in the epochs $t', t' +1$ as these are the only epochs in which $a'$ could have been included. 
- The node implements a simple endpoint that  returns all possible slashings from the block that contained $a$ and from all the blocks in the epochs $t', t'+1$. 

This algorithm is subject to some minor griefings. 

- The node needs to keep invalid blocks, this in principle could be a DOS vector, but we believe is minor since it can be contained to actual validators that could have been a proposer during those blocks (for example the node may only look for slashings from branches it knows about). 
- Any validator could in principle trigger all participating nodes into looking in previous epochs for blocks. However, this cannot happen at all during finalization as it's impossible to vote with either a previous source or a future target. 

## Some final considerations

I believe this area can be explored further to strengthen our slashing protection mechanism. For example clients are already looking into implementing the offline version of this slasher, that is, return all possible slashings from a collection of blocks (again simply 64-128 should be enough to slash every validator in Holesky). Another area that is open would be to find ways of exploiting the fact that slashings are only dangerous when there are many at the same time. Perhaps this could be exploited in reducing the resources of slashers by only looking for massive events. Notice that this is not the case with the lazy mechanism above, even a single validator surrounding would be found with the lazy mechanism depicted above. 





## Acknowledgments

I'm indebted to my colleagues at offchainlabs that often need to bear my mumblings and specially indebted to @michaelsproul that not only has to put up with my questions at random Australian hours but also has always the right thing to say about protocol in general and slashers in particular. 









[1] https://github.com/protolambda/eth2-surround#min-max-surround
[2] https://hackmd.io/@sproul/min-max-slasher
[3] https://hackmd.io/@prysmaticlabs/slasher