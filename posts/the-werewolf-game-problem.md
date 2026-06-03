# Werewolf game problem

During EF SBC workshop, I, @weijiekoh , Yutaro, and Kendrick tried to find a way to implement the werewolf game on Ethereum. It is pretty complex to use only semaphore and maci, we need more ideas. Please leave some comments here if you have any idea on this.

## Game rule

Please see the details of the werewolf game [here](https://en.wikipedia.org/wiki/Werewolf_(social_deduction_game))

## Constraints

1. Smart contract is the game master for the werewolf game.
2. 9 players participate in the game
3. Smart contract designates the 2 werewolves among the players.
4. Every player knows that they are a villager or a werewolf.
5. **Werewolves can collude. (Werewolves can know each other.)**
6. **Villagers cannot collude. (Villagers can't know who is a werewolf and who is a villager at all).**
7. Werewolves pick someone to kill during the night using a secret voting.
8. Everyone picks someone to kill during the day using a public voting.
9. Final survivor's party wins.