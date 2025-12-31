import { create } from "ts-node";
import { saveCampaign } from "../src/database";
import { Campaign } from "../src/types";

async function createCampaign() {
    console.log("Creating Base Aave v3 USDC Borrowing Incentive Campaign...");

    const now = Math.floor(Date.now() / 1000);
    const SECONDS_PER_DAY = 24 * 60 * 60;
    const CAMPAIGN_DURATION_DAYS = 30;
    // ============================================
    // Campaign 1: WETH Rewards (For Net Borrowers)
    // ============================================
    const wethCampaign: Campaign = {
        id: "base-aavev3-weth-rewards",
        rewardToken: '0x4200000000000000000000000000000000000006', // WETH on Base
        targetToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
        startTimestamp: now,
        endTimestamp: now + CAMPAIGN_DURATION_DAYS * SECONDS_PER_DAY,
        totalRewardBudget: 15_000000000000000000n, // 15 WETH (18 decimals)
        dailyRewardBudget: 500000000000000000n, // 0.5 ETH
        status: "active"
    };
    saveCampaign(wethCampaign);
    console.log('✅ Created Campaign 1: WETH Rewards');
    console.log(`   ID: ${wethCampaign.id}`);
    console.log(`   Daily Budget: 0.5 WETH`);
    console.log(`   Total Budget: 15 WETH`);
    console.log(`   Duration: ${CAMPAIGN_DURATION_DAYS} days`);
    
    // ============================================
    // Campaign 2: USDC Rewards (For Depositors)
    // ============================================
    // const usdcCampaign: Campaign = {
    //     id: "base-aavev3-usdc-rewards",
    //     rewardToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    //     targetToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    //     startTimestamp: now,
    //     endTimestamp: now + CAMPAIGN_DURATION_DAYS * SECONDS_PER_DAY,
    //     totalRewardBudget: 30000_000000n, // 30,000 USDC (6 decimals)
    //     dailyRewardBudget: 1000_000000n, // 1,000 USDC
    //     status: "active"
    // };
    // saveCampaign(usdcCampaign);
    // console.log('✅ Created Campaign 2: USDC Rewards');
    // console.log(`   ID: ${usdcCampaign.id}`);
    // console.log(`   Daily Budget: 1000 USDC`);
    // console.log(`   Total Budget: 30,000 USDC`);
    // console.log(`   Duration: ${CAMPAIGN_DURATION_DAYS} days`);

    console.log('=' .repeat(60));
    console.log('✅ Campaign setup complete!');
    console.log('=' .repeat(60));
}

createCampaign().catch(console.error);