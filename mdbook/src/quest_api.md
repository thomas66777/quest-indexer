## Swagger API docs

If running locally you can access your `Swagger API` with endpoint `/swagger`\
Ex: [http://127.0.0.1:7305/swagger](http://127.0.0.1:7305/swagger)

This endpoint will include any `API_PREFIX` set in your [.env](./env_config.md)\
Ex: [http://127.0.0.1:7305/mainnet/swagger](http://127.0.0.1:7305/mainnet/swagger)

> All endpoints start with `${host}/${API_PREFIX}/v1/` and will increment based on updates as to not disrupt legacy processes

### /v1 endpoint paths { GET }
```js
[
  '/',
  '/status',
  '/games',
  '/admin_game',
  '/daily_reward',
  '/quests',
  '/rewards_pending/{game_id}',
  '/special'
]
```
\
\
***

Currently public endpoints being supported here:
* **mainnet**: [https://reward.tezos.help/mainnet/swagger](https://reward.tezos.help/mainnet/swagger)
* **delphinet**: [https://reward.tezos.help/delphinet/swagger](https://reward.tezos.help/delphinet/swagger)
* **edo2net**: [https://reward.tezos.help/edo2net/swagger](https://reward.tezos.help/edo2net/swagger)
