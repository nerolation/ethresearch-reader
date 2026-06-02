Here is an interesting proposal how many poor people can pull money together to create  a decentralized Casper validator:

1. 100 users contribute 15 ETH each to a "Decentralized Validator Smart Contract". The total is 1500 ETH, which is enough to create a single Casper validator.

2. [ECDSA threshold signatures](https://eprint.iacr.org/2016/013.pdf) are used to split a "Validator ECDSA Key" into 100 pieces.   Each key piece belongs to a single poor validator.  The resulting signature is indistinguishable to from a "real" ECDSA signature.

3. The threshold signature requires a majority of poor validators to sign 

4.  Since the signature is indistinguishable from a real ECDSA signature,  there will be no way for the Casper smart contract to block the "Decentralized Validator"

5. For each Casper epoch poor validators agree on the Casper checkpoint link to sign.   Then they do the threshold signature protocol  and post the signed checkpoint to the Casper smart contract. The Casper smart contract thinks it is a single validator and pays out the bounties.

6. The bounties are split among participants.

7. Note that the entire scheme can be implemented in an anonymous decentralized way using an ETH smart contract.

The question is then whether such decentralized validators should be considered good or bad :smiling_imp::smiling_imp::smiling_imp:?  Since to create a threshold signature one needs a majority of validators to agree, the "Decentralized Validator" may be more secure than a regular one ...