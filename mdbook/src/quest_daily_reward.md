## Quest Daily Rewards

This daily reward gets written into the `db` and can be accessed from the [API](./quest_api.md) endpoint `/v1/daily_reward`.  The daily reward is a special quest that can be done every day.  The operation filter for it looks like:

```js
{
    filter_type: 'DAILY',
    name: 'daily reward',
    reward: 'operations:contents:0:source',
    criteria: {
        'operations:chain_id': 'NetXm8tYqnMWky1',
        'operations:contents:kind': 'transaction',
        'operations:contents:amount': { 'eval': 'value == 0' },
        'operations:contents:parameters:entrypoint': 'reward',
        'operations:contents:destination': <contractFA2>,
    }
}   
```
> **contractFA2** is any/all Game Contracts

The token_id for the daily_reward is current extracted from the [block](./block_450404.md) by iterating through the metadata big_map_diff and finding the ledger changes:
```ts
export function getLedgerMeta(contract: ContractResponse, operation: OperationEntry): IBigMapLedger[] {
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
    const bigMapDiffDecoded = ledgerSchema.ExecuteOnBigMapDiff(bigMapLedgerDiffs)
    const ledgerBigMapDiffs: IBigMapLedger[] = []
    for (const entry of bigMapDiffDecoded.entries()) {
        // const keys = Object.keys(entry[0]).map(k => Number(k))
        const address = entry[0]['0'].toString()
        const token_id = entry[0]['1'].toString()
        const value = entry[1].toString()
        ledgerBigMapDiffs.push({
            address, token_id, value,
        })
    }
    // console.log('ledger => \n', JSON.stringify(entriesPairs, null, 2))
    return ledgerBigMapDiffs
}
```

Below is a break down this function:
* Derive the the contract schema.  The raw contract looks like [quest contract](./contract_quest.md)
* decode the storage pointers from the raw contract.  It will something like this:
    ```json
    {
        "admin": {
            "admin": "tz1ZufAMPExipHNGDUm88ZXJqn2fUi3V5hLd",
            "paused": false,
            "pending_admin": null
        },
        "assets": {
            "ledger": "38166",
            "operators": "38167",
            "token_metadata": "38168",
            "token_total_supply": "38169"
        },
        "metadata": "38170",
        "users": "38171"
    }
    ```
* find the `ledger` pointer, in this case for `edo2net` it is `38166`
* get the schema for ledger (where the `annots` is `%ledger`)
    * `$..args[?(@.annots == '%ledger')]`
    ```json
    {
        "prim": "big_map",
        "args": [
            {
                "prim": "pair",
                "args": [
                    {
                        "prim": "address"
                    },
                    {
                        "prim": "nat"
                    }
                ]
            },
            {
                "prim": "nat"
            }
        ],
        "annots": [
            "%ledger"
        ]
    }
    ```
* inside the metadata from the operation, the big_map_diff is found and filtered only where `big_map` is equal to `ledgerPtr`.  See [opertion](./operation_example.md) for an example operation metadata
    ```json
    {
        "action": "update",
        "big_map": "38166",
        "key_hash": "expruY8oYiagXWP11Z4Air5BKpqYcwErCxkQQpzKbnFey4Pkig7eN2",
        "key": {
            "prim": "Pair",
            "args": [
                {
                    "bytes": "00007c01f0b92731849bd501249bf4a30d48240e21e8"
                },
                {
                    "int": "16"
                }
            ]
        },
        "value": {
            "int": "1"
        }
    },
    {
        "action": "update",
        "big_map": "38166",
        "key_hash": "expru3SULaK5xPwNKyhevUwzYZabWMbNjAekNxsrzn2qLk4zAZ98ZN",
        "key": {
            "prim": "Pair",
            "args": [
                {
                    "bytes": "00009c8671920e9b4ac694058b5a69fedf3dede6ed5a"
                },
                {
                    "int": "16"
                }
            ]
        },
        "value": {
            "int": "49999"
        }
    }    
    ```
* The BigMapDiffs are then decoded based on the `ledgerSchema` and encoded into an object like the below:
    ```json
    [
        {
            "address": "tz1Wwioir9n34AL3wDiPE2fP7KvjPgL7HNst",
            "token_id": "16",
            "value": "1"
        },
        {
            "address": "tz1ZufAMPExipHNGDUm88ZXJqn2fUi3V5hLd",
            "token_id": "16",
            "value": "49999"
        }
    ]
    ```
* to get the `token_id` for the API endpoint, the first `token_id` found with the `reward` address is used