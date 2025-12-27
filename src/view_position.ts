import { getAllUserPositions } from "./database";
import {UserPosition} from "./types";
import { ethers } from "ethers";

// retrieve all user position
const allPositions = getAllUserPositions();
console.log(`Total user positions: ${allPositions.size}`);

for (const [address, pos] of allPositions) {
    console.log({
        user: address,
        supply: ethers.formatUnits(pos.aUsdcBalance, 6),
        borrow: ethers.formatUnits(pos.debtUsdcBalance, 6),
        netLending: ethers.formatUnits(pos.netLending, 6),
        eligible: pos.netLending < 0n? '✅ YES' : '❌ NO'
    })
}