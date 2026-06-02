What we realized recently at Skale Labs, is that if your app requires validators (a random group of nodes  that need interact with the blockchain and the outside world), then validators need to be written in Solidity.  Coding smart contracts in Solidity and validators in python does not make much sense.

Ideally  it has to be the same code base, and a generic framework which would operate in terms of messages sent both ways.

Essentially one needs a Client-side Solidity/EVM version similar to NodeJS for Javascript. 

I wonder if anyone else here had similar ideas ...