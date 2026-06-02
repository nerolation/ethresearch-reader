
There is a liveliness question of Casper CBC (a similar problem may exist in Casper FFG)

from @vbuterin   https://vitalik.ca/general/2018/12/05/cbc_casper.html

"I think it should be possible to write up an academic proof for consensus under synchrony for a class of problems I call “divergence games”. Suppose you have a game where validators publish messages, and each message is either +1 or -1. If the total sum of valid messages a validator saw is positive, validators will try to publish +1, if it’s negative, validators will try to publish -1, and if it’s 0 validators will do either. If the average time between new valid messages is greatly above network latency, then I would claim that you can guarantee it will converge to + or - infinity assuming honest majority."

Consider a case where there are initially 51% of good validators voting for 1 ("majority vote") and 49% of good guys vote for 0 (minority). Then the bad guys can send 0 votes to the "minority vote" good guys, and withhold the vote from the "majority vote" guys to keep the problem from being resolved deciding.   Note  that witholding a vote is not a slashable offense. 

Note that the same problem may exist in Casper FFG.  If there are two approximately identical subtrees trees, validators may get stuck (50/50) resolving them, and then move to create a deeper link.   The bad guys though may again withold the vote from some nodes. and having a smart algorithm (say machine learning) may prevent finalization forever,  provided that the good guys are dumb enough ... It may be a hard things to do but seems possible.  The next step is to do simulations to prove or disprove this.