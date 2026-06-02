Our of our engineers recently measured bare-bones EVM performance both for JIT and not JIT  for transactions that did not include state changes (so this is essentially performance of bytecode interpretation).

It was 20,000 TPS without JIT and 50,000 TPS JIT for simple transaction (Fibonnachi number calculation)

We are currently measuring TPS for transactions that involve state transitions. It looks that state transitions take much longer than math for typical transactions. 

Does this sound sane ?)