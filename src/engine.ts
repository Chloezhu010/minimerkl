/* Orchestration engine
    Runs three independent cycles on different schedules
    1. Indexing: every 10 min
    2. Reward calculation: every 1 hour
    3. Merkle generation: every 2 hour
*/
import {
    getProvider,
    queryEvents,
    calculateUserPositions,
} from './indexer';
import { UserPosition } from './types';
import {
    saveUserPosition,
    getUserPosition,
    saveIndexerState,
    getIndexerState,
    saveBatchUserPositions
} from "./database";
import { calculateRewards } from './calculator';

// ============================================
// Config
// ============================================

const INDEX_INTERVAL_MS = 1 * 60 * 1000; // 10min
const REWARD_CAL_INTERVAL_MS = 2 * 60 * 1000; // 1h
const MERKLE_GEN_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2h

// ============================================
// Indexing (Every 10 min)
// ============================================
async function runIndexCycle() {
    console.log("\n" + `=`.repeat(60));
    console.log("Start indexing cycle");
    console.log(`=`.repeat(60));
    
    try {
        const blockRange = 50;
        // get current block
        const provider = await getProvider();
        const currentBlock = await provider.getBlockNumber();
        // check checkpoint
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
        
        // const toBlock = currentBlock;
        const toBlock = Math.min(currentBlock, fromBlock + blockRange);

        console.log(`Indexing from block ${fromBlock} to ${toBlock}`);
        // query events from the block range
        const allEvents = await queryEvents(provider, fromBlock, toBlock);
        // calculate user positions based on events
        const positions = await calculateUserPositions(provider, allEvents);
        console.log(`Calculated positions for ${positions.size} users`);
        // save positions to db
        saveBatchUserPositions(positions);
        console.log(`Saved ${positions.size} positions to database`);
        // get timestamp of current block
        const currentBlockInfo = await provider.getBlock(currentBlock);
        if (!currentBlockInfo) {
            throw new Error(`Failed to fetch current block info for block ${currentBlock}`);
        }
        // save checkpoint
        saveIndexerState(currentBlock, currentBlockInfo.timestamp);
        console.log(`Updated indexer state to block ${currentBlock}`);

        console.log('✅ Indexing cycle completed successfully');
    } catch (error) {
        console.error("Indexing failed: ", error);
    }
}

// ============================================
// Reward calculation (Every 1 hour)
// ============================================
async function runRewardCalculationCycle(){
    console.log("\n" + `=`.repeat(60));
    console.log("Start reward calculation cycle");
    console.log(`=`.repeat(60));
    
    try {
        // check if indexer has run
        const indexState = getIndexerState();
        if(!indexState){
            console.warn("Indexer hasn't run yet - skipping reward calculation");
            return;
        }
        // run reward calculation
        await calculateRewards();
        console.log('✅ Reward calculation cycle completed successfully');
    } catch (error) {
        console.error("Reward calculation failed: ", error);
    }
}

// ============================================
// Merkle generation (Every 2 hour)
// ============================================
async function runMerkleGenerationCycle(){
    try {
        console.log('TBD');
    } catch (error) {
        console.error("Merkle generation failed: ", error);
    }
}

// ============================================
// Engine orchestration
// ============================================
export class Engine {
    private indexingTimer: NodeJS.Timeout | null = null;
    private rewardTimer: NodeJS.Timeout | null = null;
    private merkleTimer: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;

    async start() {
        // check if the engine is already running
        if (this.isRunning){
            console.log("Engine is already running");
            return;
        }

        this.isRunning = true;
        console.log("Starting the Engine...\n");
        await runIndexCycle();
        await runRewardCalculationCycle();
        // await runMerkleGenerationCycle();

        // schedule recurring cycles
        this.indexingTimer = setInterval(() => {
            runIndexCycle().catch(console.error);
        }, INDEX_INTERVAL_MS);
        this.rewardTimer = setInterval(() => {
            runRewardCalculationCycle().catch(console.error);
        }, REWARD_CAL_INTERVAL_MS);
        this.merkleTimer = setInterval(() => {
            runMerkleGenerationCycle().catch(console.error);
        }, MERKLE_GEN_INTERVAL_MS);

        console.log('✅ Engine started - running cycles in background');
    }

    stop() {
        if (!this.isRunning)
            return;
        
        console.log("Stopping engine...");
        if (this.indexingTimer)
            clearInterval(this.indexingTimer);
        if (this.rewardTimer)
            clearInterval(this.rewardTimer);
        if (this.merkleTimer)
            clearInterval(this.merkleTimer);
        this.isRunning = false;
        console.log("✅ Engine stopped");
    }
}

// ============================================
// Main - Entry point
// ============================================
async function main() {
    const engine = new Engine();

    // handle ctrl+C stop signal
    process.on('SIGINT', () => {
        engine.stop();
        process.exit(0);
    })
    await engine.start();
}

if (require.main == module){
    main().catch(console.error);
}

