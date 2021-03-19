## BCA Auction

Special logic is created for the [BCA Auction House](https://auctions.alchememist.com/)

The [operation match](./quest_operation_matching.md) looks like:

* **MAINNET**
    ```js
    {
        name: 'auction',
        description: 'SPECIAL process for auction resolve MAINNET',
        reward: 'SPECIAL:auction',
        criteria: {
            'operations:chain_id': 'NetXdQprcVkpaWU',
            'operations:contents:destination': 'KT1HvpCCHvC9c4iNzAa6rx4MqNsmPRJf6CEw',
            'operations:contents:kind': 'transaction',
            'operations:contents:parameters:entrypoint': 'resolve'
        }
    }
    ```
* **EDO2NET**
    ```js
    {
        name: 'auction',
        description: 'SPECIAL process for auction resolve EDO2NET',
        reward: 'SPECIAL:auction',
        criteria: {
            'operations:chain_id': 'NetXSgo1ZT2DRUG',
            'operations:contents:destination': 'KT1WkhPFfhydqqPXWrYFkN9gfpgus1XXCeHy',
            'operations:contents:kind': 'transaction',
            'operations:contents:parameters:entrypoint': 'resolve',
        }
    }
    ```
* **DELPHINET**
    ```js
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
    }
    ```

### Indexing
Once a match is detected the contract address `operations:contents:destination` is used to get the `auction` BigMap at that `BlockLevel` using the [BETTER_CALL_DEV_ENDPOINT](./env_config.md) endpoint

```js
export async function getBigMapAtBlockLevel(network: 'delphinet' | 'edo2net' | 'mainnet', contractAddress: string, bigmapName: string, blockLevel: number): Promise<IBCDBigMap> {
    const urlPrefix = process.env.BETTER_CALL_DEV_ENDPOINT || 'https://better-call.dev/v1/'

    const storage: IBCDStorage = (await axios.get(`${urlPrefix}contract/${network}/${contractAddress}/storage`)).data
    const ptr = storage.children.find(c => c.name == bigmapName)
    assert(ptr, `cannot find name ${bigmapName} in contract ${contractAddress}, in network ${network}`)

    const diffCount = Number((await axios.get(`${urlPrefix}bigmap/${network}/${ptr.value}/count`)).data.count)
    const aryBigMapKeys: IBCDBigMapKeys[] = (await axios.get(`${urlPrefix}bigmap/${network}/${ptr.value}/keys`)).data
    // assert(diffCount == aryBigMapKeys.length, 'mismatch key length to diff count')

    const key = aryBigMapKeys.find(k => k.data.level == blockLevel)
    assert(key, `cannot find key ${bigmapName} in contract ${contractAddress}, in network ${network}, at this blockLevel ${blockLevel}`)

    const bigMap = (await axios.get(`${urlPrefix}bigmap/${network}/${ptr.value}/keys/${key.data.key_hash}`)).data
    return bigMap
}
```

The purpose of this is to find the `highest_bidder` child value and write it into the `db` at the [/v1/special](./quest_api.md) endpoiont

### Post Processing
There is special Post Processing for the BCA Auction House.  The `end_time` and `auction_id` child value is found from [BETTER_CALL_DEV_ENDPOINT](./env_config.md):

```js
const network = process.env.API_PREFIX
const urlPrefix = process.env.BETTER_CALL_DEV_ENDPOINT || 'https://better-call.dev/v1/'
const storage: IBCDAuctionStorage = (await axios.get(`${urlPrefix}contract/${network}/${this.contractAuctionAddress}/storage`)).data
const bigMapKey = storage.children.find(c => c.name == 'auctions').value
const bigMapAction: IBCDBigMapAuction[] = (await axios.get(`${urlPrefix}bigmap/${network}/${bigMapKey}/keys`)).data
```

If the current_time is greater than the `end_time` in the contract BigMap it will call the `resolve` endpoint with the `auction_id`
