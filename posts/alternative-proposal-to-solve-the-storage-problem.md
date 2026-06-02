Here is an alternative proposal to the storage problem in lieu of storage rent:

0. EVM storage instructions are umodified as they are now.

1. Each full node accepting read requests registers its IP endpoint and deposits a standard stake.

2. Clients pay probabilistic payments for each full node read request.

3. Each read request has to be load balanced so that each registered node gets the same traffic.  The load balancing is done as follows:

  a) for each request, three nodes are pseudo-randomly selected based on the hash of read request

 b) the client decides to which of three nodes to make the probabilistic payment  based on which node replied first.

Thats it.  Each node get the same share of load balanced requests and becomes interested in upgrading its hardware and storage.  So we end up with 100 times more powerful nodes that can store 100 times more data.