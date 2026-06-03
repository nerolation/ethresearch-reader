From the original Plasma MVP post:

[quote="vbuterin, post:1, topic:426"]
A Plasma block can be created in one of two ways. First, the operator of the Plasma chain can create blocks. Second, anyone can deposit any quantity of ETH into the chain, and when they do so the contract adds to the chain a block that contains exactly one transaction, creating a new UTXO with denomination equal to the amount that they deposit.
[/quote]

Can anyone explain why we have these two separate "types" of blocks ("regular" blocks with Plasma chain transactions and blocks with a single deposit transaction)? Why don't we simply include deposit transactions as part of the next "regular" Plasma block?

Also, I wonder how can a smart contract enforce the creation of these deposit blocks on a Plasma chain (how can a contract have control over an operator i.e. the blocks it creates)? In case I'm not being clear enough, I'm referring to this: 

[quote="vbuterin, post:1, topic:426"]
anyone can deposit any quantity of ETH into the chain, and when they do so the contract adds to the chain a block that contains exactly one transaction
[/quote]

UPDATE: After @ldct explained how this works on a technical level, I've described a potential problem with this design in the [comment bellow](https://ethresear.ch/t/why-do-we-have-two-types-of-blocks-in-plasma-mvp/3202/3), and I look forward to any comments. Thanks.