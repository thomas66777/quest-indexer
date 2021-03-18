export default [
    {
        name: 'FA2-reward',
        description: 'use this criteria to match when a token was paid to remove it from the pending db',
        destination: 'operations:contents:0:parameters:value:0:args:1:0:args:0:bytes',
        token_id: 'operations:contents:0:parameters:value:0:args:1:0:args:1:args:0:int',
        criteria: {
            'operations:chain_id': 'NetXm8tYqnMWky1',
            'operations:contents:kind': 'transaction',
            'operations:contents:amount': {
                eval: 'value == 0'
            },
            'operations:contents:parameters:entrypoint': 'transfer',
            // 'operations:contents:destination': 'KT1PS2jZVzNMW54UsnqBqwwkArXnAZ29jiTF',
        }
    },

]