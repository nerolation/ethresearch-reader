Here is an early concept proposal  for a version of Plasma that can  run arbitrary smart contracts (this is along some of the exchanges in [this thread](https://ethresear.ch/t/plasma-cash-without-any-blockchain-at-all/1974/3)).  Ideas are welcome )

1.  SMART Plasma contract  (SPC) keeps a chain of Abstract State Multi Roots (ASMR) for each SMART Plasma operator. 

2. ASMR is an abstract sequence of numbers, which could be Merkle Roots, Merkle Mountain Ranges etc. 

3.  Users deploy smart contracts to Plasma chains, any smart contract framework can be used, as long as there is an ASMR for each smart contract.

4. When a Plasma operator inits the Plasma chain , she submits to the SPC the address of an operator-specific smart contract called abstract fraud proof verifier  (AFPV)

5.  The purpose of ASMR and AFPV is to encourage innovation - one can use all types of Merkle trees,  signatures etc. 

6.  For each Plasma block and for each smart contract, the Plasma operator submits an ASMR to the SPC

7.   In a typical scenario, for each transaction a Plasma operator signs a transaction proof and transmits it to all parties interested in a transaction. The parties interested in a transaction will only accept the transaction as finalized if they can verify the transaction proof against ASMR included in the main chain. Each party also will typically need to re-execute the smart contract state transitions for the corresponding Plasma block to make sure that the end state ASMR is correct.  A party can outsource this re-execution to other parties (may be in True-bit style).  Fraud-proofs for incorrect smart contract execution may also be True-bit style proofs (actually pretty much any fraud-proof framework is possible since AFPV is operator-specific.

8.  If a fraud proof is submitted and verified as correct, then the SPC  marks the Plasma operator as compromised.

9. Each SMART Plasma chain includes an ERC-20-style ETHClone smart contract that keeps ETH ownership of every user on the Plasma chain.  

10. A user can always submit a request to exit.  ETHClone tokens are first burned on the Plasma chain and then the user submits a burn proof to the Plasma contract on the main chain.   Each exit has a "pending exit" time window (say 1 day).

11. If a Plasma chain is marked as compromised, all pending exits initiated after the compromised ASMR are cancelled. All users have the right to exit according to token ownership corresponding to the state of the ETHClone smart contract immediately preceding the compromised ASMR.