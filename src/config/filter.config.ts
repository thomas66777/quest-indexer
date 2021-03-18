import dexter from './dexter'
import dexterDelphi from './dexter_delphinet'
import quipuswap from './quipuswap'

export default [
    /* TODO: need to finalize contract specs before including */
    // {
    //     name: 'mint-FA2',
    //     description: 'Mint an FA2 token in minter contract',
    //     reward: 'operations:contents:source',
    //     criteria: {
    //         'operations:chain_id': 'NetXm8tYqnMWky1',
    //         'operations:contents:kind': 'contract',
    //         'operations:contents:contract': 'tz3....',
    //     }
    // },

    /* Easy dev test */
    // {
    //     name: 'test',
    //     description: 'DEV ONLY: easy filters to pass; any transaction over 1 XTZ',
    //     reward: 'operations:contents:0:source',
    //     criteria: {
    //         'operations:chain_id': 'NetXm8tYqnMWky1',
    //         'operations:contents:kind': 'transaction',
    //         'operations:contents:amount': {
    //             eval: 'value >= 1000000'
    //         },
    //     }
    // },
    {
        name: 'auction',
        description: 'SPECIAL process for auction resolve DELPHINET',
        reward: 'SPECIAL:auction',
        criteria: {
            'operations:chain_id': 'NetXm8tYqnMWky1',
            'operations:contents:destination': 'KT1GNhJgAKRorY41TtbqFMKGFkSyCdPiuk2i',
            'operations:contents:kind': 'transaction',
            'operations:contents:parameters:entrypoint': 'resolve',
        }
    },
    {
        name: 'auction',
        description: 'SPECIAL process for auction resolve EDONET',
        reward: 'SPECIAL:auction',
        criteria: {
            'operations:chain_id': 'NetXSgo1ZT2DRUG',
            'operations:contents:destination': 'KT1WkhPFfhydqqPXWrYFkN9gfpgus1XXCeHy',
            'operations:contents:kind': 'transaction',
            'operations:contents:parameters:entrypoint': 'resolve',
        }
    },
    {
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
    },
    {
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
    },
    // https://docs.tezos.domains/deployed-contracts/delphinet
    // https://delphinet.tezos.domains/
    {
        name: 'register-domain',
        description: 'Register a domain with Tezos Domains',
        reward: 'operations:contents:0:source',
        criteria: {
            'operations:chain_id': 'NetXm8tYqnMWky1',
            'operations:contents:kind': 'transaction',
            'operations:contents:destination': 'KT1Av7mi7s2tm7The7xZGQB5rX5g8sZTNrqN',
            'operations:contents:parameters:entrypoint': 'buy',
        }
    },
    {
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
    },
    {
        name: 'send-contrct',
        description: 'Send an FA2 token in a defined contract X to any recipient',
        reward: 'operations:contents:0:source',
        criteria: {
            'operations:chain_id': 'NetXm8tYqnMWky1',
            'operations:contents:kind': 'transaction',
            'operations:contents:destination': '<KT1...>',
            'operations:contents:parameters:entrypoint': 'transfer',
        }
    },
    {
        name: 'contrct-to-dauth',
        description: 'Send an FA2 token in a defined contract X to a Twitter (DirectAuth) user',
        reward: 'operations:contents:0:source',
        criteria: {
            'operations:chain_id': 'NetXm8tYqnMWky1',
            'operations:contents:kind': 'transaction',
            'operations:contents:source': {
                eval: 'value.substr(0,3) == "tz2"',
            },
            'operations:contents:destination': '<KT1...>',
            'operations:contents:parameters:entrypoint': 'transfer',
        }
    },

    // https://quipuswap.com/
    {
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
    },
    {
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
    },

    /* This would be for delphinet */
    // https://test.app.dexter.exchange/
    {
        name: 'dexter-swap',
        description: 'Perform a swap on Dexter',
        reward: 'operations:contents:0:source',
        criteria: {
            'operations:chain_id': 'NetXdQprcVkpaWU',
            'operations:contents:kind': 'transaction',
            'operations:contents:destination': {
                eval: `[${dexterDelphi.map(d => `"${d.account}"`)}].includes(value)`
            },
            'operations:contents:parameters:entrypoint': {
                eval: '["xtzToToken","tokenToXtz","tokenToToken"].includes(value)'
            },
        }
    },
    {
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
                eval: `[${dexterDelphi.map(d => `"${d.account}"`)}].includes(value)`
            },
            'operations:contents:parameters:entrypoint': 'addLiquidity',
        }
    },
    /* This would be for mainnet */
    // https://app.dexter.exchange/
    // https://better-call.dev/mainnet/KT1DrJV8vhkdLEj76h1H9Q4irZDqAkMPo1Qf/code
    {
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
    },
    {
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
    },
]