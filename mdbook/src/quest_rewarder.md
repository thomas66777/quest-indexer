## Quest Rewarder

The Quest Rewarder issues FA2 tokens for any [Quests](./quest_criteria.md) that have a [Reward Status](./reward_status.md) of `AWAITING_ADMIN_TRANSFER`

* This process scans the `db` for anything with a [Reward Status](./reward_status.md) of `AWAITING_ADMIN_TRANSFER` and batches together any pending transfers by the `tezos_signer` required by the game contract.  The `tezos_signer` can be seen in the [/v1/games](./quest_api.md) endpoint.  
* It will inject the FA2 transfers and update the [Reward Status](./reward_status.md) to `MEMORY_POOL`.  
* Once the chain accepts the FA2 transfer and the fitness level has been reached the [Reward Status](./reward_status.md) is updated to `CONFIRMED` or `ERROR` if the `metadata.operation_result.status !== 'applied'`