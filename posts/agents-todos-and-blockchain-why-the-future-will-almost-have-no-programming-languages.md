# 1.Intro 

For decades, software development revolved around programming languages such as C++, Python, Java, and many others. Today’s AI systems like ChatGPT or Claude follow the same paradigm: generate code to automate tasks.

This approach resembles **putting a steam engine on a horse carriage** . The power source has changed, but the architecture is the same.

LLMs can generate programs extremely well, but the fundamental abstraction of computing is still a **deterministic program** —a rigid sequence of instructions written in a programming language.

We argue that this abstraction will not survive the age of AI.

As we argue below, in the future, programming languages will either disappear entirely or move into a niche layer. Instead of writing programs, humans will interact with **agents** that have **personalities, memory, strategies, and objectives we call TODOs** .

---

# 2. The Fundamental Problem of Programs

Consider a simple example.

Alice wants to **dollar-cost average** into Unicorn Corp by buying 1,000 shares over the course of a month. A traditional solution might be a Python script:

* Each day the script executes a trade
* It buys a small portion of the total shares

This works perfectly until reality intervenes.

Suppose halfway through the month, a **black swan event** occurs: the founder of Unicorn Corp suddenly dies. The the investment thesis collapses.

But Alice’s Python script **keeps buying shares every day** . It continues executing the loop because it cannot interpret events or reassess objectives.

Now compare this to the case where Alice hires a **human broker** .

The broker also buys shares daily. But when the founder dies, the broker pauses trading and calls Alice:

> "The situation has changed. Should we stop buying?"

This illustrates a key weakness of traditional programs: they are **brittle, rigid, and context-blind** .

Human agents operate very differently. They constantly integrate new information and adjust behavior accordingly.

We are all used to running programs and dealing with their rigidity and brittleness. We do not have to do it anymore

---

# 3. From Programs to Agents

Instead of writing a rigid Python script, Alice could instead define a **TODO** :

> "Accumulate roughly 1,000 shares of Unicorn Corp over a month in a sensible, risk-aware way."

This description specifies a **sane goal** , not instructions.

An agent operating under this TODO would:

* observe market conditions
* remember past trades
* update its strategy dynamically
* pause or reassess when major events occur

The agent behaves more like a **human professional** than a deterministic script.

TODOs therefore represent **high-level descriptions of goals** , not explicit algorithms.

---

# 4. Flexibility Through TODOs

This paradigm also provides a level of flexibility that traditional programs struggle to achieve.

Suppose Alice begins her investment plan but **ten days into the month changes her mind** :

* She wants to **double the number of shares** purchased
* She also wants to **buy only on days when the price dips**

With a Python script, this change becomes very complicated.

Alice would need to:

1. Stop the running program
2. Modify the code
3. Ensure the new logic is compatible with past trades already written to the database
4. Restart the system safely

With TODOs the process is much simpler.

Alice simply **updates the TODO** :

> "Double the total shares and buy only on price dips."

The agent continues running and internally **adapts its strategy** while maintaining continuity with previous actions.

This is exactly how one would update instructions given to a human assistant.

---

# 5. The New Building Blocks for Computing

In this framework, the core abstractions of computing change.

Instead of programs written in programming languages, systems are built from four components:

## 5.1 Personalities

Persistent behavioral frameworks that define how agents reason, evaluate risk, and respond to events.

## 5.2 Memory

Structured records of observations, actions, and learned knowledge.

## 5.3 Strategies

Dynamic approaches used by the agent to accomplish objectives.

## 5.4  TODOs

High-level descriptions of goals that guide behavior.

Together these components create systems that are **adaptive rather than deterministic** .

---

# 6. Why Hierarchy Is Essential

These elements must be organized **hierarchically** .

Lower levels of the hierarchy change rapidly:

* individual actions
* tactical strategies
* short-term observations

Higher levels change much more slowly:

* long-term strategies
* TODO objectives
* core personality traits

This structure mirrors how human organizations and cognition work.

|Layer|Example|Rate of Change|
| --- | --- | --- |
|Actions|Execute trade|Seconds|
|Strategy|Adjust trading algorithm|Days|
|TODO|Investment objective|Weeks|
|Personality|Risk tolerance|Months or years|

The higher the level in the hierarchy, the **more valuable and stable the information becomes** .

---

# 7. Why Blockchain Matters

## 7.1 Controlling the highest level of hierarchy

This hierarchical structure naturally introduces a role for **blockchain systems** .

Humans cannot realistically supervise every decision made by autonomous agents. However, they can control the **highest-value layers of the hierarchy** .

Blockchain provides the ideal infrastructure for storing:

* high-level TODOs
* personality parameters
* strategic frameworks
* important memory checkpoints

Blockchains offer properties that are particularly valuable in this context:

* immutability
* transparency
* shared access between humans and AI agents

In this architecture, blockchain becomes a **communication layer between humans and autonomous agents** .

Humans modify high-level objectives and constraints, while agents autonomously execute lower-level actions.

## 7.2 Enforcing rules.

The second place for blockchain is to enforce rules for agents. Execution must be flexible, but rules need to be rigids. 

Ironically, smartcontracts  written in Solidity may be one of the few places where programming languages will remain as a way for humans to set rigid rules that agents can obey.  Since smartcontracts have tiny amounts of code, they can be reviewed by humans without need for AI.  As an example, a human can set spending limit for its AI agents using a smarcontract on blockchain.


---

# 8. Conclusion

The transition from programming languages to agents represents a fundamental shift in how software is built.

Just as graphical interfaces replaced command-line computing for most users, **agent-based systems may eventually replace traditional programming for many tasks** .

And when that happens, the fundamental unit of computing will no longer be a program.

It will be an **autonomous agent with a personality and a purpose** .