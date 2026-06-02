# On Increasing the Block Gas Limit: Technical Considerations & Path Forward

*Authored by: [Toni](https://x.com/nero_eth), [Marek](https://x.com/M25Marek), [Pari](https://x.com/parithosh_j), [Jacek](https://x.com/jcksie), [Paul](https://x.com/paulhauner), [Tim](https://x.com/timbeiko) and [Alex](https://x.com/ralexstokes).*


**Authors' Note:**  
The core development community is committed to continuous improvement of the network’s scalability and user experience. With recent community-driven initiatives, such as [pumpthegas.org](https://pumpthegas.org), there has been a growing call to increase Ethereum’s block gas limit with some proposals approaching 60 million. While this enthusiasm reflects the shared goal of expanding Ethereum’s capacity, it is important to proceed deliberately and in harmony with the technical realities of the protocol and its clients. Before encouraging the community to actively signal for limits beyond 36 million, we may want to deepen our understanding of the potential consequences—conducting more analysis, collecting empirical data, and examining results of upcoming protocol changes in the greatest detail possible—so that adjustments are made with both confidence and caution.

---

## Context

The consensus-layer (CL) clients currently implement certain constraints, as specified by the [formal specifications](https://github.com/ethereum/consensus-specs). These constraints include a maximum acceptable uncompressed block size for gossip propagation, currently set to **10 MiB**. In practice, this indirectly influences the maximum feasible block gas limit. Today, raising the gas limit to **60 million** gas, as proposed by some community members, would generate blocks that exceed this gossip constraint—leading to missed slots and overall network instability.

Until these client-level assumptions can be revisited and improved, the network should move forward with caution when considering increases beyond certain thresholds.

> #### Rationale for Limits (Security Considerations):
>   These constraints are not arbitrary; they are in place to safeguard the network. Extremely large blocks can facilitate potential DoS vectors by forcing nodes to handle unwieldy amounts of data. Without practical use cases for such large blocks—and with the risk of malicious actors exploiting them—the core developers have designed limits to mitigate negative effects and protect the network’s health.

---

## What This Means in Practice

- **Functionality up to ~40M gas:**  
  Blocks at or below this level remain within the acceptable size range, allowing clients to propagate them and maintain consensus stability. This ensures that validators do not see unexpected missed slots due to overly large blocks which would be prevented from being propagated because of gossip limits.

- **Beyond ~40M gas:**  
  Valid blocks larger than 10 MiB could fail to propagate as expected. This results in some validators missing their slots despite producing otherwise valid blocks. The gossip limits, which cannot be easily circumvented today, create a bottleneck. In addition, without further empirical data, the initial analyses guiding the blob count increases may not fully reflect the increased complexities of operating under a significantly higher gas limit.

---

## Why Wait for Pectra?

The core developers have been planning the [Pectra](https://eips.ethereum.org/EIPS/eip-7600) network upgrade that reduces worst-case block sizes and create the headroom needed to safely increase capacity. Two notable upcoming changes are:

- **[EIP-7623](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7623.md) (Included in Pectra):**  
  This proposal aims to reduce worst-case block sizes. By increasing the cost of calldata for calldata-heavy transactions, it opens pathways to safely handle more capacity—be that additional blobs or a higher gas limit. Reducing worst-case scenarios mitigates potential DoS vectors and helps ensure that the network remains stable and resilient under heavier loads.

- **[EIP-7691](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7691.md) (Included in Pectra):**  
  This proposal will increase the target/maximum number of blobs per block from 4/6 to 6/9. By observing the network’s performance under increased blob counts, we can gather data on propagation behavior, storage demands, and client resource usage. This empirical evidence will guide safer adjustments in block composition and size.

By first deploying the [Pectra](https://eips.ethereum.org/EIPS/eip-7600) hardfork and analyzing the outcomes of [EIP-7623](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7623.md) and [EIP-7691](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7691.md) in a production environment, we stand to gain critical empirical evidence. This data will inform both core developers and the broader Ethereum community on how the network responds to changes in block composition and size. Armed with this understanding, the community can make more informed decisions on how to increase the gas limit while maintaining Ethereum’s robustness and security.

Future upgrades, such as [PeerDAS](https://eips.ethereum.org/EIPS/eip-7594), will build on these insights, further refining parameters and scaling capabilities as the network evolves.

---

## A Call for Patience and Collaboration

The Ethereum community’s proactive approach and passion for scaling solutions is commendable. Core developers are keenly aware of this momentum and, in general, are supportive of finding a responsible path to increasing the gas limit. However, moving too quickly—especially beyond 36M gas—risks unintended consequences and network instability.

We encourage all stakeholders—users, validators, researchers, and client developers—to remain patient and work together through this transition.
By deferring significant capacity increases until after the [Pectra](https://eips.ethereum.org/EIPS/eip-7600) hardfork, monitoring the real-world effects of [EIP-7623](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7623.md) and [EIP-7691](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7691.md), and carefully reviewing the results, we can ensure that these increases are implemented responsibly and sustainably.

While many sympathize with the desire to see Ethereum's gas limit significantly increase over a short period, a more incremental approach might be sounder. For instance, starting with a moderate increase to around 36M gas would allow us to carefully monitor the network’s response, assess client performance, and ensure that no unforeseen issues arise. If the data supports further increases, we could then proceed more confidently to higher limits while maintaining the network’s stability and security.

Finally, we may also anticipate further updates and guidance from core developers in the coming days/weeks as they work towards resolving these issues.

---

## In Summary

- The current CL client constraints make immediately raising the gas limit to 60M gas impractical due to block size and gossip propagation issues.
- Increasing the gas limit beyond 36M requires careful, data-driven planning and consideration of DoS resilience.
- The upcoming [Pectra](https://eips.ethereum.org/EIPS/eip-7600) hardfork, which includes [EIP-7623](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7623.md) and [EIP-7691](https://github.com/ethereum/EIPs/blob/7fbdc5d77b40b6d6d2e0214e202d2917c9a429ea/EIPS/eip-7691.md), will provide the groundwork and data needed for safe throughput increases.
- Core developers support scaling the network, but emphasize a measured, evidence-based approach. This is in alignment with the motivation of the pumpthegas.org.