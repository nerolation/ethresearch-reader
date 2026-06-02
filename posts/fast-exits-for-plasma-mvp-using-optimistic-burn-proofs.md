There was a discussion of burn proofs on Plasma MVP thread. 
Essentially a burn proof means that the user burns an UTXO on the Plasma chain and submit a proof to the Plasma smart contract (PSC). Some people do not like burn proofs because of data availability concerns (the Plasma operator may withhold the proof).

How about making burn proofs optimistic? This means, that if a user burns an UTXO on the Plasma chain and provides a burn proof to the PSC the main chain, the user can exit immediately without having to wait.  

If the user does not have a  burn proof the user can fall back on Plasma default mechanism for exits. 

This seems to address the availability issue people raised regarding burn proofs.