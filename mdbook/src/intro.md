## Quest System

The `Quest System` is a nodejs server written in `typescript` and uses `sqlite` as its backend database. The indexer has three main components:
* **[Quest Indexer](./quest_indexer.md)**: identify when a specific `quest` defined by [filter criteria](./quest_operation_matching.md) has been completed on chain
* **[Quest Rewarder](./quest_rewarder.md)**: transfer an FA2 token to the user who has completed the quest
* **[API](./quest_api.md)**: provide an API server for Apps to query and get live information
