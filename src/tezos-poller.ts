import { getBlockHead, getReward, getTokenDailyReward, parseFilter, sendSlackMessage, sleep } from './utils-functions'
import { dbTransactionBatch, handleOrphanBlock, ITransactionBatch, REWARD_STATUS } from './utils-db'
import { BlockHeaderResponse, BlockResponse, ContractResponse, RpcClient } from '@taquito/rpc'
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito'
import { InMemorySigner, importKey } from '@taquito/signer'
import crypto from 'crypto'

// import filters from './config/filter.config'
// import filter_reward from './config/filter_reward.config'
import { getQuestId, getRngTokenFromOperationHash, rngFromHash } from './utils-crypto'
import { addressFromHex, secretKeyToKeyPair } from './utils-tezos-keys'
import assert from 'assert'
import sqlite3, { Database } from 'better-sqlite3'
import { getBigMapAtBlockLevel } from './utils-bcd'
import { processAuction } from './special/auction'
import { IBCDAuctionStorage, IBCDBigMapAuction } from './special/auctionInterfaceBigMap'
import axios from 'axios'
import { getLedgerMeta, RpcUtil } from './utils-rpc'
import { JSONPath } from 'jsonpath-plus'

export class TezosPoller {
    readonly chainId: string
    readonly rpcEndpoint: string
    readonly pollingFrequency: number
    readonly blockStart: string | number
    readonly blockEnd: number
    readonly db: Database
    readonly rpcClient: RpcUtil
    readonly blockFitness: number

    readonly Tezos: TezosToolkit
    status: {
        chain_id: string,
        block_hash: string,
        block_hash_previous: string,
        block_timestamp: string,
        block_level: number,
    }
    blockLevelHeader: BlockHeaderResponse
    blockLevelScan: number
    contractAction: ContractAbstraction<ContractProvider>
    mapAuction: Map<string, number> = new Map()
    contractAuctionAddress: string
    mapContracts: Map<string, ContractResponse> = new Map()
    constructor(db: Database, params: {
        chainId?: string,
        rpcEndpoint?: string,
        pollingFrequency?: number,
        blockStart?: string | number,
        blockEnd?: number,
        blockFitness?: number | string,
    }, dbStatus: any = null) {
        this.pollingFrequency = Number(params.pollingFrequency)
        this.blockStart = Number(params.blockStart)
        this.blockEnd = Number(params.blockEnd || 0) || 0xFFFFFFFF // u32 max
        this.blockFitness = Number(params.blockFitness)
        this.chainId = params.chainId

        this.rpcEndpoint = params.rpcEndpoint
        this.rpcClient = new RpcUtil(this.rpcEndpoint, this.chainId)
        console.info('rpc url:', this.rpcClient.getRpcUrl)

        if (dbStatus) {
            // set block_start with what is in the db to continue where left off
            this.blockStart = Number(dbStatus.block_level) + 1
            this.status = dbStatus
        }

        // check for or create an instance of the db
        this.db = db

        this.blockLevelScan = this.blockStart
        this.contractAuctionAddress = process.env.AUCTION_CONTRACT
        this.startScanning()
    }

    async startScanning(): Promise<void> {
        try {

            /* load the auction contract */
            if (this.contractAuctionAddress) {
                const tezosToolkit = new TezosToolkit(new RpcClient(this.rpcEndpoint, this.chainId))
                const auctionSigner = this.db.prepare('select tezos_signer from game where tezos_contract_fa2 = :tezos_contract_fa2').pluck().get({ tezos_contract_fa2: this.contractAuctionAddress })
                assert(auctionSigner, 'cannot find special auction contract in game table')
                const arySk: string[] = JSON.parse(process.env.SIGNER_SK)
                const idx = arySk.findIndex(sk => secretKeyToKeyPair(sk).pkh == auctionSigner)

                assert(idx !== -1, `cannot find the sk for the special auction contract ${auctionSigner}`)
                const sk = arySk[idx]
                const signer = new InMemorySigner(sk)
                tezosToolkit.setProvider({ signer })

                this.contractAction = await tezosToolkit.contract.at(this.contractAuctionAddress)
            }
            /* end special logic */

            // Load all the contracts
            const aryContractFA2 = this.db.prepare<string[]>('select tezos_contract_fa2 from game').pluck().all()
            for (const tezos_contract_fa2 of aryContractFA2) {
                const contract = await this.rpcClient.getContract(tezos_contract_fa2)
                this.mapContracts.set(tezos_contract_fa2, contract)
            }

            // init blockHeadLevel to be same as start block just in case of error in the loop
            this.blockLevelHeader = await this.rpcClient.getBlockHeader()

        } catch (error) {
            console.error(new Date().toISOString(), error.message)
            return
        }
        global['polling_counter']++
        while (true) {
            let blockLevel = this.blockLevelScan
            try {

                // start the rpc queries
                const queryBlock = String(blockLevel)
                const block: BlockResponse = await this.rpcClient.getBlock(queryBlock)

                // if this block has already been done
                if (block.header.level == this.status?.block_level) {
                    // console.log(`skipping ${block.header.level}`)
                    continue
                }
                console.info(`indexing block: ${blockLevel}`)

                // check the status to insure block previous blocks processes have not been orphaned
                if (block.header.predecessor != (this.status?.block_hash || block.header.predecessor)) {
                    // remove anything from db that is from the prior block
                    this.status = await handleOrphanBlock(this.db, this.rpcClient)

                    // force to resync
                    blockLevel = this.status.block_level - 1
                    continue
                }

                assert(block.operations, `no operations found for block ${blockLevel}: will querying again`)

                // set a new batch for transactions
                const batchTrxs: ITransactionBatch[] = []
                // Load the filters
                const filtersOperation = this.db.prepare(`
                select game_id, filter_id, name, reward, criteria
                from operation_filter
                where (datetime(:block_time, 'unixepoch') >= datetime(time_start) or time_start is null)
                and   (datetime(:block_time, 'unixepoch') <= datetime(time_end) or time_end is null)
                `).all({ block_time: new Date(block.header.timestamp).getTime() / 1000 })
                filtersOperation.forEach((v, i, a) => v.criteria = JSON.parse(v.criteria))

                // Load daily reward filters
                const filtersDailyReward = []
                const filtersClaimReward = []
                for (const contractFA2 of this.db.prepare('select tezos_contract_fa2 from game').pluck().all()) {
                    const game_id = this.db.prepare('select game_id from game where tezos_contract_fa2 = :tezos_contract_fa2').pluck().get({ tezos_contract_fa2: contractFA2 })
                    const criteria = {
                        'operations:chain_id': process.env.CHAIN_ID,
                        'operations:contents:kind': 'transaction',
                        'operations:contents:amount': { 'eval': 'value == 0' },
                        'operations:contents:destination': contractFA2,
                    }
                    filtersDailyReward.push({
                        filter_id: contractFA2,
                        game_id,
                        filter_type: 'DAILY',
                        name: 'daily reward',
                        reward: 'operations:contents:0:source',
                        criteria: {
                            ...criteria,
                            'operations:contents:parameters:entrypoint': 'reward',
                        }
                    })
                    filtersClaimReward.push({
                        filter_id: contractFA2,
                        game_id,
                        filter_type: 'CLAIM',
                        name: 'claim reward',
                        reward: 'operations:contents:0:source',
                        criteria: {
                            ...criteria,
                            'operations:contents:parameters:entrypoint': 'claim',
                        }
                    })
                }

                const filters = filtersOperation.concat(filtersDailyReward).concat(filtersClaimReward)
                // dynamically apply all filters
                const aryFilterMatches = parseFilter(block, filters)
                for (const { i, j, k } of aryFilterMatches) {
                    const game_id = Number(filters[j].game_id)
                    const operation = block.operations[i][k]

                    // parse out the reward account
                    const reward = getReward({ operations: operation }, filters[j].reward)
                    if (!reward) {
                        console.warn(
                            `cannot find account to reward for ${filters[j].name} ${filters[j].reward} -> block: ${block.header.level} hash: ${operation.hash}`,
                            'are your filters setup correctly?',
                        )
                    } else if (reward == 'SPECIAL') {
                        switch (filters[j].reward.substr(8)) {
                            case 'auction': {
                                // Special processing for auction
                                const contractAddress = filters[j].criteria['operations:contents:destination']
                                const resultAuction = processAuction(contractAddress, blockLevel, this.db, this.mapAuction)
                                break
                            }
                        }
                    } else if (filters[j].filter_type == 'DAILY') {
                        console.log('reward daily', reward, filters[j].name)
                        const quest_id = getQuestId(game_id, reward)
                        const contractFA2 = this.mapContracts.get(filters[j].filter_id)
                        const meta = getLedgerMeta(contractFA2, operation)
                        const token_id = meta.find(m => m.address == reward)?.token_id || getTokenDailyReward({ operations: operation })
                        batchTrxs.push({
                            sql: `
                            insert or ignore into daily_reward (game_id,quest_id,token_id,reward,time_stamp,block_level,operation_idx,chain_id,hash,meta)
                            values (:game_id,:quest_id,:token_id,:reward,:time_stamp,:block_level,:operation_idx,:chain_id,:hash,:meta)
                            `,
                            params: {
                                game_id: game_id,
                                quest_id: quest_id,
                                token_id: token_id,
                                reward_status: REWARD_STATUS.CONFIRMED,
                                reward: reward,
                                time_stamp: block.header.timestamp,
                                block_level: block.header.level,
                                operation_idx: i,
                                chain_id: operation.chain_id,
                                hash: operation.hash,
                                meta: JSON.stringify(meta)
                            }
                        })
                    } else if (filters[j].filter_type == 'CLAIM') {
                        console.log('reward claim', reward, filters[j].name)
                        const quest_id = getQuestId(game_id, reward)
                        const contractFA2 = this.mapContracts.get(filters[j].filter_id)
                        const meta = getLedgerMeta(contractFA2, operation)
                        batchTrxs.push({
                            sql: `
                            insert or ignore into claim_reward (game_id,quest_id,reward,time_stamp,block_level,operation_idx,chain_id,hash,meta)
                            values (:game_id,:quest_id,:reward,:time_stamp,:block_level,:operation_idx,:chain_id,:hash,:meta)
                            `,
                            params: {
                                game_id: game_id,
                                quest_id: quest_id,
                                reward_status: REWARD_STATUS.CONFIRMED,
                                reward: reward,
                                time_stamp: block.header.timestamp,
                                block_level: block.header.level,
                                operation_idx: i,
                                chain_id: operation.chain_id,
                                hash: operation.hash,
                                meta: JSON.stringify(meta)
                            }
                        })
                    } else {
                        // console.log('reward operation', reward, filters[j].name)
                        const quest_id = getQuestId(game_id, reward)
                        // get an rng from the operation signature plus so that it is totally deterministic
                        const rngToken = getRngTokenFromOperationHash(this.db, `${operation.hash}${block.header.level}${quest_id}`, game_id)
                        if (!rngToken) {
                            console.error(new Date().toISOString(), `cannot reward game_id: ${game_id} ${operation.hash} as no tokens are configured`)
                            continue
                        }
                        // Can only have one game_id and filter_id combination
                        batchTrxs.push({
                            sql: `
                            insert or ignore into indexer_reward (game_id, quest_id, token_id, reward_status, reward_account, filter_id, time_stamp, block_level, operation_idx, chain_id, hash)
                            select :game_id, :quest_id, :token_id, :reward_status, :reward_account, :filter_id, :time_stamp, :block_level, :operation_idx, :chain_id, :hash
                            where exists (select 1 from daily_reward where quest_id = :quest_id)
                            `,
                            // values (:game_id, :quest_id, :token_id, :reward_status, :reward_account, :filter_id, :time_stamp, :block_level, :operation_idx, :chain_id, :hash)
                            params: {
                                game_id: game_id,
                                quest_id: quest_id,
                                token_id: rngToken,
                                reward_status: REWARD_STATUS.DETECTED_ON_CHAIN,
                                reward_account: reward,
                                filter_id: filters[j].filter_id,
                                time_stamp: block.header.timestamp,
                                block_level: block.header.level,
                                operation_idx: i,
                                chain_id: operation.chain_id,
                                hash: operation.hash,
                            }
                        })
                    }
                }

                // Set status in db
                this.status = {
                    chain_id: block.chain_id,
                    block_hash: block.hash,
                    block_hash_previous: block.header.predecessor,
                    block_timestamp: block.header.timestamp.toString(),
                    block_level: block.header.level,
                }
                batchTrxs.push(...[
                    { sql: 'delete from indexer_status' },
                    {
                        sql: `
                        insert into indexer_status (chain_id, block_hash, block_hash_previous, block_timestamp, block_level)
                        values (:chain_id, :block_hash, :block_hash_previous, :block_timestamp, :block_level)`,
                        params: this.status
                    }
                ])

                batchTrxs.push({
                    sql: `insert into indexer_block_history (chain_id, block_hash, block_hash_previous, block_timestamp, block_level)
                    values (:chain_id, :block_hash, :block_hash_previous, :block_timestamp, :block_level)`,
                    params: this.status
                })
                // delete anything older than 20
                batchTrxs.push({
                    sql: 'delete from indexer_block_history where block_level <= :block_level',
                    params: { block_level: block.header.level - Number(process.env.DETECT_ORPHAN_BLOCKS ?? 20) }
                })

                dbTransactionBatch(this.db, batchTrxs)

                // Post process any matching filters
                await this.postProcessing()

                // if indexer reached block end
                if (this.blockLevelScan > this.blockEnd) { break }
            } catch (error) {
                console.error(new Date().toISOString(), error.message)

                // try to redo this block in case it is a http server issue
                blockLevel = Number(blockLevel) - 1
            } finally {
                // On the unlikely event that the rpc client errors
                this.blockLevelHeader = (await getBlockHead(this.rpcClient)) || this.blockLevelHeader

                // If still syncing then do not wait
                const blockNext = Math.min(Number(blockLevel) + 1, this.blockLevelHeader.level)
                if (this.blockLevelHeader.level == blockNext) {
                    await sleep(this.pollingFrequency)
                }
                this.blockLevelScan = blockNext

            }
            if (global['sigexit']) { break }
        }
        global['polling_counter']--
    }

    async postProcessing(): Promise<void> {
        const aryBroadcast: { opHashB58: string; trxBytes: string; }[] = []
        const confirmationsNeeded = this.blockFitness || 0
        // const aryPending = await getPending(this.db, { rewardStatus: REWARD_STATUS.DETECTED_ON_CHAIN })
        // special exclusion for daily rewards. Do not payout again
        const aryPending = this.db.prepare(`
        select 
            id,ir.game_id,quest_id,token_id,reward_status,reward_account,filter_id,time_stamp,block_level,operation_idx,chain_id,hash,reward_hash,reward_block_level,reward_block_timestamp,
            game_name,game_desc,tezos_contract_fa2,tezos_signer
        from indexer_reward ir
        join game g on ir.game_id = g.game_id
        where reward_status = :reward_status
        `).all({ reward_status: REWARD_STATUS.DETECTED_ON_CHAIN })
        const batch: ITransactionBatch[] = []
        for (const pending of aryPending) {
            const blockConfirmations = this.blockLevelHeader.level - pending.block_level + 1
            if (blockConfirmations >= confirmationsNeeded) {
                batch.push({
                    sql: 'update indexer_reward set reward_status = :reward_status where id = :id',
                    params: { reward_status: REWARD_STATUS.AWAITING_ADMIN_TRANSFER, id: pending.id }
                })
                console.log(`FA2 reward now awaits Admin transfer for: ${pending.reward_account} token_id: ${pending.token_id} game_id: ${pending.game_id} filter_id: ${pending.filter_id}`)
            }
        }

        dbTransactionBatch(this.db, batch)

        // I am intentially not await as it slows everything down
        this.specialPostProcessing()
    }
    async specialPostProcessing() {
        try {
            // special process for auction resolve
            if (this.contractAction) {
                const network = process.env.API_PREFIX
                const urlPrefix = process.env.BETTER_CALL_DEV_ENDPOINT || 'https://better-call.dev/v1/'
                const storage: IBCDAuctionStorage[] = (await axios.get(`${urlPrefix}contract/${network}/${this.contractAuctionAddress}/storage`)).data
                // const bigMapKey = storage[0].children.find(c => c.name == 'auctions').value
                const bigMapKey = JSONPath({ path: `$..children[?(@.name == 'auctions')].value`, json: storage })[0]
                const bigMapAction: IBCDBigMapAuction[] = (await axios.get(`${urlPrefix}bigmap/${network}/${bigMapKey}/keys`)).data

                for (const { data } of bigMapAction) {
                    const child = (data?.value?.children || []).find(c => c.name == 'end_time')
                    if (child?.value) {
                        const endtime = new Date(child.value)
                        if (Date.now() > endtime.getTime()) {
                            const auction_id = data.key.value
                            const mapKey = `${this.contractAuctionAddress}|${auction_id}`
                            if (!this.mapAuction.has(mapKey)) {
                                this.mapAuction.set(mapKey, Date.now())
                                console.log(`resolve auction for auction_id ${auction_id} at auction contract`)
                                const method = this.contractAction.methods.resolve([auction_id])
                                const params = method.toTransferParams()
                                // console.log('params', JSON.stringify(params, null, 2))
                                const op = await method.send()
                                // console.log(params)
                                const confirmations = await op.confirmation()
                                console.log(`resolved auction with ${confirmations} confirmation at: ${op.hash}`)
                            } else {
                                const val = this.mapAuction.get(mapKey)
                                // if not confirmed in 5 min try again in next polling cycle
                                if (Date.now() - new Date(val).getTime() > (5 * 60 * 1000)) {
                                    this.mapAuction.delete(mapKey)
                                }
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error(new Date().toISOString(), error.message)
            await sendSlackMessage(`Special processing error: ${error.message}`)
        }
    }
}

const isObject = val => typeof val === 'object' && !Array.isArray(val)
const addDelimiter = (a, b) => a ? `${a}:${b}` : b

const paths = (obj = {}, head = '') => {
    return Object.entries(obj).reduce((product, [key, value]) => {
        const fullPath = addDelimiter(head, key)
        if (Array.isArray(value)) {
            value = Object.assign({}, value)
        }
        return isObject(value || false) ?
            product.concat(paths(value, fullPath))
            : product.concat(fullPath)
    }, [])
}
