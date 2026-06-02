Figured I'd write something up about this for fun. Sorry if people have written about this before!

While working on some Plasma stuff I started thinking about efficient ways to place floors on gas prices. If you don't have any legal means to set a price floor, you can just [offer to buy everything](https://en.wikipedia.org/wiki/Government_cheese) at the floor price. If other people are willing to pay even more than your floor price, then you don't actually need to buy everything.

I wrote up a small [a smart contract](https://ethfiddle.com/CkcYJuarzy) that basically offers to fill the remainder of a block at a specified gas price. As long as the contract has enough funds, miners are guaranteed that floor price.

The cost to sustain a floor price maxes out at the cost to fill every block at that gas price (which makes sense). Currently that's about $1m to push gas prices up to 100 gwei for a day. You'd probably end up paying less in practice because people will still want to use Ethereum. 

All of this generally depends on the economics around mining (rationality, cost of mining software, decrease in block production rate for extra cycles spent on this logic). Feedback/improvements welcome.