## Configure Environment

Create a file `.env` in root dir or use the `--path-env=<file>` option when running the process.
> use the _dev.env as a guide for creating your own

```bash
# Server Config
API_BINDIP="127.0.0.1"
API_PORT="7305"
API_PREFIX="edo2net"
API_SSL=false # true if you want server to be SSL but will need to also include certificate CA_PRIVATE_KEY_PEM and CA_CERTIFICATE_PEM

# REQUIRED if API_SSL is true and you want nodejs to run https instead of http
CA_PRIVATE_KEY_PEM=""
CA_CERTIFICATE_PEM=""

# This is currently only needed to special auction contract big_map diff
BETTER_CALL_DEV_ENDPOINT="https://better-call.dev/v1/"

# This needs to be a string array of secret keys that will be used for automatic Quest Rewards
# If this is not provide you will need to manually issue any rewards
SIGNER_SK='["edskRuDGPt64QMY3hmC1xg7MZTSMpsLnmoHRvkJDaWH7tfnzYhr8NGfK3ZNeaVxSbgzzTtkyGQecjbLgEZ6BSkfEnrN1xbmCS2","edskRjPHRWoqy6qkobFDHPBs6SP6dYeuhb6i64kEqvwFegYaugyoRmLvjgTYg6dsHzBXEyFoezh4dz9jrhrbv6HAYkrqsEs4So"]'

# path to sqlite
DB_PATH="./db/indexer.db"

# This is for interacting with the RPC node
# https://github.com/ecadlabs/taquito/blob/master/docs/rpc_nodes.md
# https://tezostaquito.io/docs/rpc_nodes
RPC_ENDPOINT="https://edonet.smartpy.io"
CHAIN_ID="NetXSgo1ZT2DRUG"

# (Optional) for special processing of the auction contract
AUCTION_CONTRACT="KT1WkhPFfhydqqPXWrYFkN9gfpgus1XXCeHy"

# Polling Frequency of the Quest Criteria Process
POLLING_FREQUENCY=20000 # Every 20 seconds
# Polling Frequency of the Quest Rewarder Process
POLLING_BROADCAST=2000 # Every 2 seconds
# block_level to start the syncronizing the indexer on chain
BLOCK_START=96000
# block_level to stop the indexer. If 0 it will continue indefinitely
BLOCK_END=0

# How many blocks to keep in memory for resyncing in case of forks, orphans, or uncles
DETECT_ORPHAN_BLOCKS=20

# how many block confirmation are needed before a block is considered safe
FITNESS_LEVEL=3

# Maximum time to wait for a FA2 reward to move from mempool into block
# If the FA2 transfer does not confirm within this time, an error will be recorded and will have to be looked into manually
# The Quest Rewarder process will continue with the next batch after timeout is reached
TAQUITO_TIMEOUT=600 # 10 min

# https://api.slack.com/apps
# https://api.slack.com/apps/<app_id>/incoming-webhooks
# To receive notifications of errors Slack
SLACK_WEBHOOK=""
```
