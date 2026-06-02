# 

Thanks to Jay and Zac for fun discussions about this.

## Intro

We had a lot of fun with ZKPs. And people think we are gonna have a lot of fun with FHE. I am optimistic about that. But I also think that it would be fun to do some stuff with ZKP + WE.

WE is witness encryption. Its like a zkp that you define a bunch of constraints/a program. But unlike ZKP instead of having a proof it reveals a secret to you.

Now i used to think WE was boring because you were not able to output dynamic things. But now i don’t believe that and i think you can output dynamic things with a fun hack. But before that we have to talk about ZKperp

## ZKperp

Perps are all the range at some time. But my trading friend said she didn’t want to trade on that because they were gonna know her position and she would get wrecked. By that i mean an on chain perp.

My other friend said that we can’t do it with ZKPs because of private state being leaked if we are able to slash.

And here is the first main trick

<first trick>

```
So you encrypt what ever leverage position you want to take, place your collateral  all in ZKPs. Then you setup a WE box that if you become under collateralized the WE can be opened an your secret gets revealed and you forget slashed
```

</first trick>

Okay so what is our WE program checking

1. The in a recent eth block the price of x = y
2. That block has been finalized by consensus
3. That your position is under collateralized in that situation

If all these things are true you should be slashed. And slashed you will be because your secret is your position and some kind of helper needed to slash you.

## Is this possible

Okay this seems like a fun idea. How practical is it to verify a ZKP in WE which is basically what you need to do here. Not too expensive https://eprint.iacr.org/2020/889.pdf https://eprint.iacr.org/2026/175.pdf

tl;dr
“we get 338 TB size”
“Overall, we conclude that this approach to witness encryption, while very
costly, is realistically implementable.”
" as our main witness encryption protocol scales as O(N 3)"
“sub-set sum”

## Voting

Okay this seems like a fun trick. You can do a zkp perp. that is a useful thing to be able to do. But its a narrow slice on functions. Ah but i think its more than this. Let me take the example of voting. Ah you say this is not going to work right because lets take the old program and re apply it.

1. Verify the eth state
2. Verify the votes were all put on chain
3. add them up.

Ah 3 is where we fail we can’t add them up because they are bigger are either in plain text and then who cares. Or they are encrypted and WE can’t add them.

Okay so lets just add stuff to the WE program how about

1. Verify the eth state
2. Get all the votes that were put on chain
3. For every vote, Decrypt it. Add them up
4. If Yes > No reveal secret

In this case secret = true. So its not really secret its just a true / false flag. But we could replace it with a signature if you want it to be verifiable maybe by a smart contact.

But this might not work. because WE says that before you have the satisfying witness its computation secure. But if you have a witness that satisfies it you might be able to go back and learn about the program that output it. So if it has a secret inside you might reveal that secret.

<second trick>

```
1. Verify the eth state 
2. Get all the votes that were put on chain
3. Homomorphically add up all the votes
4. The sum of homomorphically added votes where bigger than x
5. It decrypts it and checks x > quorum and if true returns 1 
```

</second trick>

The perceptive amount you will notice this suffers from the exact same problem as the first scheme. If i get a single evaluation i and i am able to get the secrets in teh program then i can find out what happened inside. In the zk perp example this is fine because we only reveal the output and after that there is nothing else to learn.

## One time program

So this + block chain gives you a kind of one time program that you can leverage. The big limitation is that we can’t be sure secrets are hidden after a single invocation. The original paper says that it can’t the AADP paper says that you can get a few evaluations and still not learn about what is going on inside. This seems like a fun thing to try and prove. It would unlock a lot of stuff.

## General checks on private state

Lets say you were trying to build a private smart contract ecosystem. You probably hit the limit that if something is private i can’t do checks on it. That is why zk perp is hard. Now you can do checks by doing this witness encrypted return some secret if its true and then do something in response.

That can be applied to a class of smart contract where if its x then do y.

Can it defeat my old foe of " you can’t make a private uniswap with just zkps" https://ethresear.ch/t/why-you-cant-build-a-private-uniswap-with-zkps/7754

The problem is that every time someone deposit we need to update the total balance of the pools. We can use our trick of just decrypt some secret. But it does not let us update the balance in the pools. Same problem as with voting and my second trick failing.

## Conclusion

We have something like private if / else loop that uses witness encryption. We can use that to make ZK perp which seems fun and useful. We can should try and prove that various WE schemes don’t leak info about the circuit given a satisfying witness.