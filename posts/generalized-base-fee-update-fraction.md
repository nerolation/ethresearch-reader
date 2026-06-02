Ethereum uses a constant `BLOB_BASE_FEE_UPDATE_FRACTION` when updating the blob base fee each block, with the proportional change in the fee computed as:

```python
math.exp((blob_gas_used - TARGET_BLOBS * GAS_PER_BLOB) / BLOB_BASE_FEE_UPDATE_FRACTION)
```

A new value for this constant has been included in each EIP that changes the target blob gas. It turns out that there is a simple generalization for computing the constant, consistent with both the value set in [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844) and [EIP-7691](https://eips.ethereum.org/EIPS/eip-7691), that would be appropriate for the blob parameter only (BPO) hardforks of [EIP-7892](https://eips.ethereum.org/EIPS/eip-7892). This generalized update fraction calculation, also specified [here](https://discord.com/channels/595666850260713488/1402683134406955008/1403433219185053716), is:

```python
BLOB_BASE_FEE_UPDATE_FRACTION = round(MAX_BLOBS * GAS_PER_BLOB / (2 * math.log(1.125)))
```

Mathematically, we can express the ideal (unrounded) value as

$$
b = \frac{m}{2\ln(1.125)},
$$

where $m$ is the max blob gas per block. To see why this generalizes both EIP-4844 and EIP-7691, we will now set up the equations used by these EIPs and derive the generalized formula from them. 

## Exposition

Define $t$ as the target blob gas per block. Under EIP-4844, the target is at half of the max: $t=m/2$, and the blob base fee is [designed](https://eips.ethereum.org/EIPS/eip-4844#base-fee-per-blob-gas-update-rule) to increase or decrease by a maximum of 1.125 and 1/1.125 per block when blob usage is at its maximum or minimum, respectively. At max blob gas consumed, the equation for the proportional change in the fee becomes 

$$
e^{\frac{m-t}{b}} = e^{t/b} = 1.125.
$$

Taking the natural logarithm of both sides and rearranging for $b$, then substituting $t=m/2$, yields the specified equation:

$$
b = \frac{t}{\ln(1.125)} = \frac{m}{2\ln(1.125)}.
$$

Under EIP-7691, the `BLOB_BASE_FEE_UPDATE_FRACTION` is derived as "the mid-point between keeping the responsiveness to full blobs and no blobs constant". The $b$ that keeps the response to "full blobs" constant is 

$$
b_\text{full} = \frac{m - t}{\ln(1.125)}.
$$

The $b$ that keeps the response to "no blobs" constant is 

$$
b_\text{empty} = \frac{-t}{\ln\left(\frac{1}{1.125}\right)},
$$

which via the logarithm rule: $\ln(1/x) = -\ln(x)$, becomes

$$
b_\text{empty}  = \frac{t}{\ln(1.125)}.
$$

The "mid-point" $(b_\text{full}+b_\text{empty})/2$ simplifies to the generalized equation:

$$
b = \frac{1}{2} \left( \frac{m - t}{\ln(1.125)} + \frac{t}{\ln(1.125)} \right) = \left( \frac{m - t + t}{2\ln(1.125)} \right) = \frac{m}{2\ln(1.125)}.
$$

## Application

The generalized equation gives satisfactory percentage changes at any ratio. Table 1 outlines a few examples. 

| Max:Target |   Full %   |  Empty %  |   Full factor $1.125^k$   |  Empty factor $1.125^k$   |
|:----------:|-----------:|----------:|:---------------------:|:----------------------:|
|  $5{:}4$   | $+4.82\%$  | $-17.18\%$|    $k = \tfrac{2}{5}$     |     $k = -\tfrac{8}{5}$    |
|  $4{:}3$   | $+6.07\%$  | $-16.19\%$|    $k = \tfrac{1}{2}$     |     $k = -\tfrac{3}{2}$    |
|  $3{:}2$   | $+8.17\%$  | $-14.53\%$|    $k = \tfrac{2}{3}$     |     $k = -\tfrac{4}{3}$    |
|  $2{:}1$   | $+12.50\%$ | $-11.11\%$|          $k = 1$          |         $k = -1$           |
|  $3{:}1$   | $+17.00\%$ |  $-7.55\%$|    $k = \tfrac{4}{3}$     |     $k = -\tfrac{2}{3}$    |
|  $4{:}1$   | $+19.32\%$ |  $-5.72\%$|    $k = \tfrac{3}{2}$     |     $k = -\tfrac{1}{2}$    |
|  $5{:}1$   | $+20.74\%$ |  $-4.60\%$|    $k = \tfrac{8}{5}$     |     $k = -\tfrac{2}{5}$    |

**Table 1.** Impact for full and empty blocks across various max:target ratios with the generalized update fraction.

Note in columns 4 and 5 that the base fee changes by a factor of $1.125^k$, where $k$ is a function of the consumed blob gas $g$:

$$
k(g)=\frac{2(g - t)}{m}.
$$

There is a complementary-ratio symmetry around 2:1. The magnitude of $k$ is preserved when the target is moved an equal distance above or below the halfway point ($m/2$). Specifically, $k_\text{full}(m{:}t) = -k_\text{empty}(m{:}(m-t))$ and $k_\text{full}(m{:}(m-t)) = -k_\text{empty}(m{:}t)$, which for example applies to the complementary ratios $3{:}1$ and $3{:}2$ as well as $4{:}1$ and $4{:}3$.

## Extension to gas normalization

The generalized equation naturally extends to the gas normalization approach outlined in [EIP-7999](https://eips.ethereum.org/EIPS/eip-7999). This approach decouples the update fraction from any specific resource limit by being more direct: it normalizes the gas delta $(g-t)$ by dividing it by the max gas $m$ (referred to in EIP-7999 as the limit) when updating the running `excess_gas`. This allows a single, universal update fraction — independent of $m$ — to be used for all resources, regardless of their individual limits.

The two approaches differ only in when the division by $m$ occurs. In the generalized equation, $m$ is placed in the numerator of the update fraction $b$. Since $b$ itself is used as the denominator in the fee update exponent, $(g-t)/b$, this effectively places $m$ in the denominator of the overall calculation.

Ultimately, the final fee change factor:

$$
1.125^{\frac{2(g-t)}{m}}
$$ 

remains the same. However, the normalization makes the architecture more robust, ensuring the price remains stable if a resource's limit is changed, as that limit is already part of the normalized `excess_gas` update.

## Concluding points

The purpose of this post was the following:

1. To expose *why* the proposed equation generalizes previous EIPs.
2. To present the effect of the proposed equation across various max:target ratios, illustrating reasonable percentage changes and the complementary-ratio symmetry.
3. To set the stage for further optimization in EIP-7999. The final piece of the puzzle is to take advantage of the generalization properties of the equation, but apply $m$ at an earlier stage, already when updating the `excess_gas`.
4. During the [last ACDE](https://www.youtube.com/watch?v=iPYHJnEeY9g), several participants only recognized the general properties after the discussion had concluded (via chat). This post can serve as a venue for a more informed conversation on establishing the proposed equation as the default for the update fraction going forward.