import { Big } from 'big.js'
import assert from 'assert'
import * as BSON from 'bson'
import { RpcClient } from '@taquito/rpc'
import { Database } from 'better-sqlite3'
import { sendSlackMessage, sleep } from './utils-functions'
import Slack from 'node-slack'
import { RpcUtil } from './utils-rpc'

export const REWARD_STATUS = Object.freeze({
    DETECTED_ON_CHAIN: 1,
    AWAITING_ADMIN_TRANSFER: 2,
    MEMORY_POOL: 3,
    CONFIRMED: 4,
    ERROR: 5,
})

export const parseSqlDate = (sqlDate: string) => {
    if (sqlDate == null) {
        return sqlDate
    }

    return sqlDate = sqlDate.substr(-1) === 'Z' ? sqlDate : new Date(sqlDate.replace(' ', 'T') + 'Z').toISOString()
}
export const parseIsActive = (time_start: string, time_end: string) => {
    const now = Date.now()
    return now >= new Date(time_start).getTime() && now <= new Date(time_end || now).getTime()
}
export function setDbStatus(db: Database, status: Object): void {
    dbTransactionBatch(db, [
        {
            sql: 'delete from indexer_status'
        },
        {
            sql: `
            insert into indexer_status (chain_id, block_hash, block_hash_previous, block_timestamp, block_level, block_id)
            values (:chain_id, :block_hash, :block_hash_previous, :block_timestamp, :block_level, :block_id)
            `,
            params: status
        }
    ])
}
export interface ITransactionBatch { sql: string, params?: Object }
export function dbTransactionBatch(db: Database, batch: ITransactionBatch[]): void {
    const res = db.transaction((args) => {
        for (const { sql, params } of args) {
            db.prepare(sql).run(params || {})
        }
    })
    res(batch)
}

export function encodeFixedByteKey(keys: { value: any, type: 'string' | 'number' | 'Buffer', reverse?: boolean, bytes: number }[]): Buffer {
    const bytesLength = keys.reduce((pv, cv, idx) => pv + cv.bytes, 0)
    const aryBuffers = []
    for (const key of keys) {
        let buf
        if (key.type == 'number') {
            buf = numToBuffer(key.value, key.bytes * 8)
        } else if (key.type == 'string') {
            assert(key.value.length <= key.bytes, `too many bytes needed for ${key.value}`)
            const u = new Uint8Array(key.bytes)
            for (let i = 0; i < key.value.length; i++) {
                u[i] = (<string>key.value).charCodeAt(i)
            }
            buf = Buffer.from(u)
        } else if (key.type == 'Buffer') {
            buf = key.value
        } else {
            throw (`unexpected type declared: ${key.type}`)
        }

        if (key.reverse) {
            aryBuffers.push(buf.reverse())
        } else {
            aryBuffers.push(buf)
        }
    }
    const bufKey = Buffer.concat(aryBuffers, bytesLength)
    return bufKey
}

export function stringToBuffer(s = 'hello world'): Buffer {
    const aryChars = new Uint8Array(s.length)
    for (let i = 0; i < s.length; i++) {
        aryChars[i] = s.charCodeAt(i)
    }

    return Buffer.from(aryChars)
}

export function bufferToString(buf: Buffer | Uint8Array): string {
    const idx = buf.findIndex((v) => v == 0)
    if (idx == -1)
        return String.fromCharCode(...buf)
    return String.fromCharCode(...buf.slice(0, idx))
}

export function bufferToNum(buf: Buffer | Uint8Array, isReverse = false): string {
    let sum = new Big(0)
    let rightShift = (buf.byteLength * 8) - 8
    for (let i = 0; i < buf.byteLength; i++) {
        const byte = isReverse ? buf[buf.byteLength - i - 1] : buf[i]
        sum = sum.plus(new Big(2).pow(rightShift).times(byte))
        rightShift -= 8
    }

    return sum.toString()
}

export function numToBuffer(num: string | number, bits: number): Uint8Array {
    Big.RM = 0
    let res = new Big(num)
    // Max size that can fit is pow(2,bytes) - 1
    assert(res.lt(new Big(2).pow(bits)), 'number too big')

    let leftShift = bits - 8
    assert(bits % 8 === 0, 'invalid byte number')
    const aryBuf: Uint8Array = new Uint8Array(bits / 8)
    while (leftShift >= 0) {
        const shiftBits = new Big(2).pow(leftShift)
        const pos = Number(res.div(shiftBits).toFixed(0))
        aryBuf[leftShift / 8] = pos

        res = res.minus(shiftBits.times(pos))
        leftShift -= 8
    }


    return aryBuf
}

export function incrementLE(buffer: Buffer): Buffer {
    const dst = new ArrayBuffer(buffer.length)
    new Uint8Array(dst).set(new Uint8Array(buffer))
    const dstBuf = Buffer.from(dst)
    for (let i = 0; i < buffer.length; i++) {
        if (dstBuf[i]++ !== 255) break
    }
    return dstBuf
}

export function incrementBE(buffer: Buffer): Buffer {
    const dst = new ArrayBuffer(buffer.length)
    new Uint8Array(dst).set(new Uint8Array(buffer))
    const dstBuf = Buffer.from(dst)
    for (let i = buffer.length - 1; i >= 0; i--) {
        if (dstBuf[i]++ !== 255) break
    }
    return dstBuf
}

/* 
    Some helper functions
*/
export function getKeyDb(gameId: number | string, reward: string, rngToken: number | string, filter: string, block_level: number, hash: string): Buffer {
    return encodeFixedByteKey([
        { type: 'string', bytes: 8, value: 'quest' },
        { type: 'number', bytes: 4, value: gameId },
        { type: 'string', bytes: 40, value: reward },
        { type: 'number', bytes: 2, value: rngToken },
        { type: 'string', bytes: 20, value: filter },
        { type: 'number', bytes: 4, value: block_level, reverse: true },
        { type: 'string', bytes: 51, value: hash },
    ])
}
export interface IKeyDb {
    prefix: string;
    gameId: number;
    reward: string;
    rngToken: number;
    filter: string;
    block_level: number;
    hash: string;
}

export function fromKeyDb(buf: Buffer): IKeyDb {
    assert(buf.length == 129)
    const ary: [string, number, 'string' | 'number'][] = [
        ['prefix', 8, 'string'],
        ['gameId', 4, 'number'],
        ['reward', 40, 'string'],
        ['rngToken', 2, 'number'],
        ['filter', 20, 'string'],
        ['block_level', 4, 'number'],
        ['hash', 51, 'string'],
    ]
    const obj: any = {}
    let beg = 0
    for (const [k, len, t] of ary) {
        const bufValue = buf.slice(beg, beg + len)
        if (t == 'number') {
            obj[k] = Number(bufferToNum(bufValue, k == 'block_level' ? false : true))
        } else {
            obj[k] = bufferToString(bufValue)
        }
        beg += len
    }
    return obj
}
export function getKeyDbBlockHistory(block_level?: string | number): Buffer {
    let buf = encodeFixedByteKey([
        { type: 'string', bytes: 8, value: 'blkinfo' },
    ])
    if (block_level) {
        buf = Buffer.concat([buf, encodeFixedByteKey([{ type: 'number', bytes: 4, value: block_level, reverse: true }])])
    }
    return buf
}
export function getKeyDbIdxPending(gameId: number | string, block_level: number | string, hash?: string): Buffer {
    let buf = encodeFixedByteKey([
        { type: 'string', bytes: 8, value: 'idx_pend' },
        { type: 'number', bytes: 4, value: gameId },
        { type: 'number', bytes: 4, value: block_level, reverse: true },
    ])

    if (hash) {
        buf = Buffer.concat([buf, encodeFixedByteKey([{ type: 'string', bytes: 51, value: hash }])])
    }
    return buf
}
export function getKeyDbIdxBlock(block_level: number | string, gameId?: number | string): Buffer {
    let buf = encodeFixedByteKey([
        { type: 'string', bytes: 8, value: 'idx_blk' },
        { type: 'number', bytes: 4, value: block_level, reverse: true },
    ])
    if (gameId) {
        buf = Buffer.concat([buf, encodeFixedByteKey([{ type: 'number', bytes: 4, value: gameId }])])
    }

    return buf
}
export function getKeyDbGameFA2(questHash: Buffer, gameId?: number | string, block_level?: number | string, key?: Buffer): Buffer {
    let buf = encodeFixedByteKey([
        { type: 'string', bytes: 8, value: 'FA2' },
        { type: 'Buffer', bytes: 32, value: questHash },
    ])
    if (gameId) {
        buf = Buffer.concat([buf, encodeFixedByteKey([{ type: 'number', bytes: 4, value: gameId }])])

        if (block_level) {
            buf = Buffer.concat([buf, encodeFixedByteKey([{ type: 'number', bytes: 4, value: block_level, reverse: true }])])

            if (key) {
                buf = Buffer.concat([buf, encodeFixedByteKey([{ type: 'Buffer', bytes: key.length, value: key }])])
            }
        }
    }
    return buf
}


export interface IBlockHistory {
    protocol: string;
    chain_id: string;
    hash: string;
    header: {
        level: number;
        proto: number;
        predecessor: string;
        timestamp: string;
        validation_pass: number;
        operations_hash: string;
        fitness: string[];
        context: string;
        priority: number;
        proof_of_work_nonce: string;
        signature: string;
    };
}

export async function handleOrphanBlock(db: Database, rpcClient: RpcUtil): Promise<any> {
    // find where the chain forked
    while (true) {
        const aryBlockHistory = db.prepare('select * from indexer_block_history order by block_level desc').all()
        for (const blockHistory of aryBlockHistory) {
            const block_level = blockHistory.block_level
            const block_hash: string = await rpcClient.getBlockHash(block_level)

            if (blockHistory.block_hash != block_hash) {
                console.error(new Date().toISOString(), 'orphaned block', block_level, 'purging data and resyncing from previous block', `current hash: ${block_hash} | history hash: ${blockHistory.block_hash}`)
            } else {
                dbTransactionBatch(db, [
                    {
                        sql: 'delete from indexer_reward where block_level > :block_level',
                        params: { block_level }
                    },
                    {
                        sql: 'delete from indexer_block_history where block_level > :block_level',
                        params: { block_level }
                    },
                    {
                        sql: 'delete from indexer_status',
                    },
                    {
                        sql: `insert into indexer_status (chain_id, block_hash, block_hash_previous, block_timestamp, block_level)
                    values (:chain_id, :block_hash, :block_hash_previous, :block_timestamp, :block_level)`,
                        params: blockHistory
                    },
                ])
                return blockHistory
            }
        }
        console.error(new Date().toISOString(), `blocks have forked over ${aryBlockHistory.length} from head wait and do again`)


        // Send a slack message as this could be an issue
        await sendSlackMessage(`Quest Indexer having orphaned blocks \`${process.env.API_PREFIX}\` pid:\`${process.pid}\``)

        // wait 2 min
        await sleep(2 * 60 * 1000)
    }
}
