import Database from "better-sqlite3";
import * as path from "path";
import {UserPosition} from "./types";

const dbPath = path.resolve(__dirname, '../data/miniMerkl.db');
// create the db connection
const db = new Database(dbPath);

// init schema
db.exec(`
    CREATE TABLE IF NOT EXISTS user_positions (
        address TEXT PRIMARY KEY,
        aUsdcBalance TEXT NOT NULL,
        debtUsdcBalance TEXT NOT NULL,
        netLending TEXT NOT NULL,
        netBorrowing TEXT NOT NULL,
        aTokenBalanceTime TEXT NOT NULL DEFAULT '0',
        debtTokenBalanceTime TEXT NOT NULL DEFAULT '0',
        netBorrowBalanceTime TEXT NOT NULL DEFAULT '0',
        lastUpdatedBlock INTEGER NOT NULL,
        lastUpdatedTimestamp INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS indexer_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        lastIndexBlock INTEGER NOT NULL,
        lastIndexTimestamp INTEGER NOT NULL
    );
`);

// ========================================
// METHODS: User Positions
// ========================================

/* save or update one user position */
export function saveUserPosition(position: UserPosition): void {
    // prepare sql statement
    const stmt = db.prepare(`
        INSERT or REPLACE INTO user_positions
        (address, aUsdcBalance, debtUsdcBalance, netLending, netBorrowing, 
        aTokenBalanceTime, debtTokenBalanceTime, netBorrowBalanceTime,
        lastUpdatedBlock, lastUpdatedTimestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `); 
    // execute statement with data
    stmt.run (
        position.address,
        position.aUsdcBalance.toString(),
        position.debtUsdcBalance.toString(),
        position.netLending.toString(),
        position.netBorrowing.toString(),
        position.aTokenBalanceTime.toString(),
        position.debtTokenBalanceTime.toString(),
        position.netBorrowBalanceTime.toString(),
        position.lastUpdatedBlock,
        position.lastUpdatedTimestamp
    );
}

/* save or update batch user positions */
export function saveBatchUserPositions(positions: Map<string, UserPosition>): void {
    // prepare sql statement
    const stmt = db.prepare(`
        INSERT or REPLACE INTO user_positions
        (address, aUsdcBalance, debtUsdcBalance, netLending, netBorrowing, 
        aTokenBalanceTime, debtTokenBalanceTime, netBorrowBalanceTime,
        lastUpdatedBlock, lastUpdatedTimestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // use transaction for batch insert, wrap in insertBatch function
    const insertBatch = db.transaction((positions: Map<string, UserPosition>) => {
        // in the key-value pair, the value is the UserPosition
        for (const position of positions.values()){
            stmt.run (
                position.address,
                position.aUsdcBalance.toString(),
                position.debtUsdcBalance.toString(),
                position.netLending.toString(),
                position.netBorrowing.toString(),
                position.aTokenBalanceTime.toString(),
                position.debtTokenBalanceTime.toString(),
                position.netBorrowBalanceTime.toString(),
                position.lastUpdatedBlock,
                position.lastUpdatedTimestamp
            )
        }
    });

    // execute batch insert
    insertBatch(positions);
}

/* get one user position */
export function getUserPosition(address: string): UserPosition | null {
    // prepare sql statement
    const stmt = db.prepare(`
        SELECT * FROM user_positions WHERE address = ?`);

    // execute statement
    const row = stmt.get(address.toLowerCase()) as any;
    if (!row)
        return null;
    return {
        address: row.address,
        aUsdcBalance: BigInt(row.aUsdcBalance),
        debtUsdcBalance: BigInt(row.debtUsdcBalance),
        netLending: BigInt(row.netLending),
        netBorrowing: BigInt(row.netBorrowing),
        aTokenBalanceTime: BigInt(row.aTokenBalanceTime),
        debtTokenBalanceTime: BigInt(row.debtTokenBalanceTime),
        netBorrowBalanceTime: BigInt(row.netBorrowBalanceTime),
        lastUpdatedBlock: row.lastUpdatedBlock,
        lastUpdatedTimestamp: row.lastUpdatedTimestamp
    };
}

/* get all user positions */
export function getAllUserPositions(): Map<string, UserPosition> {
    // prepare sql statement
    const stmt = db.prepare('SELECT * FROM user_positions');
    // execute statement: return all rows as an array
    const rows = stmt.all() as any[];

    // create a map to hold user positions
    const positions = new Map<string, UserPosition>();
    // loop through each row and add to map
    for (const row of rows) {
        positions.set(row.address, {
            address: row.address,
            aUsdcBalance: BigInt(row.aUsdcBalance),
            debtUsdcBalance: BigInt(row.debtUsdcBalance),
            netLending: BigInt(row.netLending),
            netBorrowing: BigInt(row.netBorrowing),
            aTokenBalanceTime: BigInt(row.aTokenBalanceTime),
            debtTokenBalanceTime: BigInt(row.debtTokenBalanceTime),
            netBorrowBalanceTime: BigInt(row.netBorrowBalanceTime),
            lastUpdatedBlock: row.lastUpdatedBlock,
            lastUpdatedTimestamp: row.lastUpdatedTimestamp
        })
    }

    return positions;
}

// ========================================
// METHODS: Indexer State
// ========================================

export function saveIndexerState(lastIndexBlock: number, lastIndexTimestamp: number): void {
    const stmt = db.prepare(`
        INSERT or REPLACE INTO indexer_state
        (id, lastIndexBlock, lastIndexTimestamp)
        VALUES (1, ?, ?)`);
    
    stmt.run(lastIndexBlock, lastIndexTimestamp);
}

export function getIndexerState(): {lastIndexBlock: number, lastIndexTimestamp: number} | null {
    const stmt = db.prepare(`
        SELECT * FROM indexer_state WHERE id = 1`);
    
    const row = stmt.get() as any;
    if (!row)
        return null;
    return {
        lastIndexBlock: row.lastIndexBlock,
        lastIndexTimestamp: row.lastIndexTimestamp
    };
}

// ========================================
// UTILITY
// ========================================

export function closeDatabase(): void {
    db.close();
}

export default db;