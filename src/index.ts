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

async function main(){
    console.log('🚀 Starting miniMerkl indexer...');

    const blockRange = 30;
        const provider = await getProvider();
        const currentBlock = await provider.getBlockNumber();
    // check checkpoint
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
    // run indexer
        console.log(`\n` + `=`.repeat(60));
        console.log('Running indexer...');
        console.log(`=`.repeat(60));
        // query all events in the block range
        const allEvents = await queryEvents(provider, fromBlock, toBlock);
    
        // calculate user positions based on events
        const positions = await calculateUserPositions(provider, allEvents);
    // save to database
        console.log(`\n` + `=`.repeat(60));
        console.log('Saving user position into DB...');
        console.log(`=`.repeat(60));
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
    // calculate the rewards for each user
        console.log(`\n` + `=`.repeat(60));
        console.log('Running rewards calculation...');
        console.log(`=`.repeat(60));
        await calculateRewards();
}

main().catch(console.error);