import { BlockHeaderResponse, BlockResponse } from '@taquito/rpc'
import Database from 'better-sqlite3'
import Slack from 'node-slack'
import { RpcUtil } from './utils-rpc'

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
export function getTokenDailyReward(operation: Object): string {
    for (let i = 0; i < 3; i++) {
        const s = `operations:contents:0:metadata:operation_result:big_map_diff:${i}:key:args:1:int`
        const v = getReward(operation, s)
        if (v) { return v }
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