## Quest Criteria

Each operation of the [block](./block_450404.md) is iterated through for [matching filters](./quest_operation_matching.md).  If a match is detected it is parsed from `reward` property of the filter to get the pkh address.  A pseudo random number is generated to determine the `token_id` for FA2 transfer:

* **reward property**: `operations:contents:0:source` means the `source` property the first `0` `contents` of the `operation`
    ```json
    "contents": [
        {
            ...
            "source": "tz1d9h3tviTEqmbjG4ioWjBLpJj7VrRQA4Gs",
            ...
        }
    ]
    ```
* **pseudo random number**: the sha256 of the concatenated `${operation.hash}${block.header.level}${quest_id}` is digested.  Then each byte of the sha256 Buffer is `added` together then `mod` number of possible tokens

All matches get written into the `db` with the [Reward Status](./reward_status.md) of `DETECTED_ON_CHAIN`

### Post Processing
After each block indexing a `Post Processing` procedure is called. This procedure queries the `db` for anything that with a status of `DETECTED_ON_CHAIN` that has reached the needed level of block confirmations by [FITNESS_LEVEL](./env_config.md).  It then updates the status to `AWAITING_ADMIN_TRANSFER`

### Orphan Blocks
Occasionally chain forks will occur near the `HEAD` block.  This can result in Orphans Blocks that have been indexed but are no longer part of the chain.  In these cases the Indexer will scan the blocks backwards from `HEAD` until the block at which the fork happened is found and purge the data in the `db` of any Orphans. The env property [DETECT_ORPHAN_BLOCKS](./env_config.md) will store the historical block header info for this purpose.