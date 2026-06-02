I have started recently reading Eliezer Yudkowsky's new book _[Inadequate Equilibria](https://equilibriabook.com/)_, and one of the topics brought up in the first chapter is the question of in what cases is the efficient market hypothesis less likely to hold well. One major answer that is brought up is: markets are much more inefficient if it is not feasible to short.

I quote:

> There was recently a startup called Color Labs, aka Color.com, whose putative purpose was to
let people share photos with their friends and see other photos that had been taken nearby. They closed $41 million in funding, including $20 million from the prestigious Sequoia Capital. When the news of their funding broke, practically everyone on the online Hacker News forum was rolling their eyes and predicting failure. It seemed like a nitwit me-too idea to me too.
> 
> And then, yes, Color Labs failed and the 20-person team sold themselves to Apple for $7 million and the venture capitalists didn’t make back their money. And yes, it sounds to me like the
prestigious Sequoia Capital bought into the wrong startup. If that’s all true, it’s not a coincidence that neither I nor any of the other onlookers could make money on our advance prediction. The startup equity market was inefficient (a price underwent a predictable decline), but it wasn’t exploitable. There was no way to make a profit just by predicting that Sequoia had overpaid for the stock it bought.

Also:

> Though beware that even in a stock market, some stocks are harder to short than
others—like stocks that have just IPOed. Drechsler and Drechsler found that creat-
ing a broad market fund of only assets that are easy to short in recent years would have
produced 5% higher returns (!) than index funds that don’t kick out hard-to-short as-
sets (https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2387099). Unfortunately, I
don’t know of any index fund that actually tracks this strategy, or it’s what I’d own as
my main financial asset.

And regarding inefficiency of the housing market:

> Robert Shiller (https://www.nytimes.com/2015/07/26/upshot/the-housing-market-still-isnt-rational.html) cites Edward Miller (http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.667.5934&rep=rep1&type=pdf) as having observed in 1977 that efficiency requires short sales, and either Shiller or Miller observes that houses can’t be shorted.

To those of us in the crypto space, this strikes close to home. We see coins whose market caps reach billions despite the professional crypto community pointing out scams, crazy technical schemes, insecure hash functions, underdeveloped projects, and more, and there really isn't a good way to express these opinions in the market. Adding shorting markets is super-hard for a few reasons. First of all, most exchanges don't support it, and even those that do often only support it for mainstream reputable cryptocurrencies. Second, cryptocurrency prices are absurdly volatile, so there's a high risk anyone shorting will suffer a liquidation event.

So can we try to do better by adding good shorting mechanisms? One comment I can immediately make is that even if cryptos are super-volatile, they are less volatile against _each other_ than they are against fiat, so markets that allow shorting [random possibly untrustworthy token] / [BTC or ETH] could work somewhat better. But high crypto-to-crypto volatility still remains.

There are three real solutions to the remaining hyper-volatility that I can see:

1. Require super-high capital inefficiency (eg. 30 ETH deposit for each 1 ETH that you short)
2. Support only partial shorting, where for example you lose 1 ETH every time the price of [random possibly untrustworthy token] rises 2x, but up to a maximum of 8x. People buying [random possibly untrustworthy token] could still want to buy the original if they're hoping for gains above the 8x, but if they're just hoping for a quick 2-3x gain then they'd get better luck betting in the shorting market, and shorters would be willing to pay some modest premium (ie. the average token they short would need to fall by at least, say, 1% per month for them to make a return).
3. Shared collateral. You would put down 80 ETH to be able to short 10 different tokens (ie. only 8x collateral requirements), and a liquidation event would only happen if the sum of all 10 returns reaches 80. This is the equivalent to the partial solution that the housing market already has, which is that you can short REIT shares.

Any other ideas that could help here?