If there is a Plasma block every minute, then if one holds a coin for a year the size of the non-spend proof for a payment is

60 * 24 * 365 * 100 * 10 * 256 = 17 Gbyte

This assumes that an  average payment transfers 10 coins and that the depth of the Merkle tree is 100

This needs to be multiplied by 2 because the receiver needs to send the change back. So it is 34 GByte total traffic

How feasible is the entire payment then?  How long will it take for sender to upload and for receiver to download and verify 17 GB of data and then pay the change back and then for the sender to verify the proof for the change?   Uploading 17 GB of data will mean days for many people that have asymmetric DSL.