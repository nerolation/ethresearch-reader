I am thinking about a pretty interesting idea where the validators that compose a sidechain would need
to provide capital enough to cover transfers for a month - a sidechain like this would be fully custodial.

Every month one would have to go back to the main chain, so it is a bit of a cross of a sidechain and a payment channel. 

In other words, if the chain transfers $1M a month,  the validators would need to deposit $1M total. Each payee would need to specify how much money maximum the payee expects to receive in this month, and each payor would need to specify how much money the payor expects to pay maximum.

At the start of the month the payors would deposit money into channels connected to the sidechain, and the validators would deposit money into channels connected to payees.   The amounts would match, so if payors deposit $1M, the validators would need to deposit $1M too.  The capital lockup fees would be incorporated into fees paid by payees and payors. 

Once a payment is included in the sidechain, the ERC-20 balance is signed by a BLS signature of validators. The payee can then use the BLS signature to receive the amount from the main net.


Another way to see it, is a sidechain becomes a decentralized lightning node, and everyone connects to this single node.   So instead of having a lightning network of many nodes, it is just a single hub everyone connects to, but the hub is running on a sidechain.

In this system, the payees and payors can never lose money, if the chain is compromised then the party that loses money is the validators.  So the chain is non custodial.