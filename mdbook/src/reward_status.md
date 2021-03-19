## Reward Status

***

| status_id | enum | description |
| --- | ----------------------- | --- |
| 1   | DETECTED_ON_CHAIN       | When the [Quest Criteria](./quest_criteria.md) matches it is written into the `db` |
| 2   | AWAITING_ADMIN_TRANSFER | Updated once to this status when the block [FITNESS_LEVEL](./env_config.md) has been reached |
| 3   | MEMORY_POOL             | The [Quest Rewarder](./quest_rewarder.md) scans the `db` for anything `AWAITING_ADMIN_TRANSFER` and initiates the FA2 transfer |
| 4   | CONFIRMED               | Once the [FITNESS_LEVEL](./env_config.md) of the FA2 transfer is reached |
| 5   | ERROR                   | If there was an Error in the FA2 transfer |