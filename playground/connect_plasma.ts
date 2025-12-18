import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env') });  

// Full ABI fragment for getReserveData (Aave V3)
const POOL_ABI = [
  {
    inputs: [{ internalType: "address", name: "asset", type: "address" }],
    name: "getReserveData",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "configuration", type: "uint256" },
          { internalType: "uint128", name: "liquidityIndex", type: "uint128" },
          { internalType: "uint128", name: "currentLiquidityRate", type: "uint128" },
          { internalType: "uint128", name: "variableBorrowIndex", type: "uint128" },
          { internalType: "uint128", name: "currentVariableBorrowRate", type: "uint128" },
          { internalType: "uint128", name: "currentStableBorrowRate", type: "uint128" },
          { internalType: "uint40", name: "lastUpdateTimestamp", type: "uint40" },
          { internalType: "address", name: "aTokenAddress", type: "address" },
          { internalType: "address", name: "stableDebtTokenAddress", type: "address" },
          { internalType: "address", name: "variableDebtTokenAddress", type: "address" },
          { internalType: "address", name: "interestRateStrategyAddress", type: "address" },
          { internalType: "uint8", name: "id", type: "uint8" }
        ],
        internalType: "struct IPool.ReserveData",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;


async function main() {
    // access env variables
    const apiKey = process.env.API_KEY;
    const rpcUrl = process.env.RPC_URL;
    if (!apiKey || !rpcUrl) {
        throw new Error("Not defined in environment variables");
    }

    // connect to the blockchain
    const provider = new ethers.JsonRpcProvider(rpcUrl + apiKey); // plasma mainnet
    const blockNumber = await provider.getBlockNumber();
    console.log("Connected to Plasma! Block:", blockNumber);

    // // get USDT0 token
    // const usdt0Address = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"; // plasma mainnet
    // const usdt0Abi = [
    //     "function name() view returns (string)",
    //     "function symbol() view returns (string)",
    //     "function totalSupply() view returns (uint256)",
    //     "function balanceOf(address) view returns (uint256)"
    // ];
    // const usdt0Contract = new ethers.Contract(usdt0Address, usdt0Abi, provider);
    // // query USDT0 token supply
    // const totalSupply = await usdt0Contract.totalSupply();
    // console.log("USDT0 Total Supply:", ethers.formatUnits(totalSupply, 6));

    // get aave v3 pool contract on plasma
    const poolAddress = "0x925a2A7214Ed92428B5b1B090F80b25700095e12"; // plasma mainnet
    const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

    // query USDT0 reserve data
    const usdt0Address = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb"; // plasma mainnet
    const reserveData = await pool.getReserveData(usdt0Address);
    console.log("USDT0 reserve data:", reserveData);
}   

main();