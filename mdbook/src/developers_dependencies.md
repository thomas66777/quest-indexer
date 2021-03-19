## Project Dependencies

### Dependencies
#### node v14.16.0
Recommend to use [NVM](https://github.com/nvm-sh/nvm#installing-and-updating)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash

# nvm install <SPECIFIC_NODE_VERSION>
nvm install v14.16.0
nvm use v14.16.0

node -v
# v14.16.0
```

#### TypeScript
[TypeScript](https://github.com/Microsoft/TypeScript)
```bash
npm install -g typescript
```

#### sqlite dependencies
[Troubleshooting guide](https://github.com/JoshuaWise/better-sqlite3/blob/HEAD/docs/troubleshooting.md)

```bash
# install build-essentials
sudo apt-get update && sudo apt-get install build-essential

# install node-gyp
npm install -g node-gyp
```
