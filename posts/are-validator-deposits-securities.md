Validators will profit from their deposits. The question is then whether validator deposits should be considered securities. The startup where I am working is building a p2p network where nodes will have deposits, so we have been researching this issue internally ... 

[Howey test]([https://en.wikipedia.org/wiki/SEC_v._W._J._Howey_Co.](https://en.wikipedia.org/wiki/SEC_v._W._J._Howey_Co.)) states that an investment is a security if

1. It is an investment of money
2. There is an expectation of profits from the investment
3. The investment of money is in a common enterprise
4. Any profit comes solely from the efforts of a promoter or third party

My take on this is that validator deposits should not be considered securities, since 4. is not satisfied - validators contribute efforts by running validator nodes. 

Some of the later court decisions seem provide an alternate definition to 4., where "solely" is replaced by "primarily". In other words,  if I deposit $1B with a validator, then some can argue that my efforts running the validator wll be insignificant vs. the profits I receive

As specified on page 19 of ["Howey Test Turns 64"](http://scholarship.law.wm.edu/cgi/viewcontent.cgi?article=1016&context=wmblr)
>
> The Supreme Court itself softened its stance and seemingly endorsed a
> more relaxed standard for the derivation of the expectation of profits by
> omitting the word “solely” from its explication of the Howey test in United
> Housing Foundation v. Forman,94 noting that the “touchstone is the
> presence of an investment in a common venture premised on a reasonable
> expectation of profits to be derived from the entrepreneurial or managerial
> efforts of others.
> 
> Lower courts have considered whether “solely” means “only” in their articulation of the Howey test, and some
> courts have eased the rigidity of the need to have the profits derived solely
> from the efforts of others by including profits that come “primarily,”
> “substantially,” or “predominantly” from the efforts of others.

I wonder if any legal or economics experts could comment on that. 

Note that other networks use alternative solutions.  For instance with Bitshares, my understanding is that owners of consensus nodes are paid a fixed amount ($70K/year), and do not have deposits. Since the payment is fixed and reasonably corresponds to the effort, then imho it is clearly not security ...