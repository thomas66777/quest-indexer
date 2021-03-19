## Quest System

Add queries to check for predefined types of on-chain activity. Run a process on the results which:

* makes a call to a contract to “reward the account which performed the onchain activity
* writes to an off-chain database which accounts were *rewarded* in order to filter them out of the next query result

#### filter.config.ts

The `criteria` object matches the properties on each block.  For example:

> 'operations:chain_id': 'NetXm8tYqnMWky1'
> matches a block structure like:

Note: *Arrays will get flattened* into objects for this matching criteria

```js
  "operations": [
    [
      {
        ...
        "chain_id": "NetXm8tYqnMWky1"
        ...
      }
    ]
  ]
```

eval logic is also accepted for more complex matches.  Example:

```js
// match anything greater than or equal to 1 XTZ (6 decimal precision)
'operations:contents:amount': { eval: 'value >= 1000000' }

// match when the first three letters of the destination are "tz2"
'operations:contents:destination': { eval: 'value.substr(0,3) == "tz2"' }
```

#### filter_reward.config.ts

Once the filter above matches it is important for the system to know when the FA2 reward was transferred to the user.  This filter is used to match when the admin account issues the FA2 to the account so that the indexer can update the status from `AWAITING_ADMIN_TRANSFER` to `COMPLETE`:

```js
name: { type: 'string' },
description: { type: 'string' },
to: { type: 'string' },
token_id: { type: 'string' },
criteria: { type: 'object' },
```

Note: *Arrays will NOT get flattened*

Example:

```js
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
```

Matches the following:
```js
{
    "chain_id": "NetXm8tYqnMWky1",
    "hash": "onongCgE3e7D9XBzMMUrN8Q4pBUZJKPxNaUrrmCwpCRGQXac1Yc",
    "contents": [
        {
            "kind": "transaction",
            "source": "tz1TfLF61NboKZYbU7hxX3C1jXw45im6d8Kt",
            "destination": "KT1Tu6yYQDfvMXa1miDfR4HUoL4PJ5c17MHx",
            "amount": "0",
            "parameters": {
                "entrypoint": "transfer",
                "value": [...]
            }
        }
    ]
}
```

