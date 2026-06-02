Looking at the new draft of the  [Casper V2 spec](https://notes.ethereum.org/SCIg8AH5SA-O4C1G1LYZHQ?view)

One question I have is related to selection of block proposers.

My understanding is that for a given block several ($M$) block proposers are selected. 

Are all block proposers equal for a given block or they have priorities (score) which is taken in account by the fork choice rule ? 


If all block proposers are equal, then  the bad guys could win by proposing faster than good guys (lets say you have 16 block proposers each time, and one of them is always bad but way faster than other 15 good guys).