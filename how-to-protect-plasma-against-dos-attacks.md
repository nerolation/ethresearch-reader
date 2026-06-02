This is a DoS scenario that came up recently in conversation with a developer that thinks about using Plasma. He brought up the scenario described below.

I do not think it has been discussed in detail in existing Plasma documentation so it is worth discussing it here

The scenario is as follows:

1. A successful ecommerce vendor (e.g. a decentralized ebay) runs a Plasma micropayments chain with 100 million users and $1B in deposits.

2.  Eve wants to do a  DoS attack on the vendor

3. Eve deposits $1 into the Plasma chain and spends all of it.

4. Eve intentionally attempts  to pull out the $1 she spent, triggering fraud exits.

5. The entire 100M users rush to exit,  pulling $1B in deposits and paying millions of dollars in ETH fees.


The existing Plasma MVP explanations seem to suggest that if one user does a bad thing, then all users need to exit, which seems to enable the DoS attack described above. Is this really the case?  Must all users exit? 

If not, I think the existing Plasma tutorials and docs need to be modified, since the docs seem to suggest  the "all out" strategy as the must.