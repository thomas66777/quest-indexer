import { BlockHeaderResponse, BlockResponse, ContractResponse, OperationEntry } from '@taquito/rpc'
import axios from 'axios'
import assert from 'assert'
import { getMetadataFromOperation, parseFilter, sendSlackMessage } from './utils-functions'
import { Schema } from '@taquito/michelson-encoder'
import { JSONPath } from 'jsonpath-plus'
import { addressFromHex } from './utils-tezos-keys'

// Doing this becasue the taqito rpc package does not handle http errors
export class RpcUtil {
    private readonly url_base: string;
    private readonly chain_id: string;
    constructor(endpoint: string, chain_id: string) {
        this.url_base = new URL(endpoint).href
        this.chain_id = chain_id
    }

    async getBlock(block_level: number | string) {
        const { data } = await axios.get<BlockResponse>(this.url_base + `chains/main/blocks/${block_level}`)
        return data
    }

    async getBlockHeader(block_level = 'head') {
        const { data } = await axios.get<BlockHeaderResponse>(this.url_base + `chains/main/blocks/${block_level}/header`)
        return data
    }
    async getBlockHash(block_level: number | string) {
        const { data } = await axios.get<string>(this.url_base + `chains/main/blocks/${block_level}/hash`)
        return data
    }
    async getContract(address: string) {
        const { data } = await axios.get<ContractResponse>(this.url_base + `chains/main/blocks/head/context/contracts/${address}`)
        return data
    }
    async getCounter(pkh: string) {
        const { data } = await axios.get<string>(this.url_base + `chains/main/blocks/head/context/contracts/${pkh}/counter`)
        return data
    }
    async getManangerKey(pkh: string) {
        const { data } = await axios.get<string>(this.url_base + `chains/main/blocks/head/context/contracts/${pkh}/manager_key`)
        return data
    }
    async broadcastTrx(trxBytes: string, opHash?: string) {
        // broadcast it
        try {
            const res = await axios.post<string>(this.url_base + 'injection/operation', JSON.stringify(trxBytes), {
                headers: { 'content-type': 'application/json' },
            })
            if (opHash) {
                assert(opHash == res.data, 'opHash mismatch')
            }
            return res.data
        } catch (error) {
            throw new Error(error?.response?.data?.map(d => d.msg).join(' ') || error?.message)
        }
    }

    get getRpcUrl(): string {
        return this.url_base
    }
    get getChainId(): string {
        return this.chain_id
    }
}

export function getOperationInBlockByHash(block: BlockResponse, hash: string): OperationEntry {
    const aryBlockFilter = parseFilter(block, [{ criteria: { 'operations:hash': hash, } }])
    // assert(aryBlockFilter.length === 1, `Cannot find op ${hash} in block ${block.header.level}`)
    if (aryBlockFilter.length === 1) {
        const { i, k } = aryBlockFilter[0]
        const block_operation = block.operations[i][k]
        return block_operation
    } else {
        return null
    }
}

export interface IBigMapLedger {
    address: string;
    token_id: string;
    value: string;
}

export function getLedgerMeta(contract: ContractResponse, operation: OperationEntry): IBigMapLedger[] {
    try {
        // Get the storage raw schema from the contract
        const storage: any = (<any>contract).script.code.find((x: any) => x.prim === 'storage').args[0]
        const schemaStorage = Schema.fromRPCResponse(contract)

        // decode the storage schema to object
        const schemaDecoded = schemaStorage.Execute(contract.script.storage)

        // Get the ledger key pointer
        const annotKey = 'ledger'
        const ledgerMichelson = JSONPath({ path: `$..args[?(@.annots == '%${annotKey}')]`, json: storage })[0]
        const ledgerPtr = JSONPath({ path: `$..${annotKey}`, json: schemaDecoded })[0]

        // get the BigMap diff metadata from this operation
        const meta = getMetadataFromOperation(operation)
        const bigMapLedgerDiffs = meta.operation_result.big_map_diff.filter((bm: any) => bm?.big_map == ledgerPtr)

        // Iterate through the Ledger BigMap Diffs and get the values
        const ledgerSchema = new Schema(ledgerMichelson)
        const ledgerBigMapDiffs: IBigMapLedger[] = []
        for (const bigMapDiff of bigMapLedgerDiffs) {
            const value = (<any>bigMapDiff)?.value?.int || null
            const pair = bigMapDiff.key['args']
            ledgerBigMapDiffs.push({
                address: addressFromHex(pair[0].bytes),
                token_id: pair[1].int,
                value
            })
        }
        // const bigMapDiffDecoded = ledgerSchema.ExecuteOnBigMapDiff(bigMapLedgerDiffs)
        // for (const entry of bigMapDiffDecoded.entries()) {
        //     // const keys = Object.keys(entry[0]).map(k => Number(k))
        //     const address = entry[0]['0'].toString()
        //     const token_id = entry[0]['1'].toString()
        //     const value = entry[1].toString()
        //     ledgerBigMapDiffs.push({
        //         address, token_id, value,
        //     })
        // }
        // console.log('ledger => \n', JSON.stringify(entriesPairs, null, 2))
        return ledgerBigMapDiffs
    } catch (error) {
        // If error dont crash, just return empty array and alert
        console.error(new Date().toISOString(), `Daily reward unable to parse BigMap: ${error.message}`)
        sendSlackMessage(`Daily reward unable to parse BigMap: \`${error.message}\``)
        return []
    }
}
