import { Campaign, UserPosition } from "../src/types";
import {
    saveCampaign,
    saveUserPosition,
    getActiveCampaigns,
    getAllUserPositions,
    getUserReward,
    saveBatchUserPositions
} from "../src/database";
import { calculateRewards } from "../src/calculator";

async function setupTestData() {
    // create a test campaign
    const now = Math.floor(Date.now() / 1000);
    const testCampaign: Campaign = {
        id: "test-base-aavev3",
        rewardToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // usdc on base mainnet
        targetToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // usdc on base mainnet
        startTimestamp: now - 3600, // started 1h ago
        endTimestamp: now + 86400 * 5, // end in 5 days
        totalRewardBudget: 3000n,
        dailyRewardBudget: 600n,
        status: "active"
    }
    saveCampaign(testCampaign);
    console.log("Created test campaign: ", testCampaign.id);
    console.log("  Daily budget: ", testCampaign.dailyRewardBudget);
    
    // create test user positions
    const testPositions: UserPosition[] = [
        {
            address: "0x11",
            aUsdcBalance: 1000n,
            debtUsdcBalance: 2000n,
            netLending: 0n,
            netBorrowing: 1000n,
            aTokenBalanceTime: 1000n * 3600n, // 1000 * 1h
            debtTokenBalanceTime: 2000n * 3600n, // 2000 * 1h
            netBorrowBalanceTime: 1000n * 3600n,
            lastUpdatedBlock: 12340,
            lastUpdatedTimestamp: now - 3600
        },
        {
            address: "0x22",
            aUsdcBalance: 500n,
            debtUsdcBalance: 1500n,
            netLending: 0n,
            netBorrowing: 1000n,
            aTokenBalanceTime: 500n * 3600n, // 1000 * 1h
            debtTokenBalanceTime: 1500n * 3600n, // 2000 * 1h
            netBorrowBalanceTime: 1000n * 3600n,
            lastUpdatedBlock: 12340,
            lastUpdatedTimestamp: now - 3600
        },
        {
            address: "0x33",
            aUsdcBalance: 3000n,
            debtUsdcBalance: 1000n,
            netLending: 2000n,
            netBorrowing: 0n,
            aTokenBalanceTime: 3000n * 3600n, // 1000 * 1h
            debtTokenBalanceTime: 1000n * 3600n, // 2000 * 1h
            netBorrowBalanceTime: 0n,
            lastUpdatedBlock: 12340,
            lastUpdatedTimestamp: now - 3600
        }
    ];
    for (const pos of testPositions)
        saveUserPosition(pos);

    console.log(`Created and saved ${testPositions.length} user positions`);
    console.log("Test data setup complete!\n");
}

async function main() {
    // setup test data
    setupTestData();

    // verify setup
    const campagins = getActiveCampaigns();
    const positions = getAllUserPositions();
    console.log("Active campaigns: ", campagins.length);
    console.log("Number of user positions: ", positions.size);

    // run the calculation
    await calculateRewards();

    // verify results
    const users = ['0x11', '0x22', '0x33'];
    for (const user of users){
        const rewards = getUserReward(user);
        console.log("User address: ", user);

        if (rewards.length == 0){
            console.log("No rewards found");
        } else {
            for (const reward of rewards) {
                console.log(`  Campaign: ${reward.campaignid}`);
                console.log(`  Reward: ${reward.rewardAmount}`);
            }
        }
    }
}

main().catch(console.error);