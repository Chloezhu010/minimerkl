import {ethers, EventLog} from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
import {UserPosition} from "./types";
import {
    saveUserPosition,
    getUserPosition,
    saveIndexerState,
    getIndexerState,
    saveBatchUserPositions
} from "./database";

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

function getOrCreatePosition(
    positions: Map<string, UserPosition>,
    address: string,
    blockNumber: number,
    timestamp: number
): UserPosition {
    // get existing position
    let position = positions.get(address);
    // if not exist, create a new one
    if (!position) {
        position = {
            address: address.toLowerCase(), // why lowercase?
            aUsdcBalance: 0n, // why 0n? bitint literal?
            debtUsdcBalance: 0n,
            netLending: 0n,
            netBorrowing: 0n,
            lastUpdatedBlock: blockNumber,
            lastUpdatedTimestamp: timestamp,
        };
        // add to map
        positions.set(address, position);
    }

    return position;
}

type TaggedEvent = {
    type: string,
    event: ethers.EventLog | ethers.Log
};

async function queryEvents(
    provider: ethers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number
): Promise<TaggedEvent[]> {
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

    // sort events by block number, then log index
    allEvents.sort((a, b) => {
        if (a.event.blockNumber != b.event.blockNumber)
            return a.event.blockNumber - b.event.blockNumber;
        return a.event.index - b.event.index;
    });

    return allEvents;
}

async function calculateUserPositions(
    provider: ethers.JsonRpcProvider,
    events: TaggedEvent[]
): Promise<Map<string, UserPosition>> {
    const positions = new Map<string, UserPosition>();
    for (const {type, event} of events) {
        if (!(event instanceof EventLog))
            continue;
        const block = await provider.getBlock(event.blockNumber);
        if (!block){
            console.warn(`Block not found: ${event.blockNumber}, skipping the event.`);
            continue;
        }
        const timestamp = block.timestamp;
        const user = event.args.onBehalfOf || event.args.user;
        const position = getOrCreatePosition(positions, user.toLowerCase(), event.blockNumber, timestamp);
        const amount = event.args.amount;
        // based on event type, update position
        switch (type){
            case "Supply":
                position.aUsdcBalance += amount;
                break;
            case "Withdraw":
                position.aUsdcBalance -= amount;
                break;
            case "Borrow":
                position.debtUsdcBalance += amount;
                break;
            case "Repay":
                position.debtUsdcBalance -= amount;
                break;
        }
        // calculate net lending and borrowing
        position.netLending = position.aUsdcBalance - position.debtUsdcBalance;
        position.netBorrowing = position.netLending < 0n? -position.netLending: 0n;
        // update last updated block and timestamp
        position.lastUpdatedBlock = event.blockNumber;
        position.lastUpdatedTimestamp = timestamp;
    }
    return positions;
}


async function printAllEvents(events: TaggedEvent[]) {
    for (const event of events){
        if (event.event instanceof EventLog) {
            console.log({
                type: event.type,
                user: event.event.args.user,
                amount: ethers.formatUnits(event.event.args.amount, 6), // USDC has 6 decimals
                block: event.event.blockNumber,
                txIndex: event.event.transactionIndex,
                logIndex: event.event.index,
            })
        }
    }
}

function printAllPositions(positions: Map<string, UserPosition>) {
    for (const [address, pos] of positions) {
        if (pos.aUsdcBalance < 0n){
            console.log(`Skipping ${address} - incomplete history (negative supply)`);
            continue;
        }
        console.log({
            user: address,
            supply: ethers.formatUnits(pos.aUsdcBalance, 6),
            borrow: ethers.formatUnits(pos.debtUsdcBalance, 6),
            netLending: ethers.formatUnits(pos.netLending, 6),
            eligible: pos.netLending < 0n? "Yes" : "No"
        })
    }
}

async function main() {
    const blockRange = 100;
    const provider = await getProvider();
    const currentBlock = await provider.getBlockNumber();

    // check last indexed block from database
    const indexState = getIndexerState();

    let fromBlock: number;
    if (indexState) {
        // resume from last indexed block + 1
        fromBlock = indexState.lastIndexBlock + 1;
        console.log(`Resume from block ${fromBlock}`);
    } else {
        // start from the beginning
        fromBlock = currentBlock - blockRange;
        console.log(`First run - Start indexing from block ${fromBlock}`);
    }

    const toBlock = currentBlock;
    console.log(`Indexing from block ${fromBlock} to ${toBlock}`);

    // query all events in the block range
    const allEvents = await queryEvents(provider, fromBlock, toBlock);

    // calculate user positions based on events
    const positions = await calculateUserPositions(provider, allEvents);

    // save all user positions to database
    saveBatchUserPositions(positions);
    console.log(`Saved ${positions.size} user positions to db`);

    // get timestamp of current block
    const currentBlockInfo = await provider.getBlock(currentBlock);
    if (!currentBlockInfo) {
        throw new Error(`Failed to fetch current block info for block ${currentBlock}`);
    }
    // save checkpoint
    saveIndexerState(currentBlock, currentBlockInfo.timestamp);
    console.log(`Updated indexer state to block ${currentBlock}`);

    // print all user positions
    // printAllPositions(positions);

    // // print all events
    // await printAllEvents(allEvents);
}

// Execute main function
main().catch(console.error);