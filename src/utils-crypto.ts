import crypto from 'crypto' // This is node.js library https://nodejs.org/api/crypto.html
import assert from 'assert'
import { Big } from 'big.js'
import { Database } from 'better-sqlite3'

export function createHashRandom(numBytes?: number): Buffer {
    return crypto.createHash('sha256').update(crypto.randomBytes(numBytes || 256)).digest()
}

// this will give a pysudo random number between 0 and 99
export function rngFromHash(hash: string | Buffer, upperLimit = 100): number {
    let bufHash: Buffer
    if (typeof hash == 'string') {
        bufHash = Buffer.from(hash, 'hex')
    } else {
        bufHash = hash
    }

    // sum bytes and mod
    // const bufHash = Buffer.from(hash, "hex");
    let sum = 0
    for (let i = 0; i < bufHash.byteLength; i++) {
        const n: number = bufHash[i]
        sum = (sum += n) % upperLimit
    }

    return sum
}

export function bufferToId(txHex: Uint8Array, maxBytes?: number, concatOverflow?: boolean): string
export function bufferToId(txHex: string, maxBytes?: number, concatOverflow?: boolean): string
export function bufferToId(...args: any[]): string {
    const [pubkey] = args
    let buffer: Uint8Array
    if (typeof pubkey === 'string') {
        buffer = Buffer.from(pubkey, 'hex')
    } else {
        buffer = pubkey
    }


    // just take the first 8 bytes of the pubkey and make a uint64 to index on
    let leftShift: number = args[1] || 56
    assert(leftShift % 8 === 0, 'Invalid left shift')
    assert(leftShift > 0, 'Invalid left shift')
    const arySize = leftShift / 8
    assert(buffer.length >= arySize, 'Invalid left shift')

    const concatOverflow: boolean = args[2] || false

    const aryBuffer: Uint8Array = new Uint8Array(arySize)
    for (let i = 0; i < (concatOverflow ? buffer.length : arySize); i++) {
        aryBuffer[i % arySize] += buffer[i]
    }

    const aryBytes: Big[] = []
    while (leftShift > 0) {
        const num: number = aryBuffer[aryBytes.length]
        aryBytes.push(new Big(2).pow(leftShift - 8).times(num))
        leftShift -= 8
    }
    // Add the last byte
    // aryByes.push(new Big(buffer[(maxBytes / 8) - 1]));
    return String(aryBytes.reduce((pv, cv) => { return pv.plus(cv) }))
}

// This will return a uint32 of the quest hash combined with the tezos account
export function getQuestId(game_id: string | number, tezosAccount: string): string {
    const hash = crypto.createHash('sha256').update(`${game_id},${tezosAccount}`, 'utf8').digest()
    return bufferToId(new Uint8Array(hash), 32, false)
}

export function getRngTokenFromOperationHash(db: Database, hash: string, game_id: number): number {
    const rgnHash = crypto.createHash('sha256').update(hash, 'utf8').digest()
    const aryTokenIds: number[] = db.prepare('select token_id from game_tokens where game_id = :game_id').pluck().all({ game_id })
    const rngToken = aryTokenIds[rngFromHash(rgnHash, aryTokenIds.length)]
    return rngToken
}