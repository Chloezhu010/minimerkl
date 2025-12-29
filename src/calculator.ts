import { UserPosition, Campaign, UserReward } from "./types";
import { getAllUserPositions, getActiveCampaigns, saveUserPosition } from "./database";

/* Reward calculation logics
    - calculate each user's time-weighted avg net borrowing
    - sum total net borrow across all users
    - distribute reward proportionally
    
    user reward = (user net borrow time / total net borrow time) * campaign budget
*/
export function calculateRewards(){
     
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
    let totalBalanceTime = 0n;

    // sum up total balance time for all eligible users in this campaign
    for (const pos of positions.values()) {
        if (isEligible(pos, campaign))
            totalBalanceTime += pos.netBorrowBalanceTime;
    }

    // loop through all user positions
    for (const pos of positions.values()){
        // check eligibility
        if (isEligible(pos, campaign)){
            // calculate each user share of the reward
            const userShare = calculateUserShare(
                pos.netBorrowBalanceTime,   // numerator
                totalBalanceTime,           // denominator
                campaign.dailyRewardBudget  // total daily budget to distribute
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