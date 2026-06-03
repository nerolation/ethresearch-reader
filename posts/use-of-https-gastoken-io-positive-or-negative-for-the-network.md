We are thinking about using https://gastoken.io/ for https://safe.gnosis.io/

https://safe.gnosis.io/ is a multisig wallet and in a way a implementation of account abstraction with the current possibilities. A user might sign the (meta) transaction. An external service can post the signed message to the contract. The contract will execute the transaction and refund the external service.

In the beginning we will offer that external service (eventually miners should just do it) and we are thinking about the use of gastoken.

I am wondering what the consequences are - here are my assumptions:

a) gas token become liquidly tradable
b) gas tokens will regularly used when gas costs spike

The consequence of a) should be that all blocks will be 100% full since that is always demand for transactions that mine gas tokens. The gas token price will basically establish a gas price floor. If you want to do an "actual" transaction you will always need to pay more than that floor. Then there will be a second number (the soft ceiling) where it starts to make sense to spend gas tokens. In a way that would introduce a flexible block gas limit. If demand for transactions are high it temporarily "bigger blocks" can be produced (block-gaslimit + refund from gas token burn)

So we can expect that overall gas prices will spike a bit smoother than seen historically and owning gas tokens will further reduce that risk. On the other hand it creates negative externalities - the full nodes have to deal with a lot of completely unnecessary smart contracts.


So my overall question is about the sentiment. Is it a flaw and should be forked away or is it a useful thing?