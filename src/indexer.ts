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

async function queryEvents(provider: ethers.JsonRpcProvider, fromBlock: number, toBlock: number) {
    // get aave v3 pool contract on base mainnet
    const poolAddress = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
    const POOL_ABI = [
        "event Supply(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint16 indexed referralCode)",
        "event Withdraw(address indexed reserve, address indexed user, address indexed to, uint256 amount)",
        "event Borrow(address indexed reserve, address user, address indexed onBehalfOf, uint256 amount, uint256 borrowRate, uint16 indexed referralCode)",
        "event Repay(address indexed reserve, address indexed user, address indexed repayer, uint256 amount, uint256 interestRateMode)",
    ];
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
    // create filters for USDC only
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // base mainnet
    const supplyFilter = poolContract.filters.Supply(usdcAddress);
    const withdrawFilter = poolContract.filters.Withdraw(usdcAddress);
    const borrowFilter = poolContract.filters.Borrow(usdcAddress);
    const repayFilter = poolContract.filters.Repay(usdcAddress);
    
    // query all 4 events
    const [supplyEvents, withdrawEvents, borrowEvents, repayEvents] = await Promise.all([
        poolContract.queryFilter(supplyFilter, fromBlock, toBlock),
        poolContract.queryFilter(withdrawFilter, fromBlock, toBlock),
        poolContract.queryFilter(borrowFilter, fromBlock, toBlock),
        poolContract.queryFilter(repayFilter, fromBlock, toBlock),
    ]);
    console.log(`Found ${supplyEvents.length} supply events for USDC`);
    console.log(`Found ${withdrawEvents.length} withdraw events for USDC`);
    console.log(`Found ${borrowEvents.length} borrow events for USDC`);
    console.log(`Found ${repayEvents.length} repay events for USDC`);

    // combine all events into one array, tag each event with its type
    const allEvents = [
        ...supplyEvents.map(event => ({type: "Supply", event: event})),
        ...withdrawEvents.map(event => ({type: "Withdraw", event: event})),
        ...borrowEvents.map(event => ({type: "Borrow", event: event})),
        ...repayEvents.map(event => ({type: "Repay", event: event})),
    ];

    // sort events chronologically: by block number, then transaction order
    allEvents.sort((a, b) => {
        if (a.event.blockNumber != b.event.blockNumber)
            return a.event.blockNumber - b.event.blockNumber;
        return a.event.transactionIndex - b.event.transactionIndex;
    });

    for (const event of allEvents){
        if (event.event instanceof EventLog) {
            console.log({
                type: event.type,
                user: event.event.args.user,
                amount: ethers.formatUnits(event.event.args.amount, 6), // USDC has 6 decimals
                block: event.event.blockNumber,
            })
        }
    }

    return allEvents;
}

// async function printAllEvents(events: {type: string, event: EventLog}[]) {
//     for (const event of events){
//         if (event.event instanceof EventLog) {
//             console.log({
//                 type: event.type,
//                 user: event.event.args.user,
//                 amount: ethers.formatUnits(event.event.args.amount, 6), // USDC has 6 decimals
//                 block: event.event.blockNumber,
//             })
//         }
//     }
// }

async function main() {
    const blockRange = 100;

    const provider = await getProvider();
    const blockNumber = await provider.getBlockNumber();
    const fromBlock = blockNumber - blockRange;
    const toBlock = blockNumber;
    await queryEvents(provider, fromBlock, toBlock);
    // const allEvents = await queryEvents(provider, fromBlock, toBlock);
    // await printAllEvents(allEvents);
}

// Execute main function
main().catch(console.error);