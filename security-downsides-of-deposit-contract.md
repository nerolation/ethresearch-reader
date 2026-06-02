Here is the current version of the deposit contract 

https://github.com/ethereum/eth2.0-specs/blob/9467d492b173b8d55633a16cc734ae0a26c04cf7/deposit_contract/contracts/validator_registration.vy#L93

The question becomes, if the deposit contract needs to be modified in case a two-way bridge is implemented.

The first downside of the current implementation, is that money gets stuck in the contract forever.  There is no way to get it out.  Therefore, to move it back from ETH2 it will need to be printed again. This means that ETH1 will need to provide and unlimited money printing privileges to ETH2.  A hack of ETH2 will kill ETH1.

The second downside, is that mining rewards printed on the ETH2 network need to be accepted to unlimited extent on ETH1. This again leads to ETH1 having to fully rely on ETH2 security.  

A much more secure alternative in my view would be to print ETH2 mining rewards on ETH1 and modify the deposit contract in such a way that deposits could be withdrawn. 

In such a case the security of the ETH1 network would be fully protected and an attacker would not be able to compromise ETH1 through ETH2.