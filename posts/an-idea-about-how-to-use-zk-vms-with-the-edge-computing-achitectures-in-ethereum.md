
@CPerezz @oskarth, Violet, and Chiro had a presentation at the zk residency group for about the future verifiable computation researches, and mentioned that *"WASM does not have a gas model, so the computation is unbounded."*

So I'm just bringing up an idea here about how to use the gas model in the verifiable computational schemes.

This is a slide that I'm using that why we should contribute to the Ethereum scaling
![Untitled drawing|690x130](images/fbw5PO1gaq6tKwaYiQLVSmViaq3.png)
So one of the future scaling is something like the end-clients compute somthing on their devices and submiting a proof instead of letting other execution layer nodes to run all the computations.

In this scenario, we can have an Edge Computing Interface such as
```
execution(
	function,
	input vars,
	state refs,
	proof
) -> output vars: {\[key\]: value}
```
Then, the execution layer nodes updates the state by the `output vars`, and we can make the gas cost just depends on the length of the output vars.

Just a quick idea sharing :)