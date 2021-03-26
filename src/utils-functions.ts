import { BlockHeaderResponse, BlockMetadata, BlockResponse, ContractResponse, MichelsonV1Expression, MichelsonV1ExpressionExtended, OperationContentsAndResultMetadataTransaction, OperationEntry } from '@taquito/rpc'
import Database from 'better-sqlite3'
import Slack from 'node-slack'
import { RpcUtil } from './utils-rpc'
import { Schema } from '@taquito/michelson-encoder'
import { ContractProvider } from '@taquito/taquito'

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export function parseFilter(block: BlockResponse, filters: any[]) {
    const aryMatches = []
    for (let i = 0; i < block.operations.length; i++) {
        const operations = block.operations[i]
        // for (const operations of block.operations) {
        for (let k = 0; k < operations.length; k++) {
            const operation = operations[k]
            // scan any operations for user activity
            const mutatableFilters = JSON.parse(JSON.stringify(filters)).map(f => f.criteria)
            propertiesToArray({ operations: operation }, mutatableFilters)
            for (let j = 0; j < mutatableFilters.length; j++) {
                const filter = mutatableFilters[j]
                if (Object.keys(filter).length === 0) {
                    // filter matched
                    aryMatches.push({
                        i, j, k
                    })
                }
            }
        }
    }
    return aryMatches
}


const isObject = val => typeof val === 'object' && !Array.isArray(val)
export function propertiesToArray(obj: Object, filters: Object[] = []): string[] {
    const flat: string[] = paths(obj, '', filters)
    return flat.filter((val, idx, ary) => ary.indexOf(val) == idx)
}
function paths(obj = {}, head = '', filters: Object[] = []) {
    const addDelimiter = (a, b) => {
        // return a ? `${a}:${b}` : b
        if (a) {
            if (Number.isInteger(parseInt(b))) {
                return a
            } else {
                return `${a}:${b}`
            }
        } else {
            return b
        }
    }

    let product = []
    for (const [key, val] of Object.entries(obj)) {
        let value = val
        const fullPath = addDelimiter(head, key)

        for (const filter of filters) {
            if (filter.hasOwnProperty(fullPath)) {
                // evaluate the criteria
                const valFilter = filter[fullPath]
                if (typeof valFilter === 'object') {
                    if (valFilter.hasOwnProperty('eval')) {
                        const isMatch = eval(valFilter.eval)
                        if (isMatch === true) {
                            delete filter[fullPath]
                        }
                    }
                } else if (value == valFilter) {
                    delete filter[fullPath]
                }
            }
        }

        if (Array.isArray(value)) {
            value = Object.assign({}, value)
        }
        if (isObject(value || false)) {
            const pathRecursive = paths(value, fullPath, filters)

            product = product.concat(pathRecursive)
        } else {
            product = product.concat(fullPath)
        }


    }
    return product


    // const idx = filters.indexOf(fullPath)
    // if (idx > -1) {
    //     filters.splice(idx, 1)
    //     console.log(fullPath)
    // }
    // if (filters.length == 0) {
    //     console.log()
    // }
    // const x = Object.entries(obj).reduce((product, [key, value]) => {
    //     let fullPath = addDelimiter(head, key)
    //     if (Array.isArray(value)) {
    //         value = Object.assign({}, value)
    //     }
    //     return isObject(value || false) ?
    //         product.concat(paths(value, fullPath, filters))
    //         : product.concat(fullPath)
    // }, []);
    // return x
}
// export function getTokenDailyReward(contract: ContractResponse, meta: OperationContentsAndResultMetadataTransaction): string {
//     const schemaStorage = Schema.fromRPCResponse(contract)


//     // // parse all the storage
//     // const storage = (<any>contract).script.code.find(x => x.prim === 'storage')!.args[0]
//     // const schemaStorage = new Schema(storage)
//     const objSchema = schemaStorage.ExtractSchema()
//     const st = schemaStorage.Execute(meta.operation_result.storage)
//     const keyTokenMetadata: string = st?.assets?.token_metadata
//     // const xyz = schemaStorage.FindFirstInTopLevelPair(meta.operation_result.storage, keyTokenMetadata)
//     const typeOfValueToFind = {
//         prim: 'big_map',
//         args: [{ prim: 'string' }, { prim: 'bytes' }],
//         annots: ['%metadata']
//     }
//     const xyz = schemaStorage.FindFirstInTopLevelPair(meta.operation_result.storage, typeOfValueToFind)
    
//     console.log(keyTokenMetadata)
//     console.log(JSON.stringify(st, null, 2))

//     // const bm = schemaStorage.ExecuteOnBigMapDiff(meta.operation_result.big_map_diff)
//     // {
//     //     "prim": "Pair",
//     //     "args": [
//     //       {
//     //         "bytes": "0000040b740127d2e2bc9e45bb8f07e8ca20e3c96c4a"
//     //       },
//     //       {
//     //         "int": "10"
//     //       }
//     //     ]
//     //   }

//     // Extract schema to object
//     // const objSchema = schema.ExtractSchema()
//     // console.log(JSON.stringify(objSchema, null, 2))

//     // parse the storage
//     // const storage = contract.script.storage

//     // const bm = schema.ExecuteOnBigMapValue({ "prim": "Pair", "args": [{ "prim": "Pair", "args": [{ "prim": "Some", "args": [{ "bytes": "7b2262616b65724e616d65223a2022457665727374616b65222c2262616b65724163636f756e74223a2022747a314d584672745a6f6158636b453431626a5543536a416a416170334146445372334e222c227265706f727465724163636f756e74223a2022222c226f70656e466f7244656c65676174696f6e223a202274727565222c2262616b65724f6666636861696e526567697374727955726c223a2022222c226665654d6f64656c223a207b227061796f75744163636f756e7473223a205b5d2c22666565223a20223130222c226d696e44656c65676174696f6e223a202230222c227061796f757444656c6179223a20362c227061796f75744672657175656e6379223a202231222c227061796f757446726571756e6563794d696e5061796f7574223a20302c226f76657244656c65676174696f6e223a203130302c226f76657244656c65676174696f6e5374616b6544696c7574696f6e223a20747275652c2262616b6572436861726765735061796f75745472616e73616374696f6e466565223a20747275652c227265776172647350616964223a207b22626c6f636b52657761726473223a20747275652c226d6973736564426c6f636b73223a2066616c73652c2273746f6c656e426c6f636b73223a20747275652c22656e646f72736552657761726473223a20747275652c226d6973736564456e646f7273656d656e7473223a2066616c73652c226c6f775072696f72697479456e646f72736550616964417346756c6c223a2066616c73652c227472616e73616374696f6e46656573223a20747275652c2261636375736174696f6e52657761726473223a20747275652c22616363757365644c6f73744465706f736974223a2066616c73652c22616363757365644c6f737452657761726473223a2066616c73652c22616363757365644c6f737446656573223a2066616c73652c22726576656c6174696f6e52657761726473223a20747275652c226d6973736564526576656c6174696f6e223a2066616c73652c226d6973736564526576656c6174696f6e46656573223a2066616c73657d7d7d" }] }, { "prim": "None" }] }, { "int": "1569309836" }] })

//     console.log(JSON.stringify(bm, null, 2))
//     console.log()

// }
export function getTokenDailyReward(operation: Object): string {
    for (let i = 0; i < 3; i++) {
        const s = `operations:contents:${(<any>operation).operations.contents.length - 1}:metadata:operation_result:big_map_diff:${i}:key:args:1:int`
        const v = getReward(operation, s)
        if (v != null) { return v }
    }
}
export function getReward(operation: Object, reward: string): string {
    if (reward.length >= 7 && reward.substr(0, 7) == 'SPECIAL') {
        return 'SPECIAL'
    }
    if (reward.length >= 5 && reward.substr(0, 5) == 'DAILY') {
        return 'DAILY'
    }
    let val = operation
    for (const part of reward.split(':')) {
        if (Array.isArray(val)) {
            // // take the first
            // if (val.length === 0) return null
            // val = val[0]
            val = Object.assign({}, val)
        }
        if (typeof val === 'object' && val.hasOwnProperty(part)) {
            val = val[part]
        } else {
            return null
        }
    }

    return typeof val !== 'object' ? val : null
}

export async function getBlockHead(rpcClient: RpcUtil): Promise<BlockHeaderResponse> {
    try {
        const blockHead = (await rpcClient.getBlockHeader())
        return blockHead
    } catch (error) {
        console.error(new Date().toISOString(), error.message)
    }
    return null
}

export async function sendSlackMessage(message: string) {
    return new Promise((resolve, reject) => {
        const slackWebHook = process.env.SLACK_WEBHOOK
        if (slackWebHook) {
            const slack = new Slack(slackWebHook)
            slack.send({
                text: message,
                username: 'WatchdogQuest'
            }).then((result) => {

            }).catch((err) => {
                console.error(err.message)
            }).done(() => {
                resolve(null)
            })
        }
    })
}

export function getMetadataFromOperation(blockOperation: OperationEntry): OperationContentsAndResultMetadataTransaction {
    return (<any>blockOperation).contents.find(c => c.hasOwnProperty('metadata'))?.metadata
}