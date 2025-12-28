export interface UserPosition {
    address: string;                // user address
    aUsdcBalance: bigint;           // supply balance
    debtUsdcBalance: bigint;        // borrow balance
    netLending: bigint;             // for eligibility check: aUSDC - debtUSDC
    netBorrowing: bigint;           // for rewards: max (0, debtUSDC - aUSDC)

    aTokenBalanceTime: bigint;      // cumulative supply * seconds
    debtTokenBalanceTime: bigint;   // cumulative borrow * seconds
    netBorrowBalanceTime: bigint;   // cumulative net borrow * seconds

    lastUpdatedBlock: number;       // track when position last changed
    lastUpdatedTimestamp: number;   // calculate time delta between position changes
}

export interface Campaign {
    id: string,                 // campaign name
    rewardToken: string,        // the token users receive as rewards
    targetToken: string,        // the token users interact with to earn rewards
    startTimestamp: number,     // campaign start time
    endTimestamp: number,       // campaign end time
    totalRewardBudget: bigint,  // total rewards for entire period
    dailyRewardBudget: bigint,  // daily rewards amount
    status: 'active' | 'paused' | 'end'
}

export interface UserReward {
    address: string,                // user address
    campaignid: string,             // campaign name
    rewardToken: string,            // reward token
    rewardAmount: bigint,           // calculated reward
    lastCalculatedBlock: number,
    lastCalculatedTimestamp: number
}