## Intro

The way data gets its meaning defines the structure of the internet. Data is something that is infinitely make-up-able. You can just make up some data. “123aiab” is an example. Another is “Barry has 1 billion followers on twitter”. But what makes data meaningful is who its coming from. If twitter ways something about my followers on twitter that is much more meaningful.

“Data wants to be free, but it also wants to be expensive”

## TLS: The original sin

TLS is an encryption protocol that was developed in the early days of ebay mostly to allow for credit card numbers to be transferred over encrypted connection. Since then it has become the default browser encryption. Anything that you get over a https connection is over TLS.

An important design decision was that it had no private key. A shared key exists which means that the user is able to pretend that some data came from a server. They sign the data and it looks just as if the server had signed it.

This defined all interaction as being between users and servers. Any communication of this out side of this relationship was meaningless.

## How to make data attributable

One approach is to use TLS notary which uses an mpc to calculate the shared key such that the shared key is known to the server and to the user and notary jointly. The notary can know if a given data was signed by the server if it did not sign it. Because the user is not able to sign without the notary helping.

The draw back of this approach is that it costs a lot (bandwidth, time , complexity) to do TLS inside mpc. A simpler version is that the notary could hold the full shared key and the user does not hold any of it. The notary can still tell if something was signed by server if the notary did not sign it.

The big draw back of this approach is that the data of all requests is leaked to the server. For example in the use case that we care about the api key for various web API’s would be known by the notary. This seems fine because these api keys can be rate limited and easily expired after they have been used. The advantage is that there is no need for complex mpc protocols. Everything can happen outside crypto which means its possible to notarized text but also images and videos.

## data is portable

I can now access public API’s and get them notarized by the server. So a single person needs to access the data from eve online servers and then the notarized copies can be shared p2p. This drastically cutting the cost of serving the API. This also makes API much more scalable and trustworthy.

It also changes the topology of the internet. Allowing for much more complicated apps and removes the cost of making many API queries with being able to download authenticated data p2p.

## Conclusions

This is a simple way of making web2 data portable.

This is not a state root in the traditional sense where there is data that is hashed in a merkle tree. But in spirit it is the same a set of data that has some guarantee of being correct. In this current design that is an assumption that the notary is honest.

The end goal of this direction of work is to have the users or the server sign the data and that would be the notarization. That is not here yet so lets do this step to build the rest of the pieces.

Another approach is to use IO to be the notary and then there is no trust assumption.

In the appendix we show how this can be expanded into Tera bytes of data to be notarized. The limitation of notarizing the data is how much data the user is able to download. This opens the question of how do we organize , store and distribute all this data. Something something p2p something incentive something something something another post.

## Appendix

### Simple Architecture

It seams easy to fork requests.py

1. Replace the https part with a part that gets the notary to generate the shared key. 2. Make a way to decrypt data and the server would send in return.
2. Simple notarization algorithm

``` def notarized_data(x)
        if did_i_sign_it(x):
            print("I won't notarize this cos i signed it, So it didn't come from server")
        else:
            out = notarize(data)
            return(out)
```

Then notarizing data is as simple as importing a different requests into your python script.

Note: Actually reqests.py depends upon urllib3 for https so would have to fork that and change it.

### Example

Lets say we want to notarize some data for the twitter API

```
import requests

# Your credentials
BEARER_TOKEN = "YOUR_BEARER_TOKEN_HERE"
USERNAME = "TwitterDev"

# 1. Get the User ID
user_url = f"https://api.twitter.com/2/users/by/username/{USERNAME}"
user_headers = {"Authorization": f"Bearer {BEARER_TOKEN}"}
user_resp = requests.get(user_url, headers=user_headers)
user_id = user_resp.json()['data']['id']
print(f"User ID for {USERNAME} is {user_id}")

# 2. Get the User's Tweets
tweets_url = f"https://api.twitter.com/2/users/{user_id}/tweets"
tweets_params = {"max_results": 10}
tweets_resp = requests.get(tweets_url, headers=user_headers, params=tweets_params)

# 3. Print the Tweets
tweets = tweets_resp.json()
for tweet in tweets['data']:
    print(f"- {tweet['text']}")
```

We would need to replace requests with requests_notary and then the script should run just as before. We would probably need to allow the user to download the notarized signatures. Maybe we can include that as part of the returned json.

### optimistic decryption + notarizing

There is a strange nuance about when i say “signing” above. When i say signing I mean encryption / decryption. The shared key does not let you sign in the traditional sense. But if you can encrypt some data such that if you decrypt it with the shared key you get the original data that is proof that you have the shared key. That is proof that the encrypter had the shared key to encrypt it and proof the decrypter had the shared key to decrypt it. If either didn’t have the shared key the output would be randomness.

We abuse this fact to enable signing. But the limitation is for big data the notary has to upload, decrypt , sign and download that data. That just won’t work for big data like a youtube video. The notary would need to download that in order to be sure that it was actually signed by the server. They would then decrypt and notarize the data.

We can invert this and prevent the notary from having to download the response. At the cost of signing randomness during attacks. We depend on the fact that only someone who knows the shared key can decrypt the data to anything other than randomness. We

1. User ask the notary server to notarize an encrypted blob.
2. The notary checks if that is a blob that they encrypted. If its not they notarize it.
3. Then they publishes the shared key to the user. So the user can decrypt the data. If it decrypt to non randomness it came from the server. Because only the server could have encrypted it. Otherwise they get randomness

So basically we ask the user to commit to data and only after they have committed do we let them decrypt it.

There for the notary does not need to download the response in order to notarize. They can notarize optimistically and publish the shared key afterwards. As long as they are okay notarizing nonsense which seems okay in some contexts if you want to notarize big stuff. Like videos or Tera bytes of stuff.