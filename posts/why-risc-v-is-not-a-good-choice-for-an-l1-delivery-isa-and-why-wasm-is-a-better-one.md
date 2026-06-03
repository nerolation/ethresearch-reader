# This Post in a Nutshell

This document expresses the view of Offchain Labs. It was written by Mario Alvarez, Matteo Campanelli, Tsahi Zidenberg and Daniel Lumi. We offer this guidance in our commitment to success of the Ethereum community.

### **Context**

Recently there has been discussion about **replacing EVM with RISC-V as the Instruction Set Architecture (ISA) for L1 Ethereum**. [This post by Vitalik on the Fellowship of Ethereum Magicians](https://ethereum-magicians.org/t/long-term-l1-execution-layer-proposal-replace-the-evm-with-risc-v/23617) summarizes many of the arguments made in favor of **transitioning to RISC-V**.

Vitalik argues that replacing the current ISA would substantially improve on two of the main limiting factors for Ethereum L1 scaling, namely:

* Keeping block production a competitive market

* Performance of ZK-EVM proving

### **Summary of our case**

We support these goals but question Vitalik’s implicit assumption that one ISA can optimally serve both ZK-proving and smart contract delivery. Since enshrining an ISA on L1 primarily affects how smart contracts are delivered to the chain, we should evaluate ISAs based on their suitability for general delivery and storage on chain, not proving alone.

We differentiate between several different roles an ISA can play in a blockchain context. In particular, we discuss the concept of a *delivery ISA (dISA)*, and the properties that make an ISA useful as a delivery ISA. Using these properties as a guide, we compare RISC-V and WASM in terms of their suitability as a dISA for Ethereum, and conclude that WASM is the better choice.

* RISC-V, as an open standard for hardware, is an impressive and influential technology. RISC-V was designed for simplicity and ease of implementation in hardware. However, there is no reason to expect that RISC-V-based ZK-VMs will be the ultimate *arrival point* of the evolution of ZK-VMs; more likely, they are just one step along the way.

* WASM was designed as a *hardware-independent* layer of abstraction that can run nearly as fast as native code on all common hardware. As an ISA, it offers properties such as type-safety and being instrumentation-friendly, which are highly desirable in the Ethereum setting. Choosing WASM will not sacrifice scaling today, and will help keep Ethereum flexible for the future.

**Organization:** The rest of this document works as follows. First, we’ll clarify what we mean by “L1 ISA” and lay out a framework for evaluating different ISAs as delivery/execution/proving formats for smart contracts. Then we’ll give some background on RISC-V and WASM before systematically comparing them across several key dimensions: SNARK-provability, executability, tooling compatibility, and—perhaps most importantly—future-proofing. Finally, we’ll wrap up by synthesizing these comparisons and explaining why we believe WASM is the better choice.

# Introduction

## What Do We Mean By “L1 ISA”?

When we talk about using WASM (or RISC-V) as “an ISA for Ethereum,” we’ll want to be precise about what we actually mean. A blockchain execution layer makes use of instruction-sets in different ways, and may use different ISAs for different purposes. For instance:

* When nodes execute a blockchain execution layer’s state-transition function (STF), what they are actually running is a series of machine-code or bytecode instructions that implement that STF. We’ll call the ISA used when executing a chain’s state-transition logic the **execution ISA**, or **eISA**. (This is the least relevant type of ISA for the purposes of this discussion).

* For blockchains that support SNARK proofs using a ZK-VM, that ZK-VM will operate on a specific ISA. We’ll call this the **proving ISA** or **pISA**.

* Blockchains that support user-uploaded smart contracts will require those contracts to be uploaded in a specific format. Usually, this takes the form of bytecode for some kind of virtual machine (for instance, EVM or MoveVM). When a blockchain uses an ISA in this way (as a format for delivering and deploying smart contract code), we’ll call this a **delivery ISA** or **dISA**.

Note that, in Vitalik’s post linked above, though most of the arguments around the advantages of RISC-V relate to ZK-proving (that is, its usefulness as a pISA), the actual proposal is to also use RISC-V as a dISA (i.e., smart contracts will be expressed in RISC-V). This is something we will address in more detail later.

In this document, we are going to more specifically make the argument that RISC-V is not a good choice for a *delivery ISA* for Ethereum, and that WASM is much better suited *for this purpose* (i.e., an ISA used to deploy smart contracts). In the rest of the text, when using the term *ISA*, we will try to be specific about the role of the ISA we are talking about (i.e., eISA vs pISA vs dISA).

## Desired Qualities of an L1 dISA

To ground our discussion, we will present a framework for thinking about what qualities we’d like an ideal choice of a dISA for L1 Ethereum to have. We will then compare how RISC-V and WASM perform along several of these dimensions; in doing so, we hope to concretely demonstrate why WASM offers better tradeoffs than RISC-V for this purpose.

1. **Efficient SNARK-Provability**

   SNARKs will play a major role in Ethereum’s future, so any L1 dISA must support efficient proof generation. But this doesn’t mean the dISA should be the same ISA used by ZK-VMs. The ZK proving landscape is changing rapidly—RISC-V is widely used today, yet there is no guarantee it will remain the best long-term option; meanwhile, newer WASM-based and custom ZK-optimized ISAs are already showing promise. The better strategy is to choose a dISA that can be reliably and efficiently compiled into whichever proving ISA becomes optimal in the future.

2. **Efficient Executability**

   Even in a future where EVM is SNARK-provable, many nodes, including nodes with constrained hardware resources, will wish to execute either the full blockchain or specific parts of contracts. Therefore, any new dISA should still allow for good execution speed on common hardware; that is, hardware that isn’t prohibitively specialized or expensive, for the sake of decentralization.

3. **Compatibility with Existing Tooling**

   Building an efficient optimizing compiler stack is a significant effort—especially when it comes to building a compiler we have to trust not to introduce bugs into our smart contracts. Therefore, a good choice of a dISA for L1 Ethereum will need an existing, trustworthy ecosystem of compilers and related tooling that it can draw on.

4. **Future-Proofing and Long-Term Suitability**

   Replacing (or even significantly changing!) the dISA for L1 Ethereum is no small task. Multiple attempts have been made to do this before, including most recently EOF. Though these attempts were unsuccessful, the amount of time and energy invested in them shows the scale of effort that would be needed to bring about the switch from EVM to any other dISA. If the community is going to expend so much energy on migrating to a new dISA, we want to be quite sure that the new target will not just be a good choice *today* but will remain so *for years to come*—else, the cost of switching is unlikely to be worth it.

Some other properties deserve mention. Although we won’t focus on them as much in this document, they are also important and also represent areas in which WASM has advantages over RISC-V:

* **Readability**

  Readability is not a concern for most ISA designers. However, it should be one for a blockchain dISA. Blockchain engineers read and manipulate compiled-ISA code much more then most software engineers, both for security concerns and for gas optimization. Many important pieces of contracts are today written or verified directly in EVM. Thanks to its structured control-flow and use of per-function locals, WASM is easier to comprehend and reason about than hardware-based ISAs.

* **Safety and Isolation**

  Public L1s are a highly adversarial environment. In general, smart contract authors should not need to trust each other, node operators should not need to trust smart contract authors, and neither should need to trust their inputs. It is much easier to keep a separation between contracts and avoid interference between data and code, when working with a dISA that has built-in support to enable isolation. WASM has this capability by design; RISC-V does not. ([This page in the WASM documentation](https://webassembly.org/docs/security/) has more information on how WASM builds in support for safety and isolation.)

# Some Background on RISC-V and WASM

RISC stands for Reduced Instruction Set Computer. RISC-V is an ISA designed for simple hardware microprocessors. RISC-V is very minimal, has a low opcode count, and is free and open. It is supported by common embedded-leaning compilers (most notably: rust, llvm, gcc). Because of RISC-V’s open licensing, RISC-V is a popular target for research projects, including new extensions, variants, and implementation. These properties have helped make it the *de facto* standard ISA used for general-purpose ZK proving today. However, it’s important to remember RISC-V was never designed to be efficient for ZK-proving. It was designed to be implemented by small hardware microprocessors.

WASM stands for Web ASseMbly. It was initially designed to be used as a software-implemented virtual machine inside web browsers, as high performance javascript alternative. As a design goal, WebAssembly aims to allow cross-platform execution at near-native speed and in a secure, encapsulated environment. It makes few assumptions about the specifics of the underlying hardware.

Commonly, WASM code will not be executed or interpreted as-is on hardware. Instead it will be further compiled (transpiled) to the ISA supported by the target machine’s hardware, and that second compilation will make sure it utilizes the machine’s hardware resources appropriately. As a WASM design goal, the overhead of going from source-code→WASM→native over the more direct source-code→native should be kept to a minimum. WASM tries to keep all hardware-specific optimization opportunities available to the next phases of compilation, which is aware of the specifics of the target system’s hardware.

WASM uses a stack for passing values into and out of operations and functions, but it is not a really stack-based machine. This is because WASM also has access to local variables, which are used in WASM to store data that is relevant to more then one expression. Local variables allow easy compilation to register-based machines, without committing to hardware details like number of registers.

# Efficient SNARK-Provability

As mentioned above, Vitalik’s argument for using RISC-V as a dISA for L1 Ethereum rests primarily on the availability of efficient ZK-VMs that use RISC-V as an ISA (e.g. Succinct SP1, RISC0, etc). There is a natural appeal to using a dISA that directly supports efficient SNARK proofs, since the availability of such proofs provides a natural path to ZK-proving the smart contracts implemented in that dISA. For now, though, we will focus on two points:

1. RISC-V-based ZK-VMs are not guaranteed to be the best choice in the long run

2. Regardless of what the long-run solution for ZK-VM pISAs looks like, we don’t need our dISA to match the pISA, as long as the dISA can be efficiently compiled into the necessary pISA

### RISC-V and the Future of ZK-VMs

While the current generation of RISC-V-based ZK-VMs is quite impressive, it is far from obvious that RISC-V will continue to be the winner in the long term. RISC-V does offer several advantages for ZK-proving such as a limited Instruction set, but at the end of the day, RISC-V was designed to optimize for hardware-related metrics. There is no reason to expect that an architecture optimized around these concerns should also be the *best* for SNARK proving—especially in the long term.

While RISC-V may appear to be the winner today, it is not clear that RISC-V-based ZK-VMs represent the “end of history” when it comes to ISAs with support for efficient ZK proofs. It’s worth keeping in mind how young the field of ZK-VMs is: RISC Zero [released the first production grade zkVM only in 2022](https://risczero.com/blog/announce), and commercially viable real-time mainnet EVM proving [was only just achieved earlier this year by Succinct](https://blog.succinct.xyz/sp1-hypercube/).

The field of ZK-VMs continues to undergo significant changes. For instance, recently several ZK-VMs have shifted from a 32-bit version of RISC-V to a 64-bit version of RISC-V. Suppose we had enshrined 32-bit RISC-V on L1 a year ago—we would be left in a situation where we would either need to change the dISA for Ethereum *again*, or (more likely) the enshrining of the 32-bit variant would inhibit the development and adoption of 64-bit RISC-V-based ZK-VMs, despite their advantages. This is just an example of how it is important to stay forward-compatible, and how WASM would support portability.

There are also reasons to take seriously the idea that non-RISC-V ISAs used as a pISA, such as WASM, may have inherent advantages over RISC-V when it comes to ZK-proving. For instance, Ligero’s Ligetron (a WASM-based ZK-VM) [is able to take advantage of WASM’s structured nature for memory efficiency](https://ieeexplore.ieee.org/abstract/document/10646776). This type of structure is lost in translation when transpiling to a lower-level and hardware-optimized ISA like RISC-V; this suggests that a RISC-V-based ZK-VM may not be able to take advantage of this promising class of techniques.

### The dISA Can Be Compiled Into a pISA

The more relevant point here is that, *when choosing a dISA for L1 Ethereum, we should not care so much whether there is a ZK-VM that directly supports the dISA*. This is, after all, only one way to achieve SNARK proofs for smart contracts expressed in that dISA. Another approach is to compile (or transpile) the dISA into a *different* ISA that *does* have support for efficient SNARK proof generation (that is, a pISA that is distinct from the dISA).

This is not just a theoretical possibility, but something that Offchain Labs is actively building as part of our collaboration with Succinct. By compiling WASM code into RISC-V code, we are able to ZK-prove not only the core Arbitrum STF, but also user-supplied [Stylus](https://docs.arbitrum.io/stylus/gentle-introduction) smart contracts written in WASM (as a dISA). While this is still at the prototype stage, we have de-risked this to the point where we know it is possible (including both proving the compilation of the contract from dISA to pISA, and proving the execution over the pISA). To repeat, *we can ZK-prove real-world blocks **today** in a blockchain (Arbitrum) that uses WASM as a dISA, by using a RISC-V-based ZK-VM as a backend*. This concretely shows that our distinction between dISA and pISA, our insistence that these need not be the same ISA, and has tangible implications for the design of SNARK proof systems for blockchains.

The idea of standardizing around a single intermediate abstraction layer, which is used as the interface between a wide variety of higher and lower-level parts of a system is sometimes referred to as the **[hourglass model](https://web.eecs.utk.edu/~mbeck/OnTheHourglassModel.pdf)**. Perhaps the best example of such an architecture is the Internet networking stack: a variety of applications are built on top of the Internet, making use of different transport protocols (TCP, UDP, etc), all of which are ultimately expressed as packets in Internet Protocol (IP). In turn, these packets are sent through a variety of physical link protocols, such as Ethernet. Applications don’t need to know about the details of link protocols, and link protocols don’t need to know about the details of applications: this relationship is intermediated by IP.

We think WASM can be a sort of Internet Protocol for smart contracts, serving as an ideal intermediate layer between the diverse source-languages in which smart contracts are written and the diverse backends used to execute and prove smart contracts. By separating these concerns, WASM as a dISA can allow smart contract programming, proving, and execution to evolve freely, rather than constraining each other.

# Efficient Executability

Choosing a dISA based on what currently is (or is perceived to be) the best ISA for ZK-proving might be optimizing for the wrong metric, for yet another reason: proving is not everything. Nodes today execute the chain to keep up with all required state and on-chain events. Even if keeping up with the chain can be achieved in a different manner (e.g. using ZK-proofs and state-updates), chain users issue many more `eth_call`s and gas estimations than they issue on-chain transactions. Responding to `eth_call` and gas-estimation requests from users is thus a significant part of the job of an RPC node, and (by definition) requires executing smart contracts expressed in Ethereum’s dISA. While these workflows are horizontally scalable, *the cost of responding to these requests still needs to be borne by someone, and should be considered part of the overall cost of running Ethereum.*

Performance of ZK proving is, of course, important. However, we do not anticipate proving costs as the bottleneck in the medium and long term for Ethereum. At the current gas limit, real time proving currently only costs [on median \~$0.025 per block](https://ethproofs.org/). Even if L1 were to require multiple ZK proofs per block, this cost would be minimal compared to the gas fees and MEV a builder could receive from a block. The cost of generating ZK-proofs have gone down by orders of magnitude in a couple of years, with no major anticipated blocker for continued improvement. In other words, optimizing exclusively for prover efficiency is likely counterproductive. Execution is another important cost to running Ethereum, and should not be ignored.

RISC-V is designed to be executed efficiently in hardware. However, very few Ethereum nodes are actually running on CPUs supporting RISC-V. In order for such non-RISC-V nodes to execute smart contracts expressed in RISC-V, they will need to emulate it, or else compile it to their machine’s native eISA.

Separating execution from proving with a portable ISA like WASM would give the best of both worlds. This is what’s done in Arbitrum, where the deployed *WASM is executed as native ARM or AMD code, which allows Stylus compute to be very cheap without requiring high-spec CPUs for execution.*

# Compatibility with Existing Tooling

One of RISC-V’s genuine strengths is its robust support from mainstream compiler toolchains. Major compilers like LLVM and GCC have mature RISC-V backends, which enables developers to compile code written in languages like C, C++, and Rust directly to RISC-V. This extensive compiler support was a significant factor in RISC-V’s rapid adoption by ZK-VM projects—teams could leverage existing, battle-tested compilation infrastructure rather than building everything from scratch.

However, WASM enjoys equally strong (if not stronger) compiler support. The same major compiler toolchains that support RISC-V also have mature, well-maintained WASM backends. LLVM, in particular, has excellent WASM support that’s actively maintained and optimized. Beyond traditional compiler infrastructure, WASM benefits from being natively supported across virtually all modern web browsers and JavaScript runtimes, representing billions of deployed execution environments. This ubiquity means WASM tooling has been tested, hardened, and optimized at a scale that few other ISAs can match. For blockchain developers, this translates to access to a rich ecosystem of debuggers, profilers, optimizers, and other development tools that have been refined through years of production use across countless applications.

A mature compiler ecosystem is clearly a desirable feature, but may not be a necessary one. It is conceivable that the Ethereum community might be willing to trade off this feature against others—for example choosing a custom ISA that is ZK-optimized, thus offering even better performance characteristics for proving. This would not change the core discussion: the fundamental qualities we’ve outlined for a good dISA (future-proofing, safety, isolation, instrumentability, and efficient executability across diverse hardware) would remain essential criteria. WASM would still score exceptionally well on these dimensions, while offering the additional advantages of mature tooling.

# Future-Proofing and Safety

Given the significant effort required to replace Ethereum’s dISA, any transition should be future-proof, that is it should be made with long-term sustainability firmly in mind.

The first level of future-proofing was discussed earlier, and is reached by distinguishing between a pISA and dISA. We envision a future for Ethereum where multiple competing provers use multiple competing pISAs, each with different properties and design choices, but all proving the same singular canonical dISA.

WASM allows support for even more future scenarios, because it is structured and validated. For example, assume one pISA provides a special circuit for the action: “multiply `uint64` by `5`”, and wishes to modify anywhere in the code where “multiply by constant” is using the constant `5` to instead call this new specific opcode.

Doing something like this using a dISA such as RISC-V (or most other machine-oriented ISAs), for arbitrary code deployed as smart contracts, can be quite challenging. Jumps in RISC-V are either to exact destinations or offsets in code (relative to the current program counter). In any case, they inherently depend on exact encoding and code size of the program being executed. If any static tool wishes to replace any part of a function with something that does not have the same exact encoded length, it will require finding all relevant jumps in the code and modifying their jump offset. In fact, the situation is even worse as it is possible for RISC-V jump destination to be the result of arbitrary computation.

Consider now the same scenario in WASM. Here there are no arbitrary `jump` or `goto` statements; only conditionals, loops, and functions. All jumps are either calling functions by index, choosing between variants (if-else), looping or breaking away from loops. Jumps do not change when changing encoding or size of the code.

In addition, WASM code can be *validated*. Valid WASM has a number of desirable properties:

* It can only read from the stack the arguments that exist on top of the stack when it’s called, and only the number of arguments it is supposed to.

* It cannot access undeclared local or global variables. Similarly, it cannot access local variables of any other function.

* It is type-safe, ensuring that input and output types for each function match what is expected.

Crucially, validation (checking these properties) can be done in time linear to the length of the WASM code being validated. This is only possible because of the design of WASM; checking these properties on RISCV machine-code (or machine-code from any other conventional ISA) in an automated, efficient way, would be very difficult.

The combination between structure and validity of WASM code allows analysis and even modification of the code with many degrees of freedom. In the above example, we could find anywhere in the WASM code where an `i64.const 5` opcode is followed by an `i64.mult`, delete the two opcodes and introduce the special new opcode instead of them. The new opcode could be shorter or longer then the previous two, and even go as far as calling special functions without affecting any of the surrounding code.

To demonstrate the value of a structured ISA in a blockchain setting, we can examine some of the ways in which Arbitrum takes advantage of WASM’s structured nature:

* Our optimistic framework, Arbitrator, uses WAVM as its pISA (yes, even optimistic provers can have a pISA!). WAVM is closely based on WASM (there are a few differences which don’t really matter here). Arbitrator accepts WASM code as input, and applies a number of transformations to it. WAVM encodes instructions differently from WASM, and some WASM instructions are implemented by multiple WAVM opcodes. However, since WASM does not depend on location, encoding, or size of any piece of code, the translation from WASM to WAVM is simple, quick, and deterministic.

* WASM’s structured nature is a core part of how we safely instrument user-supplied WASM smart contracts (Stylus) with gas accounting to allow them to run safely on-chain (see “compatibility with existing tooling”)

The same properties that make WASM future proof also make it easier to audit, by man or machine. The structure and validity of WASM means that, for example, no input can ever find itself being turned into executable code, and that code that reads a local variable can never be made to read from memory or from a different function. This will increase the safety of both smart-contracts and of the system as a whole, while still allowing us to take advantage of future innovations in ZK-proving (as described above).

# Conclusion

In this document, we set forth the idea that a blockchain might use many different ISAs for different purposes (proving, delivery, execution). When Vitalik and others discuss enshrining RISC-V as the new ISA for L1 Ethereum, they are arguing (in our terms) that RISC-V, used as a common pISA, is an ideal candidate also for the dISA. However, as we’ve discussed above, *there is no reason the pISA and dISA have to be the same*. We discussed how this substantially reframes the conversation.

For proving ISAs, the space of ZK-VMs is evolving rapidly, and it is very likely too early to know what pISA is best suited to carry out proving in L1 Ethereum. The Ethereum community should choose a dISA that is flexible, one that is compatible with multiple pISAs. WASM is an ideal candidate for this.

We believe and have argued above that, along a variety of relevant dimensions, WASM is better-suited than RISC-V for the delivery of smart contracts. WASM brings to the table powerful safety, isolation, and instrumentation features; strong compiler and toolchain support; efficient execution (*and* proving); and, perhaps most importantly, it is flexible enough to be future-proof in the uncertain and rapidly-changing environment of blockchain execution and proving. It will be far from being a liability for SNARK proving.

We are excited that the community cares so passionately about evolving the L1 execution layer. Just as the RISC-V advocates do, we believe that, if Ethereum is to live up to its promises of enabling new kinds of trust relationships and building a new, more accessible financial substrate, it’s necessary to move beyond EVM as Ethereum’s sole supported ISA. At this important juncture in the evolution of Ethereum, we hope that the arguments we’ve made here can help lead to more future-driven decision-making, and thus to a better L1 execution layer for years to come.