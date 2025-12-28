import { UserPosition, Campaign, UserReward } from "./types";
import { getAllUserPositions, getActiveCampaigns, saveUserPosition } from "./database";

/* Reward calculation logics
    - calculate each user's time-weighted avg net borrowing
    - sum total net borrow across all users
    - distribute reward proportionally
    
    user reward = (user net borrow time / total net borrow time) * campaign budget
*/
export function calculateRewards(positions: Map<string, UserPosition>){
     
}