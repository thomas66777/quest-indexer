## Building the Quest Indexer

```bash
# use node version v14.16.0 in .nvmrc
nvm use

# update npm
npm install -g npm

# install all the packages
npm install

# copy _dev.env and configure .env as desired
# See more information about the config below
cp _dev.env .env

# build the indexer and api server
npm run build

# run test
npm run tests
```

> configure your environment [environment .env config](./env_config.md)
