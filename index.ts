const argv = require('argv') // eslint-disable-line @typescript-eslint/no-var-requires
const args = argv.option([
    {
        name: 'path-env',
        short: 'e',
        type: 'string',
        description: 'where is the .env located',
        example: '--path-env=_dev.env'
    },
    {
        name: 'block-start',
        short: 'b',
        type: 'string',
        description: 'block level to start indexing',
        example: '--block-start=500000'
    },
    {
        name: 'db-schema',
        short: 'db',
        type: 'string',
        description: 'refresh the db schema if changes made to ./scripts/db_schema.sql',
        example: '--dbschema'
    },
    {
        name: 'skip-poller',
        short: 'db',
        type: 'string',
        description: 'No polling',
        example: '--skip-poller'
    },
    {
        name: 'skip-injector',
        short: 'db',
        type: 'string',
        description: 'No injecting',
        example: '--skip-injector'
    },
    {
        name: 'skip-api',
        short: 'db',
        type: 'string',
        description: 'No API',
        example: '--skip-api'
    },
]).run()

const envPath = args.options['path-env'] || '.env'
console.log(`running on process ${process.pid}`)
console.log('env path', envPath)
require('dotenv').config({ path: envPath }) // eslint-disable-line @typescript-eslint/no-var-requires


import { TezosPoller } from './src/tezos-poller'
import { AppServer } from './src/app'
import assert from 'assert'
import filters from './src/config/filter.config'
import filtersReward from './src/config/filter_reward.config'
import { TezosToolkit } from '@taquito/taquito'
import { RpcClient } from '@taquito/rpc'
import Slack from 'node-slack'
import sqlite3 from 'better-sqlite3'
import { bufferToId } from './src/utils-crypto'
import { getMetadataFromOperation, getTokenDailyReward, sendSlackMessage, sleep } from './src/utils-functions'
import fs from 'fs'
import path from 'path'
import { secretKeyToKeyPair } from './src/utils-tezos-keys'
import { InMemorySigner } from '@taquito/signer'
import { TezosBroadcaster as TezosInjector } from './src/tezos-broadcaster'
import deasync from 'deasync'
import { getLedgerMeta } from './src/utils-rpc'

global['polling_counter'] = 0
process.on('SIGINT', () => {
    global['sigexit'] = true
    console.log('SIGINT received: Exiting cleanly, please wait...')
    deasync.loopWhile(() => { return global['polling_counter'] > 0 })

    process.exit(0)
})

// Notify for any unexpected crashes
process.on('uncaughtException', async (err) => {
    if (err.message == 'Confirmation polling timed out') {
        // this is an unhandled exception in the taquito TapSubscriber
        // do not crash program; can continue to run with this uncaughtException
        return
    }
    console.error(new Date().toISOString(), 'uncaughtException', err.name, err.message)
    console.error(err.stack)

    // Notify Group on Slack that this indexer crashed
    const message = `Quest Indexer crashed running on \`${process.env.API_PREFIX}\` \`${process.pid}\`
    * err_name: \`${err.name}\`
    * err_message: \`${err.message}\``
    await sendSlackMessage(message)
    process.exit(1)
})



export const paramsDefault = {
    rpcEndpoint: 'https://rpcalpha.tzbeta.net',
    chainId: 'NetXm8tYqnMWky1',

    // 1 min
    pollingFrequency: 60 * 1000,

    blockStart: 1,
    // Continuously
    blockEnd: 0,
    blockFitness: 3,
}


async function main() {
    // const rpcClient = new RpcClient('https://rpc.tzbeta.net:443', 'NetXdQprcVkpaWU')
    // const rpcClient = new RpcClient('https://rpctest.tzbeta.net', 'NetXm8tYqnMWky1')
    // const rpcClient = new RpcClient('https://edonet.smartpy.io', 'NetXSgo1ZT2DRUG')
    // const block = await rpcClient.getBlock({ block: '117213' })
    // console.log('rpc url:', rpcClient.getRpcUrl())
    // for (const ops of block.operations) {
    //     for (const blockOperation of <any>ops) {
    //         if (blockOperation?.hash == 'opRc5sCGDjzWexewqXrMyz11Zy5EHtSTHpaD1qYYinf9DeHDfyF') {
    //             const meta = getMetadataFromOperation(blockOperation)
    //             console.log(meta)
    //             const opStatus = getMetadataFromOperation(blockOperation)?.operation_result?.status
    //             const opErrors = JSON.stringify(getMetadataFromOperation(blockOperation)?.operation_result?.errors) || null
    //             console.log(meta)
    //             const contract = await rpcClient.getContract('KT1RUSCZ7pJ3WNTuXFD44UpStmNRjA459guZ')
    //             getLedgerMeta(contract, blockOperation)
    //         }
    //     }
    // }
    // console.log()

    // validate signing key
    assert(process.env.SIGNER_SK, 'no signing key')

    const paramsUserDefined = JSON.parse(JSON.stringify({
        chainId: process.env.CHAIN_ID,
        rpcEndpoint: process.env.RPC_ENDPOINT,
        pollingFrequency: process.env.POLLING_FREQUENCY,
        blockStart: args.options['block-start'] || process.env.BLOCK_START,
        blockEnd: process.env.BLOCK_END,
        blockFitness: process.env.FITNESS_LEVEL,
    }))
    const params = {
        ...paramsDefault,
        ...paramsUserDefined,
    }
    // open the db
    const dbPath = process.env.DB_PATH || './db/indexer.db'
    console.log('database path', dbPath)
    if (!fs.existsSync(dbPath)) {
        console.log('no existing database found, initializing a new db')
        const pathBase = path.basename(dbPath)
        const pathDir = path.dirname(dbPath)
        const pathExt = path.extname(dbPath)
        assert(pathExt == '.db', 'please only .db sqlite databases')
        if (!fs.existsSync(pathDir)) {
            fs.mkdirSync(pathDir)
        }

        // clear out and init the DB
        const db: sqlite3.Database = new sqlite3(dbPath, { verbose: console.log, fileMustExist: false })

        // https://sqlite.org/foreignkeys.html
        db.pragma('foreign_keys=ON')
        db.exec(fs.readFileSync('./scripts/db_schema.sql', 'utf8'))
        db.exec(fs.readFileSync(`./scripts/db_init_${process.env.API_PREFIX}.sql`, 'utf8'))
        db.close()
    }

    const db: sqlite3.Database = new sqlite3(dbPath, { fileMustExist: true })
    // no harm to run this again if any changes
    if (args.options['db-schema']) {
        db.exec(fs.readFileSync('./scripts/db_schema.sql', 'utf8'))
    }
    const dbStatus = db.prepare('select * from indexer_status').get()
    // const db = LevelUp(LevelDOWN(process.env.DB_PATH || './db'))
    // const dbStatus = await getOrNull(db, 'status')

    if (!args.options['skip-poller']) {
        const tezosPoller = new TezosPoller(db, { ...params }, dbStatus)
    }
    if (!args.options['skip-injector']) {
        const tezosInjector = new TezosInjector(db, { ...params })
    }

    // Get the contract
    // const Tezos = new TezosToolkit(params.rpcEndpoint)
    // Create a Tezos object with an optional InMemory signer
    // if (params.sk) {
    //     // get the secret key for reward FA2 signing
    //     const keyPair = secretKeyToKeyPair(process.env.IN_MEMORY_SECRET_KEY)
    //     // confirm secrete key correctly matches the admin pkh
    //     assert(keyPair.pkh === process.env.ADMIN_SIGNER_PKH)

    //     const signer = new InMemorySigner(params.sk)
    //     this.Tezos.setProvider({ signer })
    // }
    if (!args.options['skip-api']) {
        const app = new AppServer(__dirname, db)
    }
}
(() => {
    main()
})()