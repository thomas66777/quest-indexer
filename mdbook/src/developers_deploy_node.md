
> Simply run with default config
```bash
# simple start using env config
npm run start
```

> Run with logging
```bash
# run with seperate logging for console and errors
node ./dist/index.js >>log-console 2>>log-error
```

> Run with custom options
```bash
# support for cli options
# see all supported cli options
node ./dist/index.js --help
node ./dist/index.js --path-env=my_custom_env
```

> Run Headless as daemon process
```bash
# or to run as a daemon process
npm run start:daemon --silent
```