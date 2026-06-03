Hello teams,

I have a couple questions to make sure zkVM teams support the Beam chain proposal as best as possible.

## Implementation

What languages will clients be built in. In our case at Lita/Valida, we can support C, Nim (through C), Rust. And we plan to add Go, WASM (for Javascript clients) and Zig support (seems to be a popular new language that Eth devs want to build in).

Are Nethermind and Teku/Besu team planning to build a Beam Client, will it be in C# and Java? What about LambdaClass and Elixir?

## Networking

What proof sizes are we targeting?

## Performance

What proving speed do we need? We plan to add some benchmarks of the current state transition function of Grandine, Lighthouse and Nimbus to get a baseline.

If block times become 4s, should the proof be aggregated over a whole "epoch"