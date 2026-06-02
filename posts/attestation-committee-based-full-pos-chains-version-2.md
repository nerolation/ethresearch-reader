Suppose that you have a PoS chain, where there is some validator set V, and where blocks are subdivided into epochs of length $EpochLength$; you want every validator to vote once in every epoch as this is important for the consensus cycle and to minimize any gains from RNG manipulation. There is a source of random entropy in the chain; suppose that the random entropy updates once per epoch. At the start of every epoch, we randomly shuffle $V$ and partition it into slices $S_1 ... S_{EpochLength}$, each of size $SSize = \frac{V}{EpochLength}$, and we split up activity into consecutive time slots $T_1 ... T_{EpochLength}$.

There are two types of messages: blocks and attestations. A block is a data structure that contains a pointer to a parent block, as well as a set of messages, and a set of signatures ("attestations") of the parent block or another earlier block. The block must include at least $\frac{SSize}{2}$ attestations of its parent, though it can contain more. A block must specify what slot number it is produced in; if a block is in slot $i$, immediate attesters of that block must come from the set $S_i$, and its signer must be the first member of $S_i$.

[yuml]
[B_i] -> [S_i attester 2]
[B_i] -> [S_i attester 3]
[B_i] -> [S_i attester 4]
[B_i] -> [S_i attester 5]
[B_i] -> [S_i attester 6]
[S_i attester 2] -> [B_i+1]
[S_i attester 3] -> [B_i+1]
[S_i attester 4] -> [B_i+1]
[S_i attester 5] -> [B_i+1]
[S_i attester 6] -> [B_i+2]
[B_i+1] -> [S_i+1 attester 2 ]
[B_i+1] -> [S_i+1 attester 3 ]
[B_i+1] -> [S_i+1 attester 4 ]
[B_i+1] -> [S_i+1 attester 5 ]
[B_i+1] -> [S_i+1 attester 6 ]
[S_i+1 attester 2 ] -> [B_i+2]
[S_i+1 attester 3 ] -> [B_i+2]
[S_i+1 attester 4 ] -> [B_i+2]
[S_i+1 attester 5 ] -> [B_i+2]
[S_i+1 attester 6 ] -> [B_i+2]
[/yuml]

Notice that a block at step $i+2$ can include not just attestations of the parent block created at step $i+1$, but also attestations of blocks earlier in history, as well as attestations of blocks outside of the same chain.

If a block is produced by the first member of $S_i$ during timeslot $i$ that is on the head, the other attesters are expected to co-sign this block. If a block does not get produced on the head, then the other attesters can sign a message asserting to what they consider the current head to be. Hence, there can actually be _two_ ways that an attestation of a block with height $i$ gets included in a block with height $j > i+1$:

1. The creator(s) of the block(s) with heights $i < h < j$ fail to include it
2. The creator(s) of the block(s) with heights $i < h < j$ fail to produce blocks, or produce blocks that are not on the head, in which case attesters can create attestations at height $h$ of blocks of height $i < h$

Attestations of a block's parent that come in slots later in the first slot when such an attestation could appear (ie. case (2)) can count toward the $\frac{SSize}{2}$ attestation minimum (which is what allows the chain to progress even when $<\frac{1}{2}$ of validators are online), but attestations of blocks other than a block's parent do not.

Note that a signer and an attester are in symmetric positions in the block structure but not at network layer: because the signer is the sole _mandatory_ attester, in general the signer signs a block immediately after making it and broadcasts it with the signature, and other attesters then sign after them. This allows the total aggregate signature of a block to be only one signature in size and require only one pairing to compute, at least in the best case where everyone agrees what they are signing.

#### Fork choice rule

The simplest fork choice rule to use is simple height counting. The ideal fork choice rule to use is [GHOST](https://pdfs.semanticscholar.org/4016/80ef12c04c247c50737b9114c169c660aab9.pdf), which works as follows:

1. Start at the genesis (or most recent finalized block)
2. Let the "current block" be the block the algorithm is looking at at the moment (ie. the genesis or most recent finalized block initially)
    * If the current block has zero children, then exit.
    * If the current block has only one child, set the current block to that child, and go 
    * If the current block has more than one child, set the current block to the child that has more valid most-recent signatures from a validator signing on either that block or some descendant of that block
3. Repeat (2) until exit, and return the current block as the head.

For example, consider the following diagram, where A, B.... M are the most recent signatures, and the blocks they are located in are the blocks those signatures are attesting to:

[yuml]
[Last finalized block {bg:yellow}] -> [A]
[A] -> [B]
[A] -> [C]
[B] -> [D E]
[D E] -> [F]
[D E] -> [G H]
[G H] -> [M]
[G H] -> [I J {bg:green}]
[F] -> [K]
[K] -> [L]
[/yuml]

The head is the green block, because:

* A is the only child of the last finalized block
* B and C are the children of A. B has far more signatures backing it or its descendants than C.
* (D E) is the only child of B.
* F and (G H) are the children of (D E). (G H) has 5 signatures backing it or its descendants, F has 3, so (G H) wins.
* (I J) and M are the children of (G H). (I J) has 2 signatures backing it or its descendants, M has one, so (I J) wins.

GHOST preserves the property that the chain that has the most signatures supporting it is the winning chain, which is an important criterion to make reversion, censorship and other attacks maximally difficult.