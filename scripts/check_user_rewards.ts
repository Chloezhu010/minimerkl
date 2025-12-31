import { getAllUserPositions, getUserReward, getUserPosition } from "../src/database";
import db from "../src/database";

const userAddress = process.argv[2];

if (!userAddress){
    console.log("Please provider user address to inspect");
    process.exit(1);
}

const rewards = getUserReward(userAddress);
console.log("\nRewards for the user\n");
if (rewards.length == 0)
    console.log("No rewards found\n");
else {
    for (const rew of rewards){
        console.log(`Campaign id: ${rew.campaignid}`);
        console.log(`   Reward token: ${rew.rewardToken}`);
        console.log("   Reward amount: ", Number(rew.rewardAmount)/ 1e18);
        console.log(`   Block: ${rew.lastCalculatedBlock}`);
    }
}