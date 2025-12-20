import { ethers, EventLog } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function querySupplyEvents() {
    const apiKey = process.env.API_KEY;
    const rpcUrl = process.env.RPC_URL;
    if (!apiKey || !rpcUrl) {
        throw new Error("Not defined in environment variables");
    }

    // connect to plasma mainnet
    const provider = new ethers.JsonRpcProvider(rpcUrl + apiKey);
    const blockNumber = await provider.getBlockNumber();
    console.log("Connected to the chain! Block:", blockNumber);

    // get aave v3 pool contract
    const poolAddress = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"; // base mainnet
    // const poolAddress = "0x925a2A7214Ed92428B5b1B090F80b25700095e12"; // plasma mainnet
    const POOL_ABI = [
        "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)",
        "event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)",
        "event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint8 interestRateMode, uint256 borrowRate, uint16 indexed referralCode)"
    ];
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);

    // query last 1000 blocks
    const fromBlock = blockNumber - 100;
    const toBlock = blockNumber;
    // create a filter for Supply events
    const filterSupply = poolContract.filters.Supply();
    // query the events based on the filter and block range
    const Events = await poolContract.queryFilter(
        filterSupply,
        fromBlock,
        toBlock
    );
    console.log(`Found ${Events.length} supply events`);

    // ERC20 ABI for getting token info
    const erc20Abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
    ];

    for (const event of Events) {
        if (event instanceof EventLog) {
            // get token address
            const tokenAddress = event.args.reserve;
            // create token contract instance
            const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);
            // get token info
            const decimals = await tokenContract.decimals();
            const symbol = await tokenContract.symbol();
            // format amount with correct decimals
            const amount = ethers.formatUnits(event.args.amount, decimals);

            console.log({
                user: event.args.user,
                token: symbol,
                tokenAddress: tokenAddress,
                amount: `${amount}${symbol}`,
                block: event.blockNumber,
            });
        }
    }


}

querySupplyEvents();