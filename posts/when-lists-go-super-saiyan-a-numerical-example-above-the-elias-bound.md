![](images/dcRpnjOWHPBM7Ey4JgjbPiFhQGa.png)

Driven by the Ethereum community’s [Proximity Prize](https://proximityprize.org/) and what has unofficially become known as **“Proxember”**, a series of spectacular papers has been poking at the *“up to capacity”* list-decoding conjecture from the celebrated **[Proximity Gaps for Reed–Solomon Codes](https://eprint.iacr.org/2020/654)**. The first salvo came from [Diamond–Angus](https://eprint.iacr.org/2025/2010.pdf), soon followed by work of [Crites–Stewart](https://eprint.iacr.org/2025/2046.pdf), all converging on the same message: something is badly wrong with the folklore belief that Reed–Solomon codes can be list-decoded all the way up to $(1-\rho)$.

**This post is not about proving anything new.** Its only goal is to give a small, fully reproducible **numerical example** that makes the existing theory feel concrete. In the spirit of Crites–Stewart’s approach, I take a toy Reed–Solomon code, choose parameters that lie strictly between the trivial interpolation threshold and the Elias list-decoding capacity coming from the [classic Elias bound](https://dspace.mit.edu/handle/1721.1/4484), and show that the list size already blows up to dozens of codewords. Their work gives a more constructive and general treatment of list-size explosion above this bound; here I’m merely instantiating the same phenomenon in a tiny, screen-sized example that you can reproduce with a few lines of Python.

## The “Up to Capacity” List-Decoding Conjecture

Before diving into the numbers, it’s worth stating the conjecture everyone has been poking at.

We work with a Reed–Solomon (RS) code of length $n$, dimension $k$, over a finite field $\mathbb{F}_q$. The **rate** is $\rho = \frac{k}{n}$,
and each codeword is the evaluation of a degree-<$k$ polynomial on some evaluation set of size $n$.

A code $C \subseteq \mathbb{F}_q^n$ is said to be **$(\delta, L)$-list decodable** if for *every* received word $y \in \mathbb{F}_q^n$, the Hamming ball of radius $\delta n$ around $y$ contains at most $L$ codewords:
$$
\bigl| \{ c \in C : \Delta(c, y) \le \delta n \} \bigr| \le L.
$$
Here $\delta$ is the tolerated **error fraction**, and $L$ is the **list size**. Classical unique decoding corresponds to the case \(L = 1\).

The **“up to capacity” list-decoding conjecture** (as it appears in *Proximity Gaps for Reed–Solomon Codes*) can be phrased informally as follows:

> For every rate $0 < \rho < 1$ and every $\eta > 0$, every Reed–Solomon code of rate $\rho$ is $(\delta, \mathrm{poly}(1/\eta))$-list decodable for all
> $$
> \delta \le 1 - \rho - \eta.
> $$

In words:

- A code of rate $\rho$ has “room” for a fraction $1-\rho$ of errors.
- The conjecture asserts that RS codes can be efficiently list-decoded from **almost** that many errors (up to a small slack $\eta$), with only a **polynomially bounded** list size.
- This is why people summarized it as “RS codes are list-decodable **up to capacity**,” implicitly treating “capacity” as the $1-\rho$ line.

What makes this conjecture so tantalizing is that it matches a very simple heuristic: if you compress your data by a factor $\rho$, it feels “morally right” that you should be able to survive up to $1-\rho$ noise. The whole twist of Proxember is that once you compare this folklore picture with the **Elias list-decoding capacity** (the curve $\rho = 1 - H_q(\delta)$), you discover that this “up to capacity” conjecture is actually asking for too much, and the list sizes are forced to explode.

## What Crites–Stewart Do in Section 3.1

The starting point in Crites–Stewart is the classical **list-decoding capacity theorem** of Elias (as presented e.g. in Guruswami–Rudra–Sudan):

> Let $q \ge 2$, $0 \le \delta < 1 - 1/q$, and let $\eta > 0$. For all sufficiently large block lengths $n$:
> 1. If $\rho \le 1 - H_q(\delta) - \eta$, then there exists a $(\delta, O(1/\eta))$-list decodable code.
> 2. If $\rho \ge 1 - H_q(\delta) + \eta$, then every $(\delta, L)$-list decodable code has
>    $$
>    L \ge q^{\Omega(\eta n)}.
>    $$
> In particular, the list-decoding **capacity** is the curve $\rho = 1 - H_q(\delta)$, where $H_q(\delta)$ is the $q$-ary entropy function.

Section 3.1 then does three key things:

1. **Quantifies the gap** between $\delta$ and $H_q(\delta)$.  
   They prove a simple but crucial inequality
   $$
   \delta < H_q(\delta) \le \delta + \frac{1}{\log_2 q}
   $$
   for all $0 < \delta \le 1 - 1/q$, and show that the upper bound is essentially tight. Intuitively, this says: the entropy cost of tolerating a fraction $\delta$ of errors is slightly larger than $\delta$, with an overhead of at most $1/\log_2 q$.

2. **Use this to rule out the “up to $1-\rho$” list-decoding picture.**  
   A very common heuristic is that a code of rate $\rho$ should be list-decodable up to roughly
   $$
   \delta \approx 1 - \rho
   $$
   fraction errors with small lists — i.e., capacity is informally treated as the line $\delta = 1 - \rho$. Crites–Stewart point out that this is incompatible with the Elias capacity theorem once you remember that $H_q(\delta) > \delta$:

   - The true information-theoretic limit for small lists is
     $$
     \rho \le 1 - H_q(\delta).
     $$
   - If you try to insist on list-decodability all the way up to $\delta \le 1 - \rho - \eta$ for some fixed $\eta > 0$, then in the interesting range of parameters you inevitably end up in the region
     $$
     \rho \ge 1 - H_q(\delta) + \eta',
     $$
     where Elias guarantees exponentially large lists.

   In other words, the “Reed–Solomon up-to-capacity” folklore (interpreting “capacity” as $1-\rho$) is simply asking for parameters that lie above the actual list-decoding capacity curve.

In short, Section 3.1 does **not** introduce a new capacity theorem; instead, it:

- recalls the classical Elias list-decoding capacity bound,
- makes explicit how this bound contradicts the “up to $1-\rho$” view,

The numerical toy example later in the post is just a concrete instantiation of this same phenomenon in microscopic parameters, following the spirit of this Section 3.1 discussion (Crites–Stewart’s treatment is, of course, more general and more constructive).

## The Numerical Example: Trivial Explosion vs Elias Explosion

Let’s now look at what happens when we plug concrete parameters into a tiny Reed–Solomon code and run brute-force list decoding. The whole point of this section is to **separate two different reasons** for list-size blow-up:

1. a **trivial** dimension-based reason (when we allow so many errors that we have too few constraints), and  
2. the **Elias/capacity** reason (where the entropy calculation forces large lists even though we still have “enough” constraints).

Our experiment will sit **strictly between** these two thresholds:

![](images/72oFfYClJen01jsbYJkiC8Fw2O7.png)

---

### Setup

We work with:

- field size $q = 13$ (so we are over $\mathbb{F}_{13}$),
- block length $n = 12$,
- dimension $k = 5$, so the rate is
  $$
  \rho = \frac{k}{n} = \frac{5}{12} \approx 0.4167,
  $$
- error fraction
  $$
  \delta = 0.5,
  $$
  i.e. a decoding radius of $t = \delta n = 6$ errors.

For each trial of the experiment we:

1. Sample a random degree $< k$ polynomial over $\mathbb{F}_{13}$.
2. Evaluate it on a multiplicative order-$12$ domain to get a length-$12$ RS codeword $c$.
3. Corrupt **exactly 6 coordinates** of $c$ (chosen uniformly at random and changed to random nonzero errors), obtaining the received word $y$.
4. Run a brute-force list decoder that returns **all** RS codewords $c'$ within Hamming distance at most $6$ of $y$.

The list decoder internally computes the agreement threshold
$$
s = \lceil (1 - \delta) n \rceil
  = \lceil 0.5 \cdot 12 \rceil
  = 6,
$$
and keeps all codewords agreeing with $y$ on at least $6$ positions, i.e. at distance $\le 6$.

---

### A detour: the trivial explosion threshold

There is a very simple “dimension-counting” reason why list sizes can explode for Reed–Solomon codes. If we allow so many errors that the number of **agreements** $(1-\delta)n$ is at most $k$, then we have at most $k$ constraints on a degree $<k$ polynomial.

Formally, the **trivial explosion regime** is
$$
(1-\delta)n \le k
\Longleftrightarrow\quad
\delta \ge 1 - \rho
\quad\Longleftrightarrow\quad 
t = \delta n \ge n - k.
$$

In this regime:

- you can pick $(1-\delta)n$ coordinates and values,
- there is always some degree $<k$ polynomial interpolating them,
- so you expect a huge number of codewords in the decoding ball almost for free, just from linear algebra.

For our tiny code:

- $n = 12$,
- $k = 5$,
- so the trivial explosion threshold is
  $$
  t_{\text{triv}} = n - k = 12 - 5 = 7 \quad\text{errors},
  $$
  equivalently
  $$
  \delta_{\text{triv}} = \frac{7}{12} \approx 0.5833.
  $$

If we were decoding from $7$ or more errors, any list explosion we observed could reasonably be blamed on this trivial mechanism.

---

### Where our experiment sits

In our experiment we decode from

$$
\delta = 0.5
\quad\Longleftrightarrow\quad 
t = \delta n = 6.
$$

We have:

- agreements:
  $$
  (1-\delta)n = 0.5 \cdot 12 = 6,
  $$
- which satisfy
  $$
  6 > k = 5.
  $$

So we are **strictly below** the trivial threshold:

- $(1-\delta)n > k$,
- equivalently $t = 6 < t_{\text{triv}} = 7$.

This means:

> Any list-size blow-up we see at $t = 6$ **cannot** be explained by the simple “we have at most $k$ constraints, so interpolation gives many codewords” argument.  
> If lists explode here, it has to be for a more subtle, information-theoretic reason.

That “more subtle reason” is exactly the Elias list-decoding capacity bound.

---

### Above the Elias capacity threshold

For alphabet size $q = 13$ and error fraction $\delta = 0.5$, we compute the $q$-ary entropy
$$
H_{13}(0.5) \approx 0.754635,
$$
so the **list-decoding capacity** at this $\delta$ is
$$
1 - H_{13}(0.5) \approx 0.245365.
$$

Our rate is
$$
\rho = \frac{5}{12} \approx 0.416667,
$$
so we are **well above** capacity:
$$
\rho - (1 - H_q(\delta))
  \approx 0.416667 - 0.245365
  \approx 0.171302 > 0.
$$

A standard refinement of the Elias-style counting argument gives a clean lower bound on the **average** list size over all centers $y \in \mathbb{F}_{13}^{12}$:
$$
\mathbb{E}_y\bigl[|B(y, \delta n) \cap C|\bigr]
  \;\ge\;
  \frac{q^{n(\rho + H_q(\delta) - 1)}}{\sqrt{8 n \delta (1-\delta)}}.
$$

For our parameters:

- $n(\rho + H_q(\delta) - 1) \approx 12 \cdot 0.171302 \approx 2.0556$, so
  $$
  q^{n(\rho + H_q(\delta) - 1)} = 13^{2.0556} \approx 195,
  $$
- and
  $$
  \sqrt{8 n \delta (1-\delta)}
   = \sqrt{8 \cdot 12 \cdot 0.5 \cdot 0.5}
   = \sqrt{24} \approx 4.90.
  $$

Putting this together,
$$
\mathbb{E}_y\bigl[|B(y, 6) \cap C|\bigr]
  \;\gtrsim\;
  \frac{195}{4.9}
  \approx 40.
$$

So on average, a Hamming ball of radius $6$ around a random word $y$ contains at least about $40$ Reed–Solomon codewords at these parameters — and this is already *before* we hit the trivial threshold $t_{\text{triv}} = 7$ errors.

In our actual experiment, where we only sample $y$ of the form “RS codeword $+$ 6 random errors”, we observe list sizes between $40$ and $55$, with an average of about $48$. This sits just above the theoretical lower bound of $\approx 40$, exactly as you’d expect: we’re seeing a finite-size, concrete manifestation of the list-size explosion in a regime where the simple $(1-\delta)n \le k$ argument **does not apply**.

---

### What the experiment outputs

Over 20 independent trials of the experiment (random codeword, random 6-sparse error, brute-force list decoding with radius 6), we get:

```text
Field size q = 13
n = 12, k = 5, rate rho = 0.416667
delta = 0.500000
(1 - delta)*n = 6.000  vs  k = 5
  -> (1 - delta)*n > k  (OUT of the trivial interpolation regime)

H_q(delta) ≈ 0.754635
1 - H_q(delta) ≈ 0.245365  (capacity rate at this delta)
rho - (1 - H_q(delta)) ≈ 0.171302  (above capacity)
eta = rho + H_q(delta) - 1 ≈ 0.171302

Refined Elias-style counting bound:
  E_y[|B(y, δn) ∩ C|] ≥ q^{n(ρ + H_q(δ) - 1)} / sqrt(8 n δ (1-δ))
For these parameters that is ≥ 194.91 / 4.90 ≈ 39.79

Random corrupted codewords and their list sizes:
  trial  0: s = 6, distance ≤ 6, list size = 47
  trial  1: s = 6, distance ≤ 6, list size = 48
  trial  2: s = 6, distance ≤ 6, list size = 45
  trial  3: s = 6, distance ≤ 6, list size = 49
  trial  4: s = 6, distance ≤ 6, list size = 53
  trial  5: s = 6, distance ≤ 6, list size = 46
  trial  6: s = 6, distance ≤ 6, list size = 42
  trial  7: s = 6, distance ≤ 6, list size = 47
  trial  8: s = 6, distance ≤ 6, list size = 50
  trial  9: s = 6, distance ≤ 6, list size = 53
  trial 10: s = 6, distance ≤ 6, list size = 50
  trial 11: s = 6, distance ≤ 6, list size = 47
  trial 12: s = 6, distance ≤ 6, list size = 52
  trial 13: s = 6, distance ≤ 6, list size = 43
  trial 14: s = 6, distance ≤ 6, list size = 46
  trial 15: s = 6, distance ≤ 6, list size = 49
  trial 16: s = 6, distance ≤ 6, list size = 48
  trial 17: s = 6, distance ≤ 6, list size = 49
  trial 18: s = 6, distance ≤ 6, list size = 55
  trial 19: s = 6, distance ≤ 6, list size = 48

Observed list sizes: [47, 48, 45, 49, 53, 46, 42, 47, 50, 53, 50, 47, 52, 43, 46, 49, 48, 49, 55, 48]
max list size = 55
avg list size = 48.35
```
### Conclusion

This little RS toy example is just a sanity check: at parameters sitting **between** the trivial interpolation threshold and the Elias bound, a single Hamming ball already contains dozens of codewords, exactly as the Elias analysis predicts and in tension with any “up to $1-\rho$ ” folklore.

The code I used is here:

[https://github.com/asanso/ca/blob/50b6cfb4c3986a7695aa91401963b0ccf60eb986/elias-bound-toy.py](https://github.com/asanso/ca/blob/main/elias-bound-toy.py)

If you feel like joining the numerical army, tweak the parameters, run larger experiments, and see whether your data points **support** the “no explosion below Elias” picture or **push back** against it.


### Acknowledgments

I’m grateful to **Giacomo Fenzi** for many helpful discussions, patient debugging of my toy experiments, and for generally pushing me to turn “wait, is this list actually exploding?” into something reproducible and (hopefully) readable, and to **George Kadianakis**, **Alistair Stewart** and **Benedikt Wagner** for their careful proofreading and helpful suggestions.