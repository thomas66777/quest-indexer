## Deploying the Quest Indexer

* Run as Node process

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