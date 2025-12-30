import {ethers, toBigInt} from "ethers";

// async function main() {
//     const balance = ethers.toBigInt("1000000000000000000");
//     const ethAmount = ethers.formatEther(balance);
//     console.log("Balance:", balance.toString());
//     console.log("ETH Amount:", ethAmount);
    
//     const halfBalance = balance / toBigInt(2);
//     const halfEthAmount = ethers.formatEther(halfBalance);
//     console.log("Half Balance:", halfBalance.toString());
//     console.log("Half ETH Amount:", halfEthAmount);
// }

async function main() {
    let dailyReward = 0n;
    dailyReward = 1000n;

    const timeElapsedDays = 1.4589878397482;
    // const budgetForPeriod = dailyReward * BigInt(timeElapsedDays); // range error, cann't convert decimals into bigint
    const convertToNumber = Number(dailyReward);
    console.log("dailyReward in number: ", convertToNumber);

    const multiple = Number(dailyReward) * timeElapsedDays;
    console.log("dailyReward * timeElapsedDay in number: ", multiple);

    const floored = Math.floor(multiple);
    console.log("floored multiple value: ", floored);

    // const convertToBigint = BigInt(multiple);
    const convertToBigint2 = BigInt(floored);
    console.log("convert back to bigint: ", convertToBigint2);

    // console.log("budget: ", budgetForPeriod);
}

main()