import {ethers, toBigInt} from "ethers";

async function main() {
    const balance = ethers.toBigInt("1000000000000000000");
    const ethAmount = ethers.formatEther(balance);
    console.log("Balance:", balance.toString());
    console.log("ETH Amount:", ethAmount);
    
    const halfBalance = balance / toBigInt(2);
    const halfEthAmount = ethers.formatEther(halfBalance);
    console.log("Half Balance:", halfBalance.toString());
    console.log("Half ETH Amount:", halfEthAmount);
}

main()