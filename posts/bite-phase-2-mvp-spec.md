# BITE Phase 2 MVP Spec 

With BITE Phase 2, each block can include  Contract-Action-Transactions (CATs)—  transactions initiated by smart contracts execution in the previous block.

CATs enable smart contracts to decrypt data and  then perform actions automatically on this data.

## Key Benefits of Using BITE Phase 2
- **Automation:** Contracts act on decrypted data automatically, without requiring another user transaction.  
- **Efficiency:** Decryption is done in the same batch as BITE Phase 1, so no extra performance overhead.  
- **Determinism:** Execution happens in a predictable order (CATs run before regular transactions in block N+1).  


# Contract-Action-Transactions

1. A SC in block $N$ calls $decryptAndExecute$ precompile passing an $encryptedAruments$ array and an $plaintextArguments$ array of plaintext arguments.

2. A CAT transaction is added to the next block. CAT transactions are placed in front of regular transactions in the block. They are not subject to block gas limit.

3. CAT transactions have the same $msg.sender$ as the transaction that created them.

4. CAT transaction $to$ field is the SC that originated it. The SC sends a transaction to itself.

5. CAT transaction always calls $onDecrypt$ function of the SC that originated them.

6. CAT transactions are decrypted during the same batch decrypt as the BITE Phase 1 transaction, during finalization of block $N$. Therefore, BITE Phase 2 does not change performance compared BITE Phase 1. 

# decryptAndExecute Precompile

This function creates a CAT transaction


```solidity
/**
Create a CAT transaction that will be decrypted and executed in the next block

 * @notice Decrypts the provided encrypted arguments and executes the associated logic using both decrypted and plaintext arguments in the next block 
 * @param encryptedArguments An array of encrypted byte arrays representing the arguments that need to be decrypted before execution.
 * @param plaintextArguments An array of byte arrays representing the arguments that are already in plaintext and do not require decryption.
 */


function decryptAndExecute(
    bytes[] calldata encryptedArguments,
    bytes[] calldata plaintextArguments
) external;
```

## Precompile gas cost

TO BE DEFINED LATER

# onDecrypt call

If a smart contract defines an $onDecrypt()$ function, it can initiate decryption in Block $N$, and the decryption results are passed to $onDecrypt()$ in Block $N+1$.



```solidity

/**

  Execute SC call on decrypted arguments

 @param decryptedArguments An array of decrypted byte arrays representing the encrypted arguments that were passed to decryptAndExecute
 * @param plaintextArguments An array of byte arrays representing the arguments that are already in plaintext and do not require decryption.
 */

function onDecrypt(
    bytes[] calldata decryptedArguments,
    bytes[] calldata plaintextArguments
) external;
``` 

# Encrypted argument spec

Each encrypted argument will have RLP format similar to BITE Phase 1 encrypted data field, but will include an additional $allowedDecryptorAddress$ parameter, specifying the address of the smartcontract that is allowed to decrypt this argument




# Rock-Paper-Scissors example.

The example below uses BITE Protocol Phase 2 to implement Rock-Paper-Scissors games for two players where the smart contract collects encrypted moves from two players, and then decrypts both at the same time 

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Minimal interface to the Phase 2 precompile (void return).
 * Replace PRECOMPILE_ADDR with the actual address on your network.
 */
interface IBitePhase2 {
    /**
     * @notice Creates a CAT that will decrypt args and call onDecrypt in the next block.
     * @param encryptedArguments Encrypted arguments, decrypted during finalization of the current block.
     * @param plaintextArguments Plaintext arguments, passed through as-is.
     */
    function decryptAndExecute(
        bytes[] calldata encryptedArguments,
        bytes[] calldata plaintextArguments
    ) external;
}

contract RockPaperScissors {
    // -------------------- Config --------------------
    address constant PRECOMPILE_ADDR = 0x0000000000000000000000000000000000000100;
    IBitePhase2 constant BITE = IBitePhase2(PRECOMPILE_ADDR);

    enum Move {
        None,       // 0
        Rock,       // 1
        Paper,      // 2
        Scissors    // 3
    }

    // -------------------- Events --------------------
    event GameCreated(uint256 indexed gameId, address indexed p1, address indexed p2);
    event EncryptedMoveSubmitted(uint256 indexed gameId, address indexed player);
    event WinnerDecided(
        uint256 indexed gameId,
        address winner,        // address(0) means draw
        Move p1Move,
        Move p2Move
    );

    // -------------------- Storage --------------------
    struct Game {
        address p1;
        address p2;
        bytes encMove1;   // encrypted Move for p1
        bytes encMove2;   // encrypted Move for p2
        bool p1Submitted;
        bool p2Submitted;

        // Controls to ensure the CAT callback is expected
        bool pendingCat;
        address expectedCaller; // msg.sender that scheduled decryptAndExecute
        bool finished;
    }

    uint256 public nextGameId;
    mapping(uint256 => Game) public games;

    // -------------------- Game Flow --------------------

    function createGame(address opponent) external returns (uint256 gameId) {
        require(opponent != address(0) && opponent != msg.sender, "bad opponent");
        gameId = nextGameId++;
        games[gameId].p1 = msg.sender;
        games[gameId].p2 = opponent;
        emit GameCreated(gameId, msg.sender, opponent);
    }

    /**
     * @notice Each player submits their encrypted move (opaque bytes).
     * The second submission triggers decryptAndExecute in the same tx.
     *
     * Expected decryption: each encrypted blob decrypts to a single byte 1..3 (Move enum).
     */
    function submitEncryptedMove(uint256 gameId, bytes calldata encMove) external {
        Game storage g = games[gameId];
        require(!g.finished, "game finished");
        require(msg.sender == g.p1 || msg.sender == g.p2, "not a player");

        if (msg.sender == g.p1) {
            require(!g.p1Submitted, "p1 already submitted");
            g.encMove1 = encMove;
            g.p1Submitted = true;
        } else {
            require(!g.p2Submitted, "p2 already submitted");
            g.encMove2 = encMove;
            g.p2Submitted = true;
        }

        emit EncryptedMoveSubmitted(gameId, msg.sender);

        // If both moves are in and we haven't scheduled a CAT yet, schedule it now.
        if (g.p1Submitted && g.p2Submitted && !g.pendingCat) {
            g.pendingCat = true;
            g.expectedCaller = msg.sender; // per spec, CAT msg.sender == caller of decryptAndExecute

            // encryptedArguments: both encrypted moves
            bytes;
            encArgs[0] = g.encMove1;
            encArgs[1] = g.encMove2;

            // plaintextArguments: pass identifiers to reconstruct context in onDecrypt
            // - gameId
            // - p1, p2
            bytes;
            plain[0] = abi.encode(gameId);
            plain[1] = abi.encode(g.p1);
            plain[2] = abi.encode(g.p2);

            // Schedule CAT; no return value
            BITE.decryptAndExecute(encArgs, plain);
        }
    }

    /**
     * @notice CAT callback (executed in Block N+1). Receives decrypted moves and our plaintext context.
     * Security notes for MVP:
     *  - We gate by `pendingCat` and by `expectedCaller` (the account that scheduled the CAT).
     *  - In production, consider adding a CAT nonce or blockTag in plaintext args for stronger domain separation.
     */
    function onDecrypt(
        bytes[] calldata decryptedArguments, // [ p1MoveDecrypted, p2MoveDecrypted ]
        bytes[] calldata plaintextArguments  // [ gameId, p1, p2 ]
    ) external {
        // Decode context
        require(plaintextArguments.length == 3, "bad plaintext len");
        (uint256 gameId) = abi.decode(plaintextArguments[0], (uint256));
        (address p1) = abi.decode(plaintextArguments[1], (address));
        (address p2) = abi.decode(plaintextArguments[2], (address));

        Game storage g = games[gameId];
        require(!g.finished, "already finished");
        require(g.pendingCat, "no pending CAT");
        require(msg.sender == g.expectedCaller, "unexpected caller (not CAT origin)");

        // Decode decrypted moves (each is expected to be a single byte 1..3)
        require(decryptedArguments.length == 2, "bad decrypted len");
        Move p1Move = _asMove(decryptedArguments[0]);
        Move p2Move = _asMove(decryptedArguments[1]);

        // Decide winner
        address winner = _winnerOf(p1, p2, p1Move, p2Move);

        // Mark finished and clear flags
        g.finished = true;
        g.pendingCat = false;
        g.expectedCaller = address(0);

        emit WinnerDecided(gameId, winner, p1Move, p2Move);
    }

    // -------------------- Helpers --------------------

    function _asMove(bytes calldata b) private pure returns (Move) {
        require(b.length == 1, "bad move len");
        uint8 v = uint8(b[0]);
        require(v >= uint8(Move.Rock) && v <= uint8(Move.Scissors), "bad move value");
        return Move(v);
    }

    function _winnerOf(
        address p1,
        address p2,
        Move m1,
        Move m2
    ) private pure returns (address) {
        if (m1 == m2) return address(0);
        // Rock(1) beats Scissors(3), Paper(2) beats Rock(1), Scissors(3) beats Paper(2)
        if (
            (m1 == Move.Rock && m2 == Move.Scissors) ||
            (m1 == Move.Paper && m2 == Move.Rock) ||
            (m1 == Move.Scissors && m2 == Move.Paper)
        ) {
            return p1;
        } else {
            return p2;
        }
    }
} 
```

# Rock-Paper-Scissors explanations

This contract demonstrates how **BITE Phase 2** enables smart contracts to **decrypt data and act automatically** via **Contract-Action-Transactions (CATs)**.  

The example implements a simple **two-player Rock-Paper-Scissors game** where each player submits an **encrypted move**, and once both moves are submitted, the contract automatically schedules a **CAT transaction** to decrypt the moves and determine the winner.

---

## Game Flow

### 1. Game Creation
- A player calls `createGame(opponent)` to set up a new game.
- The contract stores:
  - `p1` (creator),
  - `p2` (opponent),
  - and assigns a `gameId`.
- Emits **GameCreated** event.

---

### 2. Submitting Encrypted Moves
- Each player calls `submitEncryptedMove(gameId, encMove)` with their **encrypted move**.
- Moves are stored in the contract:
  - `encMove1` for player 1,
  - `encMove2` for player 2.
- Emits **EncryptedMoveSubmitted** event.

---

### 3. Scheduling CAT Decryption
- Once **both moves** are submitted:
  - The contract calls the **BITE Phase 2 precompile**:
    ```solidity
    BITE.decryptAndExecute(encArgs, plainArgs);
    ```
  - `encArgs` = `[encMove1, encMove2]` (encrypted moves).
  - `plainArgs` = `[gameId, p1, p2]` (context info to reconstruct the game).
- This creates a **CAT transaction** that will:
  - Run in the **next block**,
  - Call `onDecrypt(decryptedMoves, plaintextArgs)`.

> ⚡ Important: CAT transactions are not user-submitted. They are automatically inserted into the next block by the protocol, before regular transactions.

---

### 4. CAT Execution: `onDecrypt`
- In the **next block**, the runtime:
  1. Decrypts the moves during block finalization,
  2. Invokes the contract’s `onDecrypt` callback:
     ```solidity
     function onDecrypt(
         bytes[] calldata decryptedArguments, // [p1Move, p2Move]
         bytes[] calldata plaintextArguments  // [gameId, p1, p2]
     ) external;
     ```
- The contract:
  - Parses moves from `decryptedArguments`,
  - Reconstructs context (`gameId`, players) from `plaintextArguments`,
  - Determines the winner using Rock-Paper-Scissors rules,
  - Marks the game as finished,
  - Emits **WinnerDecided** event.

---

## Security Controls

1. **Pending CAT flag**  
   - The contract tracks `pendingCat = true` when scheduling a CAT.
   - Prevents duplicate scheduling and ensures only one CAT is expected.

2. **Caller verification**  
   - Ensures that the CAT’s `msg.sender` matches the original caller of `decryptAndExecute`.
   - Prevents unauthorized external calls to `onDecrypt`.

3. **Game state**  
   - `finished` flag ensures a game can’t be replayed after a winner is decided.

---

## Events

- `GameCreated(gameId, p1, p2)`  
  → emitted when a new game is initialized.

- `EncryptedMoveSubmitted(gameId, player)`  
  → emitted when a player submits their encrypted move.

- `WinnerDecided(gameId, winner, p1Move, p2Move)`  
  → emitted when the CAT transaction executes and the winner is determined.

---

## Example Sequence

1. **Block N**
   - Player 1 submits encrypted move.
   - Player 2 submits encrypted move.
   - Contract calls `decryptAndExecute`, scheduling a CAT.

2. **Block N+1**
   - During finalization, encrypted moves are decrypted.
   - CAT executes `onDecrypt`, passing `[p1Move, p2Move]` and context `[gameId, p1, p2]`.
   - Contract decides winner and emits **WinnerDecided**.

---



# Sealed-Bid Auction Example (BITE Phase 2)

This example demonstrates how to implement a **first-price sealed-bid auction** using **BITE Phase 2**.  

- **Bidders** submit their **encrypted bids** along with an ETH **deposit**.  
- Once the bidding period ends, the contract schedules a **Contract-Action-Transaction (CAT)** that decrypts all bids in the **next block**.  
- The contract’s `onDecrypt` callback then determines the **highest bidder**, finalizes the auction, and transfers the funds.  

---

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBitePhase2 {
    function decryptAndExecute(
        bytes[] calldata encryptedArguments,
        bytes[] calldata plaintextArguments
    ) external;
}

contract SealedBidAuction {
    // -------------------- Config --------------------
    address constant PRECOMPILE_ADDR = 0x0000000000000000000000000000000000000100;
    IBitePhase2 constant BITE = IBitePhase2(PRECOMPILE_ADDR);

    address public seller;
    uint256 public biddingDeadline;
    bool public finalized;

    // -------------------- Storage --------------------
    struct Bid {
        address bidder;
        bytes encBid;    // encrypted bid (decrypted later)
        uint256 deposit; // deposit in ETH
    }

    Bid[] public bids;
    bool public pendingCat;
    address public expectedCaller;

    // -------------------- Events --------------------
    event BidSubmitted(address indexed bidder, uint256 deposit);
    event AuctionFinalized(address winner, uint256 amount);

    // -------------------- Init --------------------
    constructor(uint256 _biddingPeriod) {
        seller = msg.sender;
        biddingDeadline = block.timestamp + _biddingPeriod;
    }

    // -------------------- Bidding --------------------
    function submitEncryptedBid(bytes calldata encBid) external payable {
        require(block.timestamp < biddingDeadline, "bidding closed");
        require(msg.value > 0, "deposit required");

        bids.push(Bid({
            bidder: msg.sender,
            encBid: encBid,
            deposit: msg.value
        }));

        emit BidSubmitted(msg.sender, msg.value);
    }

    // -------------------- Close auction --------------------
    function closeAuction() external {
        require(block.timestamp >= biddingDeadline, "still open");
        require(!pendingCat && !finalized, "already scheduled/finalized");

        // Build arrays for CAT call
        bytes[] memory encArgs = new bytes[](bids.length);
        bytes ; // auction context: total bids

        for (uint256 i = 0; i < bids.length; i++) {
            encArgs[i] = bids[i].encBid;
        }
        plainArgs[0] = abi.encode(bids.length);

        pendingCat = true;
        expectedCaller = msg.sender;

        // Schedule CAT to decrypt all bids in the next block
        BITE.decryptAndExecute(encArgs, plainArgs);
    }

    // -------------------- CAT callback --------------------
    function onDecrypt(
        bytes[] calldata decryptedArguments, // decrypted bid values
        bytes[] calldata plaintextArguments  // [numBids]
    ) external {
        require(pendingCat && !finalized, "no pending auction");
        require(msg.sender == expectedCaller, "unexpected caller");

        uint256 numBids = abi.decode(plaintextArguments[0], (uint256));
        require(numBids == bids.length, "mismatch");

        // Find highest bid
        uint256 highestAmount = 0;
        uint256 winnerIndex = type(uint256).max;

        for (uint256 i = 0; i < numBids; i++) {
            uint256 amount = abi.decode(decryptedArguments[i], (uint256));
            if (amount > highestAmount && bids[i].deposit >= amount) {
                highestAmount = amount;
                winnerIndex = i;
            }
        }

        // Finalize auction
        finalized = true;
        pendingCat = false;
        expectedCaller = address(0);

        if (winnerIndex != type(uint256).max) {
            // Pay seller
            payable(seller).transfer(highestAmount);

            // Refund losers + excess deposit
            for (uint256 i = 0; i < numBids; i++) {
                if (i == winnerIndex) {
                    uint256 refund = bids[i].deposit - highestAmount;
                    if (refund > 0) payable(bids[i].bidder).transfer(refund);
                } else {
                    payable(bids[i].bidder).transfer(bids[i].deposit);
                }
            }

            emit AuctionFinalized(bids[winnerIndex].bidder, highestAmount);
        } else {
            // No valid bids, refund everyone
            for (uint256 i = 0; i < numBids; i++) {
                payable(bids[i].bidder).transfer(bids[i].deposit);
            }
            emit AuctionFinalized(address(0), 0);
        }
    }
}
```

## Auction Flow

### Bidding Phase
- Users call `submitEncryptedBid(encBid)` with their encrypted bid and ETH deposit.  
- Deposits ensure bidders cannot underfund their bid.  

---

### Closing Phase
- Once the deadline passes, `closeAuction()` schedules a **CAT**:  
  ```solidity
  BITE.decryptAndExecute(encArgs, plainArgs)
  ```