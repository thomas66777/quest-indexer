## Quest Error Handling

If any system critical errors happen you can get alerted via `Slack` on the `watchdog-quest` channel.  This uses the [SLACK_WEBHOOK](./env_config.md) token for authentication.

Alerts for:
* **uncaughtException**: causing process crash
* **transfer FA2**: alerts if either there is an on-chain error or a `taquito` library error
* **special processing**: errors in [Quest Auction](./quest_auction.md)
* **block orphans**: errors if block forked more than the number of block in [DETECT_ORPHAN_BLOCKS](./env_config.md)