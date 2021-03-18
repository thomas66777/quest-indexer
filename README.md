## Quest System

Add queries to check for predefined types of on-chain activity. Run a process on the results which:

* makes a call to a contract to “reward the account which performed the onchain activity
* writes to an off-chain database which accounts were *rewarded* in order to filter them out of the next query result

## Swagger API docs

Visit Swagger with endpoint `/swagger` Ex: [http://127.0.0.1:7305/swagger](http://127.0.0.1:7305/swagger)
This endpoint will include any `API_PREFIX` set in your `.env`. Ex: Ex: [http://127.0.0.1:7305/mainnet/swagger](http://127.0.0.1:7305/mainnet/swagger)

> All endpoints start with `${host}/${API_PREFIX}/v1/` and will increment based on updates as to not disrupt legacy processes

## Setting filters

#### filter.config.ts

The indexer will match and index anything that is in the `filter.config.ts` file.  The file must be structured like this:

```js
name: { type: 'string' },
description: { type: 'string' },
reward: { type: 'string' },
criteria: { type: 'object' },
```

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

## Build and Run
```bash
# use node version v14.15.5 in .nvmrc
nvm use

# update npm
npm install -g npm

# currently using node version v15.5.0 but should work for older
npm install

# copy _dev.env and configure .env as desired
cp _dev.env .env

# run the indexer and api server
npm run build

# run test
npm run tests
```

### Run as Node process
```bash
# simple start using env config
npm run start

# or to run as a daemon process
npm run start:daemon --silent
```

## To run as a systemd process
```bash
sudo mkdir /opt/quest-indexer && sudo chown $USER /opt/quest-indexer
cd /opt/quest-indexer

git clone https://gitlab.com/Thomas66777/quest-indexer.git ./
cp _dev.env .env
npm install
npm run build

sudo bash -c 'cat >> /etc/systemd/system/quest-indexer.service <<EOL
[Unit]
Description=quest-indexer
After=syslog.target
After=network.target

[Service]
Type=simple
ExecStart=node /opt/quest-indexer/dist/index.js
Restart=always
WorkingDirectory=/opt/quest-indexer

[Install]
WantedBy=multi-user.target
EOL'

sudo systemctl daemon-reload

# To start systemd service now
sudo systemctl start quest-indexer.service

# To start at system boot
sudo systemctl enable quest-indexer.service
```