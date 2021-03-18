import { BlockHeaderResponse, BlockResponse, ContractResponse, OperationEntry } from '@taquito/rpc'
import axios from 'axios'
import assert from 'assert'
import { parseFilter } from './utils-functions';

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