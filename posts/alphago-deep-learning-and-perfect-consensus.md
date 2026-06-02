I am really interested to try AI techniques used by Google's AlphaGo to design consensus algorithms which would be dramatically better than existing things such as PBFT.

Essentially AlphaGo is an incredibly strong Go player that was created by having two deep learning networks to play each other for long time (something that is called deep adversarial reinforcement learning).

What I am interested in doing, is to reformulate consensus as a game.   Each node is a participant, there are 2/3   good guys and  1/3 bad guys. Good guys win when an identical block is committed on each good node. Bad guys win when two good guys commit non-identical blocks, or when good guys fail to commit any block after a certain number of message rounds.  Each node plays by sending and receiving messages to other nodes and committing blocks. 

Then each node (bad and good) has a neural network on it, and neural networks play against each other and learn.  As both the good and the bad network constantly improve, at some point they become supersmart (like Googe AlphaGo which can beat any human player)

What you get as a result is a "good node" neural network, that is super smart at reaching consensus in presence of bad guys.

I have a suspicion that if AlphaGo-quality network is applied to consensus, for large number of nodes it could be millions of times more effective than things like PBFT ...