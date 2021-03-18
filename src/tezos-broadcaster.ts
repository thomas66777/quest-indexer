import { RpcClient } from '@taquito/rpc'
import { ContractAbstraction, ContractMethod, ContractProvider, TezosToolkit } from '@taquito/taquito'
import { Database } from 'better-sqlite3'
import { REWARD_STATUS } from './utils-db'
import { IFa2Tx } from './utils-fa2'
import { parseFilter, sendSlackMessage, sleep } from './utils-functions'
import { getOperationInBlockByHash, RpcUtil } from './utils-rpc'
import { secretKeyToKeyPair } from './utils-tezos-keys'
import assert from 'assert'
import { InMemorySigner } from '@taquito/signer'

export class TezosBroadcaster {
    readonly db: Database
    readonly pollingFrequency: number
    readonly arySk: string[]
    rpcClient: RpcUtil
    mapSigner: Map<string, string> = new Map()
    mapContractGame: Map<string, ContractAbstraction<ContractProvider>> = new Map()


    constructor(db: Database, params: {
        chainId?: string,
        rpcEndpoint?: string,

    }) {
        this.pollingFrequency = Number(process.env.POLLING_BROADCAST || 2000)
        this.rpcClient = new RpcUtil(params.rpcEndpoint, params.chainId)
        this.db = db

        // init all of the secret keys
        const arySk: string[] = JSON.parse(process.env.SIGNER_SK)
        for (const sk of arySk) {
            const keys = secretKeyToKeyPair(sk)
            this.mapSigner.set(keys.pkh, sk)
            console.log('signing key detected for', keys.pkh)
        }

        this.startScanning()

    }

    async startScanning(): Promise<void> {
        // load the contracts into memory
        const aryContractGame = this.db.prepare('select tezos_contract_fa2, tezos_signer from game').all()
        for (const { tezos_contract_fa2, tezos_signer } of aryContractGame) {
            if (!this.mapSigner.has(tezos_signer)) { continue }
            const tezosToolkit = new TezosToolkit(new RpcClient(this.rpcClient.getRpcUrl, this.rpcClient.getChainId))
            tezosToolkit.setProvider({ signer: new InMemorySigner(this.mapSigner.get(tezos_signer)) })
            const contract = await tezosToolkit.contract.at(tezos_contract_fa2)
            this.mapContractGame.set(tezos_contract_fa2, contract)
        }

        global['polling_counter']++
        while (true) {
            try {
                // added in query to not include any signers that have mempool status so we dont resend
                const aryBroadcast = this.db.prepare(`
                select ir.id, g.tezos_signer, g.tezos_contract_fa2, ir.block_level, ir.reward_account, ir.token_id
                from (
                    select *
                    from indexer_reward ir
                    where reward_status = :reward_status
                ) ir
                join (
                    select * from game where tezos_signer != ''
                ) g on ir.game_id = g.game_id
                where g.tezos_signer not in (
                    select g.tezos_signer 
                    from indexer_reward ir
                    join game g on g.game_id = ir.game_id 
                    where reward_status = :reward_mempool
                    group by g.tezos_signer 
                )
                order by g.tezos_contract_fa2, ir.block_level asc
                `).all({ reward_status: REWARD_STATUS.AWAITING_ADMIN_TRANSFER, reward_mempool: REWARD_STATUS.MEMORY_POOL })

                // seperate by fa2 contract
                const aryContractFA2 = aryBroadcast.map(b => b.tezos_contract_fa2).filter((v, i, a) => a.indexOf(v) == i)
                for (const contractFA2 of aryContractFA2) {
                    const aryTransferFA = aryBroadcast.filter((v, i, a) => v.tezos_contract_fa2 == contractFA2)

                    // no keys for signing; skip
                    if (!this.mapContractGame.has(contractFA2)) { continue }

                    // waiting for confirmations

                    // get the contract and signer
                    const contract = this.mapContractGame.get(contractFA2)
                    const tezos_signer = aryTransferFA[0].tezos_signer

                    // create the transfer trx
                    const txs: IFa2Tx[] = []
                    for (const b of aryTransferFA) {
                        txs.push({ amount: 1, to_: b.reward_account, token_id: b.token_id, })
                    }

                    const method = contract.methods.transfer([
                        {
                            from_: tezos_signer,
                            txs,
                        }
                    ])

                    // update status to mempool even before it really is so it never accidentally sends twice
                    const aryRewardIds = aryBroadcast.map<string>(f => f.id)
                    this.db.prepare(`
                    update indexer_reward
                    set reward_status = :reward_status
                    where id in (${aryRewardIds.join(',')})
                    `).run({ reward_status: REWARD_STATUS.MEMORY_POOL })

                    console.log(new Date().toISOString(), `broadcaster: ${method.toTransferParams().to} automatically sending batch of ${txs.length} FA2 tokens`)

                    // send off to taquito for on chain injection and confirmation; no await
                    this.transferFA2(method, aryRewardIds)
                }


            } catch (error) {
                console.error(new Date().toISOString(), error.message)
            } finally {
                await sleep(this.pollingFrequency)
            }
            if (global['sigexit']) { break }
        }
        global['polling_counter']--
    }
    async transferFA2(method: ContractMethod<ContractProvider>, aryRewardIds: string[]) {
        global['polling_counter']++
        try {
            // inject the transfer method
            const op = await method.send()

            // update into db the operation raw info
            this.db.prepare(`
            update indexer_reward
            set reward_hash = :reward_hash, reward_bytes = :reward_bytes, reward_counter = :reward_counter
            where id in (${aryRewardIds.join(',')})
            `).run({
                reward_hash: op.hash,
                reward_bytes: op.raw.opbytes,
                reward_counter: op.raw.counter
            })

            console.log(new Date().toISOString(), `broadcaster: ${method.toTransferParams().to} ${op.hash} injected on chain mempool: ${op.hash}`)

            // wait until confirmed in block for fitness level
            const fitness = Number(process.env.FITNESS_LEVEL || 3)
            const block_level = (await op.confirmation(fitness, 10, (fitness + 2) * 60)) - (fitness - 1) // need to adj; see taquito/src/operations/operations.ts
            console.log(new Date().toISOString(), `broadcaster: ${method.toTransferParams().to} ${op.hash} confirmed at block: ${block_level}`)
            const block = await this.rpcClient.getBlock(block_level)

            // get the operation
            const blockOperation = getOperationInBlockByHash(block, op.hash)
            assert(blockOperation, `Cannot find op ${op.hash} in block ${block_level}`)

            // was is successful or error
            const opStatus = (<any>blockOperation)?.contents[0]?.metadata?.operation_result?.status
            const opErrors = JSON.stringify((<any>blockOperation)?.contents[0]?.metadata?.operation_result?.errors) || null

            // update again
            const isError = opStatus !== 'applied'
            this.db.prepare(`
            update indexer_reward
            set reward_status = :reward_status, reward_block_level = :reward_block_level, reward_block_timestamp = :reward_block_timestamp, reward_block_status = :reward_block_status, reward_block_errors = :reward_block_errors
            where reward_hash = :reward_hash
            `).run({
                reward_hash: op.hash,
                reward_status: isError ? REWARD_STATUS.CONFIRMED : REWARD_STATUS.ERROR,
                reward_block_level: block.header.level,
                reward_block_timestamp: block.header.timestamp,
                reward_block_status: opStatus,
                reward_block_errors: opErrors,
            })

            if (isError) {
                await sendSlackMessage(`error with transfer FA2: \`${opErrors}\``)
            }
        } catch (error) {
            console.error(new Date().toISOString(), error.message)
            await sendSlackMessage(`unable to transfer FA2: \`${error.message}\``)
        } finally {
            global['polling_counter']--
        }
    }
}