At SKL we are interested in solving the proof of humanity problem now even if roughly, because Dapps cant work well without a solution. I think many other blockchains are interested in this problem.

Basically, for fast and cheap chains you need to be able to enforce that your registered users are humans, otherwise you will have too many bots and DoS.

Google, FB etc are solving this problem using either SMS or email verification, but it is

* first centralized
* and second blockchain is passive, so it cant send an email or SMS.

So here is a practical solution, which is probably the best you can do at the moment for billions of users. It is based on Gmail signing message headers with Google public key (DKIP signatures)

1. A user sends a short email from Gmail to a relaying party on Internet, that posts this email to a smart contract on ETH-compatible blockchain. The relaying party is simply a reposting service, does not have security relevance and could be the user herself.

2. The email includes user public ETH key.

3. A smart contract verifies Google-signed email headers and then posts email/public-key pair on-chain.

4. To be roughly human means to have your email/public-key on chain

5. Thats it! We are looking for people that want to help us impement this as opensource library.

6. Also looking for more privacy-preserving tweaks to this.