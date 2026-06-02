Having today's slashing on ETH2, I want to mention that it is pretty trivial for a validator to create an internal filtering network proxy to drop double-proposals. 

All you need is to write a proxy server, that excepts proposals over JSON-RPC and drops the doubles using LevelDB as a proposal store.

Literally one day of work and one page of code that can potentially save you lots of money ...