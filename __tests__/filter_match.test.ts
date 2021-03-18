import { getReward, getTokenDailyReward, parseFilter, propertiesToArray } from '../src/utils-functions'
import { addressFromHex } from '../src/utils-tezos-keys'
import block403915 from './block_examples/403915.json'
import block65323 from './block_examples/65323.json'
import block431941 from './block_examples/431941.json'
import block372547 from './block_examples/372547.json'
import block435077 from './block_examples/435077.json'
import block440804 from './block_examples/440804.json'
import block440867 from './block_examples/440867.json'
import block441012 from './block_examples/441012.json'
import block450404 from './block_examples/450404.json'


import block1340382 from './block_examples/1340382.json'
import block1340488 from './block_examples/1340488.json'

import dexter from '../src/config/dexter'
import quipuswap from '../src/config/quipuswap'
import { getOperationInBlockByHash } from '../src/utils-rpc'


describe('test filter match', () => {

    it('should match anything with amount over 1 XTZ', () => {
        const filter_1 = [{
            name: 'test',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:amount': {
                    eval: 'value >= 1000000'
                },
            }
        }]

        const aryShouldMatchHash = [
            'ooRiPk8L5t4tfG1dggPXAkubrXE1bLoZA9tzzHaMxhCp57Hb6Gx',
            'oosYq1kV9qNxU765uXHWr2oPtNNJ313z7bX81RFfsxQwXduGqNQ',
            'onok9LKTLiqTn82ch6wabWZ2PS28sCbDJCwj2hqRrPf8gF8Mxm3',
        ]
        const aryShouldMatchRewards = [
            'tz1dkLSGXbGxocN1QgxAp5tnYhY8VAaZ4kQp',
            'tz3Xo4AAiDFnKW5Su3BMmvRfuqqf3vjm2ckR',
            'tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf',
        ]

        const block: any = block403915
        const matches = []
        const aryRewards = []
        for (let i = 0; i < block.operations.length; i++) {
            const operations = block.operations[i]
            // for (const operations of block.operations) {
            for (const operation of operations) {
                const mutatableFilters = JSON.parse(JSON.stringify(filter_1)).map(f => f.criteria)
                const paths = propertiesToArray({ operations: operation }, mutatableFilters)
                if (Object.keys(mutatableFilters[0]).length === 0) {
                    matches.push(operation)
                    const reward = getReward({ operations: operation }, filter_1[0].reward)
                    aryRewards.push(reward)
                }
            }
        }

        // test I get the same result when using the parseFilter function
        const aryFilterMatches = parseFilter(block, filter_1)
        for (let idx = 0; idx < aryFilterMatches.length; idx++) {
            const { i, j, k } = aryFilterMatches[idx]
            const operation = block.operations[i][k]

            expect(matches[idx].hash).toBe(operation.hash)
        }

        expect(matches.length).toBe(3)
        expect(matches[0].hash).toBe(aryShouldMatchHash[0])
        expect(matches[1].hash).toBe(aryShouldMatchHash[1])
        expect(matches[2].hash).toBe(aryShouldMatchHash[2])

        expect(aryRewards[0]).toBe(aryShouldMatchRewards[0])
        expect(aryRewards[1]).toBe(aryShouldMatchRewards[1])
        expect(aryRewards[2]).toBe(aryShouldMatchRewards[2])
    })
    it('match direct auth', () => {
        const filter_1 = [{
            name: 'to-dirauth',
            description: 'Use Kukai wallet to send >= x amount of tez to a DirectAuth Kukai account',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:destination': {
                    eval: 'value.substr(0,3) == "tz2"',
                },
                'operations:contents:amount': {
                    eval: 'value >= 1000000'
                },
            }
        }]
        const block: any = block431941
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('ooPeBkhkpw9T3GNKcAvczD3r7SCKtrJe9Q4e5rEu5QLkNt7XtQ6')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf')

    })
    it('match from direct auth', () => {
        const filter_1 = [{
            name: 'from-dirauth',
            description: 'Use Kukai to send tez from a DirectAuth account to any recipient',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:source': {
                    eval: 'value.substr(0,3) == "tz2"',
                },
                'operations:contents:amount': {
                    eval: 'value >= 1000000'
                },
            }
        }]
        const block: any = block441012
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('ooTdnyv9kpLtPyBVjPS1uWn9HdhkKX33hemhR7sr8XqsTHXutPk')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz2RAaUUKkejGWvLyxeB75YnFDMULBws2g2M')

    })
    it('match domain', () => {
        const filter_1 = [{
            name: 'register-domain',
            description: 'Register a domain with Tezos Domains',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:destination': 'KT1Av7mi7s2tm7The7xZGQB5rX5g8sZTNrqN',
                'operations:contents:parameters:entrypoint': 'buy',
            }
        }]
        const block: any = block372547
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('oo17tEKirEnzzAGtSVjdrR2kX58KnZmeAP8Nc86S45pHxTJEA8L')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1aW9v8Ka7UCuoGFWjzag9Fv599mLbWVSq9')

    })
    it('match send FA transfer', () => {
        const filter_1 = [{
            name: 'send-FA2',
            description: 'Send Any FA2 token to a friend',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:destination': {
                    eval: 'value.substr(0,3) == "KT1"'
                },
                'operations:contents:parameters:entrypoint': 'transfer',
            }
        }]
        const block: any = block435077
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('oouVQmLVVCwFKK9CrcBGaV6gToZdwjuiBgv7mHyqCU5PavdePje')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf')

    })
    it('match dexter swap', () => {
        const filter_1 = [{
            name: 'dexter-swap',
            description: 'Perform a swap on Dexter',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXdQprcVkpaWU',
                'operations:contents:kind': 'transaction',
                'operations:contents:destination': {
                    eval: `[${dexter.map(d => `"${d.account}"`)}].includes(value)`
                },
                'operations:contents:parameters:entrypoint': {
                    eval: '["xtzToToken","tokenToXtz","tokenToToken"].includes(value)'
                },
            }
        }]
        const block: any = block1340382
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('op9L51KkUZ7ggU7oMZ5ciFatPgVnKaU979GxW4o4QZN2maqtexH')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1VCYSBLJqHdUrzz78bTeodjFAjwysk8zRo')
    })

    it('match dexter swap', () => {
        const filter_1 = [{
            name: 'dexter-liquidity',
            description: 'Provide liquidity on Dexter',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXdQprcVkpaWU',
                'operations:contents:kind': 'transaction',
                'operations:contents:amount': {
                    eval: 'value >= 1000000'
                },
                'operations:contents:destination': {
                    eval: `[${dexter.map(d => `"${d.account}"`)}].includes(value)`
                },
                'operations:contents:parameters:entrypoint': 'addLiquidity',
            }
        }]
        const block: any = block1340488
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('oofcmhA4LW6hFv5yow7LVtLEZWX6wtdMbtmHSyBiRznn6Cg6ixG')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1ae2d1BJt7YUqaaec6Xenh3mBqS7VjSZtK')
    })

    it('match quipuswap swap', () => {
        const filter_1 = [{
            name: 'quipuswap-swap',
            description: 'Perform a swap on Quipuswap',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:amount': {
                    eval: 'value >= 1000000'
                },
                'operations:contents:destination': {
                    eval: `[${quipuswap.map(d => `"${d.account}"`)}].includes(value)`
                },
                'operations:contents:parameters:entrypoint': 'use',
            }
        }]
        const block: any = block440804
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('opA7DDPaNhfXKpPkxvEpgJmdk3xwGrsiPd6z32noM7sGvswvKwg')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf')
    })
    it('match quipuswap liquidity', () => {
        const filter_1 = [{
            name: 'quipuswap-liquidity',
            description: 'Provide liquidity on Quipuswap',
            reward: 'operations:contents:0:source',
            criteria: {
                'operations:chain_id': 'NetXm8tYqnMWky1',
                'operations:contents:kind': 'transaction',
                'operations:contents:destination': {
                    eval: `[${quipuswap.map(d => `"${d.contract}"`)}].includes(value)`
                },
                'operations:contents:parameters:value:args:string': {
                    eval: `[${quipuswap.map(d => `"${d.account}"`)}].includes(value)`
                },
                'operations:contents:parameters:entrypoint': 'approve',
            }
        }]
        const block: any = block440867
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('opaM7uMQWUoTWqDqqsXbQyvHAUP1rL8LCJRRxeeu3Xky2jtCWVB')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf')
    })

    it('match transfer from FA2 contract; simulate an admin payment', () => {
        // https://better-call.dev/delphinet/KT1Tu6yYQDfvMXa1miDfR4HUoL4PJ5c17MHx/operations
        const filter_1 = [
            {
                name: 'FA2-reward',
                description: 'use this criteria to match when a token was paid to remove it from the pending db',
                to: 'operations:contents:0:parameters:value:0:args:1:0:args:0:bytes',
                token_id: 'operations:contents:0:parameters:value:0:args:1:0:args:1:args:0:int',
                criteria: {
                    'operations:chain_id': 'NetXm8tYqnMWky1',
                    'operations:contents:kind': 'transaction',
                    'operations:contents:amount': {
                        eval: 'value == 0'
                    },
                    'operations:contents:destination': 'KT1Tu6yYQDfvMXa1miDfR4HUoL4PJ5c17MHx',
                    'operations:contents:parameters:entrypoint': 'transfer',
                }
            }
        ]

        // This is an example of an FA2 transfer action on contract KT1Tu6yYQDfvMXa1miDfR4HUoL4PJ5c17MHx
        const matchHash = 'onongCgE3e7D9XBzMMUrN8Q4pBUZJKPxNaUrrmCwpCRGQXac1Yc'
        const matchTo = 'tz1bPqoeUCwhSrLBZKwYnti9zgULzTGUknAo'

        const block: any = block65323
        const operation = block.operations[3][1]
        expect(operation.hash).toBe(matchHash)
        const mutatableFilters = JSON.parse(JSON.stringify(filter_1)).map(f => f.criteria)
        propertiesToArray({ operations: operation }, mutatableFilters)

        // test I get the same result when using the parseFilter function
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)
        for (let idx = 0; idx < aryFilterMatches.length; idx++) {
            const { i, j, k } = aryFilterMatches[idx]
            const operation = block.operations[i][k]

            expect(i).toBe(3)
            expect(k).toBe(1)
            expect(operation.hash).toBe(matchHash)
        }



        expect(Object.keys(mutatableFilters[0]).length).toBe(0)

        const reward = getReward({ operations: operation }, filter_1[0].to)
        expect(reward).toBe('0000acd319c690982e4367cc6889f47c599f159c54d5')

        const tokenId = getReward({ operations: operation }, filter_1[0].token_id)
        expect(tokenId).toBe('0')

        // Convert bytes to address
        expect(addressFromHex(reward)).toBe(matchTo)

    })
    it('match daily reward', () => {
        // https://better-call.dev/delphinet/KT1Tu6yYQDfvMXa1miDfR4HUoL4PJ5c17MHx/operations
        const filter_1 = [
            {
                name: 'daily reward',
                description: 'Call contract for Daily reward',
                reward: 'operations:contents:0:source',
                criteria: {
                    'operations:chain_id': 'NetXm8tYqnMWky1',
                    'operations:contents:kind': 'transaction',
                    'operations:contents:amount': {
                        eval: 'value == 0'
                    },
                    'operations:contents:destination': 'KT1PS2jZVzNMW54UsnqBqwwkArXnAZ29jiTF',
                    'operations:contents:parameters:entrypoint': 'reward',
                }
            }
        ]

        const block: any = block450404
        const aryFilterMatches = parseFilter(block, filter_1)
        expect(aryFilterMatches.length).toBe(1)

        const { i, j, k } = aryFilterMatches[0]
        const operation = block.operations[i][k]
        expect(operation.hash).toBe('ooNDfSKFc4a1GktgAT2fJgs3aM54wPJzgdTtLjJLxZSY43orCNX')

        // get the reward account
        const reward = getReward({ operations: operation }, filter_1[0].reward)
        expect(reward).toBe('tz1QwPbZtpjJ3Jv7VJjFgs2dEcjqCFDhmzi2')


        const tokenId = getTokenDailyReward({ operations: operation })
        expect(tokenId).toBe('7')

    })
    it('test getOperationInBlockByHash', () => {
        const block: any = block450404
        const hash = 'ooNDfSKFc4a1GktgAT2fJgs3aM54wPJzgdTtLjJLxZSY43orCNX'
        const op = getOperationInBlockByHash(block, hash)
        expect(op).not.toBe(null)
        expect(op.hash).toBe(hash)
    })
})