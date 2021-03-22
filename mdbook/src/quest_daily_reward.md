## Quest Daily Rewards

The daily reward is a special quest that can be done every day.  The operation filter for it looks like:

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

The token_id for the daily_reward is current extracted from the [block](./block_450404.md) by iterating through the metadata and taking the first int argument in the big_map_diff:
```js
`operations:contents:${operations:contents.length-1}:metadata:operation_result:big_map_diff:${i}:key:args:1:int`
```

This daily reward gets written into the `db` and can be accessed from the [API](./quest_api.md) endpoint `/v1/daily_reward`