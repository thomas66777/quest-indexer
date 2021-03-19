## Quest Criteria

The Quest Indexer runs by scanning each block on chain.  It used the `rpc` endpoint `chains/main/blocks/${block_level}` to get all the block data. The indexer uses the [envioronment](./env_config.md) variables to determine:
* **BLOCK_START**: block to start indexing
* **BLOCK_END**: block to stop indexing
* **RPC_ENDPOINT**: base url for the `RPC` node
* **CHAIN_ID**: chain_id to match for the `RPC` node
* **POLLING_FREQUENCY**: how frequently to check for new blocks

The first thing the indexer does is determine the current `BlockLevel` of the chain.  The indexer will then synchronize by its state to the current Head Block.  The indexer keeps track of its own state which can seen at the [API](./quest_api.md) endpoint `status`.  If the indexer process is ever stopped or killed it will start back from where it left off.

Each block is then iterated through by its operations to identify any [Daily Rewards](./quest_daily_reward.md), [Quest Completed](./quest_criteria.md), and [Special Auctions](./quest_auction.md)


 runs through each block on chain and checks for predefined types of on-chain activity. Run a process on the results which:

* makes a call to a contract to “reward the account which performed the onchain activity
* writes to an off-chain database which accounts were *rewarded* in order to filter them out of the next query result
