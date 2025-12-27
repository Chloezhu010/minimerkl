

export interface UserPosition {
    address: string;                // user address
    aUsdcBalance: bigint;           // supply balance
    debtUsdcBalance: bigint;        // borrow balance
    netLending: bigint;             // for eligibility check: aUSDC - debtUSDC
    netBorrowing: bigint;           // for rewards: max (0, debtUSDC - aUSDC)
    lastUpdatedBlock: number;       // track when position last changed
    lastUpdatedTimestamp: number;   // calculate time delta between position changes
}