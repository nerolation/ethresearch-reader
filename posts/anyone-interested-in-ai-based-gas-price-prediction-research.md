At SKALE we have been recently facing pretty bad transaction submission problems to the main net, where transactions get stuck unpredictably even if the gas price is high.

It looks like miners routinely misbehave,  in a sense that they censor out transactions with a high gas price because of whatever optimizations their proprietary software does.  The problem is pretty bad because there are only a handful of mining pools.

We are trying to understand how to deal with it. One possibility is to get hold of the actual software that mining pools are using (I am not sure it is possible since it may be proprietary)

Another way to build an AI model that evaluates a transaction, pre-executes it in the EVM and, based on the data tries to predict whether it will get stuck or not.

I wonder if anyone else is interested in research like this, or have faced similar problems.