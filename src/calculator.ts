import { UserPosition, Campaign, UserReward } from "./types";
import { 
    getAllUserPositions, 
    getActiveCampaigns,
    saveUserPosition,
    saveCampaignState,
    getCampaignState,
    getUserPosition,
    saveUserReward
} from "./database";
import { getProvider } from "./indexer";

const SECONDS_PER_DAY = 24 * 60 * 60;

/* Reward calculation logics */
export async function calculateRewards(){
    console.log(" Starting reward calculation cycle ...\n");

    try {
        // get current block and timestamp
        const provider = await getProvider();
        const currentBlock = await provider.getBlockNumber();
        const currentBlockInfo = await provider.getBlock(currentBlock);
        if (!currentBlockInfo){
            console.warn("Indexer state not found");
            return;
        }
        const currentTimestamp = currentBlockInfo.timestamp;
        
        // get data from database
        const campagins = getActiveCampaigns();
        const positions = getAllUserPositions();
        if (campagins.length == 0){
            console.log("No active campaign to process");
            return;
        }
        if (positions.size == 0){
            console.log("No user positions to calculate rewards");
            return;
        }

        // loop through each active campagin
        for (const cam of campagins) {
            // calculate all user rewards for this campagin
            const rewardMap = calculateCampaignRewards(cam, positions, currentBlock, currentTimestamp);
            // store user rewards to the db
            for (const [address, amount] of rewardMap){
                const userReward: UserReward = {
                    address: address,
                    campaignid: cam.id,
                    rewardToken: cam.rewardToken,
                    rewardAmount: amount,
                    lastCalculatedBlock: currentBlock,
                    lastCalculatedTimestamp: currentTimestamp
                };
                saveUserReward(userReward);
            }
            // update campaign state
            saveCampaignState(
                cam.id,
                cam.currentBlock,
                cam.currentTimestamp
            );
            // log campaign id and nb of users
            console.log(`Campaign ${cam.id}: Calculated rewards for ${rewardMap.size} users`);
        }   
    } catch (error) {
        console.error(`Error during reward calculation: `, error);
        throw error
    }
}

/* Calculate rewards for a single campaign
    @return maps of address (user) -> bigint (reward amount)
*/
function calculateCampaignRewards(
    campaign: Campaign,
    positions: Map<string, UserPosition>,
    currentBlock: number,
    currentTimestamp: number
): Map<string, bigint> {
    const rewardMap = new Map<string, bigint>();
// calculate time-based reward budget
    const campaignState = getCampaignState(campaign.id);
    let timeElapsedSeconds: number;
    if (campaignState){
        // not 1st time - calculate time since last calculation
        timeElapsedSeconds = currentTimestamp - campaignState.lastCalculatedTimestamp;
    } else {
        // first run - calculate time since campaign started
        timeElapsedSeconds = currentTimestamp - campaign.startTimestamp;
    }
    // calculate budget for this time period
    const timeElapsedDays = timeElapsedSeconds / SECONDS_PER_DAY;
    // formula = daily reward budget * time elapsed days
    const budgetForPeriod = BigInt(
        Math.floor(Number(campaign.dailyRewardBudget) * timeElapsedDays));


// calculate total balance time for all eligible users in this campaign
    let totalBalanceTime = 0n;
    for (const pos of positions.values()) {
        if (isEligible(pos, campaign))
            totalBalanceTime += pos.netBorrowBalanceTime;
    }
    if (totalBalanceTime == 0n) { // exit early
        console.log(`No eligible users for campaign ${campaign.id}`);
        return rewardMap;
    }

// calculate each user's reward share
    for (const pos of positions.values()){
        // safety check
        if (currentBlock < pos.lastUpdatedBlock)
            throw new Error(`Position data ahead of indexer: pos at block ${pos.lastUpdatedBlock}`);
        // check eligibility
        if (isEligible(pos, campaign)){
            // calculate each user share of the reward
            const userShare = calculateUserShare(
                pos.netBorrowBalanceTime,   // numerator
                totalBalanceTime,           // denominator
                budgetForPeriod             // budget based on elapsed time
            )
            // store in the reward map
            rewardMap.set(pos.address, userShare);
        }
    }

    // return the reward map
    return rewardMap;
}

/* Check if a user si eligible fro rewards in this campaign */
function isEligible(
    position: UserPosition,
    campaign: Campaign
): boolean {
    return position.netLending < 0n;
}

/* Calculate time-weighted share for one user */
function calculateUserShare(
    userBalanceTime: bigint,
    totalBalanceTime: bigint,
    campaginBudget: bigint
): bigint {
    // formula: (user's balance * time / total balance) * time * budget
    if (totalBalanceTime == 0n)
        return 0n;
    return (userBalanceTime * campaginBudget) / totalBalanceTime;
}