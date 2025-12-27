import {ethers, EventLog} from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function getProvider() {
    const apiKey = process.env.API_KEY;
    const rpcUrl = process.env.RPC_URL;
    if (!apiKey) {
        throw new Error("API_KEY not defined in environment variables");
    }
    if (!rpcUrl) {
        throw new Error("RPC_URL not defined in environment variables");
    }
    // connect to the chain
    const provider = new ethers.JsonRpcProvider(rpcUrl + apiKey);
    const blockNumber = await provider.getBlockNumber();
    console.log("Connected to the chain! Block:", blockNumber);
    return provider;
}

async function querySupplyEvents(provider: ethers.JsonRpcProvider, fromBlock: number, toBlock: number ){
    // get aave v3 pool contract
    const poolAddress = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"; // base mainnet
    const POOL_ABI = [
        "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)"
    ];
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
    // query last 100 blocks
    const filter = poolContract.filters.Supply();
    const Events = await poolContract.queryFilter(filter, fromBlock, toBlock);
    console.log(`Found ${Events.length} supply events`);
    // erc20 ABI for getting token info
    const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
    ];
    // loop through events and log user and amount
    for (const event of Events){
        if (event instanceof EventLog) {
            // get token address
            const tokenAddr = event.args.reserve;
            // create token contract instance
            const tokenContract = new ethers.Contract(tokenAddr, erc20Abi, provider);
            // get token info
            const decimals = await tokenContract.decimals();
            const symbol = await tokenContract.symbol();
            // format amount with decimals
            const amount = ethers.formatUnits(event.args.amount, decimals);

            // log info
            console.log({
                user: event.args.user,
                token: symbol,
                tokenAddress: tokenAddr,
                amount: `${amount} ${symbol}`,
                block: event.blockNumber
            })
        }
    }
}

async function main() {
    const provider = await getProvider();
    const blockNumber = await provider.getBlockNumber();
    const fromBlock = blockNumber - 50;
    await querySupplyEvents(provider, fromBlock, blockNumber);
}

main();