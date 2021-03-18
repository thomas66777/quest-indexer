import { localForger } from '@taquito/local-forging'
import { RpcClient } from '@taquito/rpc'
import { InMemorySigner } from '@taquito/signer'
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito'
import { blake2b } from 'blakejs'
import axios from 'axios'
import { b58cencode, b58cdecode, prefix } from '@taquito/utils'
import assert from 'assert'
import { RpcUtil } from './utils-rpc'
import { secretKeyToKeyPair } from './utils-tezos-keys'

export interface IFa2Tx {
    to_: string;
    token_id: number;
    amount: number;
}


export async function buildOperationFA2(
    rpc: RpcUtil,
    // rpcEndpoint: string, chain_id: string,
    contract: ContractAbstraction<ContractProvider>,
    isReveal: boolean,
    block_hash: string,
    addressSource: string,
    txs: IFa2Tx[],
    sk: string,
    objCounter = {}
): Promise<{ opHashB58: string, trxBytes: string }> {
    // const rpc = rpcEndpoint
    // const tezos = new TezosToolkit(new RpcClient(rpc, chain_id))
    // const contract = await tezos.contract.at(assetContract)

    // increment counter
    if (objCounter[addressSource]) {
        objCounter[addressSource]++
    } else {
        const counter = await rpc.getCounter(addressSource)
        objCounter[addressSource] = Number(counter) + 1
    }

    const method = contract.methods.transfer([
        {
            from_: addressSource,
            txs,
        }
    ])

    const parameters = method.toTransferParams()

    const keys = secretKeyToKeyPair(sk)
    const contents = []

    const defaultFees = {
        fa2_gas_limit: Number(process.env.FA2_GAS_LIMIT || 40000),
        fa2_storage_limit: Number(process.env.FA2_STORAGE_LIMIT || 250),
        fa2_fee: Number(process.env.FA2_FEE || 4080),
    }
    if (!isReveal) {
        contents.push({
            kind: <any>'reveal',
            source: keys.pkh,
            fee: '0',
            counter: String(objCounter[addressSource]++),
            gas_limit: '1000',
            storage_limit: '0',
            public_key: keys.pk
        })
    }
    contents.push({
        ...parameters,
        fee: String(defaultFees.fa2_fee * (contents.length + 1)),
        gas_limit: String(defaultFees.fa2_gas_limit * (contents.length + 1)),
        storage_limit: defaultFees.fa2_storage_limit,
        kind: <any>'transaction',
        to: undefined,
        parameter: undefined,
        parameters: parameters.parameter,
        destination: parameters.to,
        source: addressSource,
        counter: String(objCounter[addressSource]),
    })


    // console.log(JSON.stringify(contents, null, 2))

    const encoded = await localForger.forge({
        branch: block_hash,
        contents: contents
    })
    // console.log(encoded)

    // sign it
    const signer = new InMemorySigner(sk)
    const sig = await signer.sign('03' + encoded)

    const sigHex = Buffer.from(b58cdecode(sig.sig, prefix.sig)).toString('hex')
    const trxBytes = `${encoded}${sigHex}`
    const opHashB58 = b58cencode(blake2b(Buffer.from(trxBytes, 'hex'), null, 32), prefix.o)

    return { opHashB58, trxBytes }
}