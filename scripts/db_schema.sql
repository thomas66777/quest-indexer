BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS "special" (
	"type"	TEXT NOT NULL,
	"contract"	TEXT NOT NULL,
	"result"	TEXT NOT NULL,
	"block_level"	INTEGER NOT NULL,
	UNIQUE("type","contract","result")
);
CREATE TABLE IF NOT EXISTS "game" (
	"game_id"	INTEGER,
	"game_name"	TEXT NOT NULL UNIQUE,
	"game_desc"	TEXT NOT NULL,
	"tezos_contract_fa2" TEXT NOT NULL UNIQUE,
	"tezos_signer" TEXT NOT NULL,
	PRIMARY KEY("game_id")
);
CREATE TABLE IF NOT EXISTS "game_tokens" (
	"game_id"	INTEGER,
	"token_id"	INTEGER,
	FOREIGN KEY("game_id") REFERENCES "game"("game_id"),
	PRIMARY KEY("game_id","token_id")
);

CREATE TABLE IF NOT EXISTS "admin_user" (
	"admin_id"	INTEGER,
	"pub_key"	TEXT NOT NULL UNIQUE,
	"pub_key_hash"	TEXT NOT NULL UNIQUE,
	PRIMARY KEY("admin_id" AUTOINCREMENT)
);
CREATE TABLE IF NOT EXISTS "reward_status" (
	"status_id"	INTEGER NOT NULL,
	"status_description"	INTEGER NOT NULL,
	CONSTRAINT "reward_status_UN" UNIQUE("status_id")
);
CREATE TABLE IF NOT EXISTS "admin_game" (
	"admin_id"	INTEGER,
	"game_id"	INTEGER,
	FOREIGN KEY("admin_id") REFERENCES "admin_user"("admin_id"),
	UNIQUE("admin_id","game_id"),
	FOREIGN KEY("game_id") REFERENCES "game"("game_id")
);
CREATE TABLE IF NOT EXISTS "operation_filter" (
	"filter_id"	INTEGER NOT NULL,
	"game_id"	INTEGER NOT NULL,
	"name"	text NOT NULL,
	"description"	text NOT NULL,
	"reward"	text NOT NULL,
	"criteria"	text NOT NULL,
	"time_start" TIMESTAMP NULL,
	"time_end" TIMESTAMP NULL,
	UNIQUE("game_id","name"),
	PRIMARY KEY("filter_id" AUTOINCREMENT),
	FOREIGN KEY("game_id") REFERENCES "game"("game_id")
);
CREATE TABLE IF NOT EXISTS "daily_reward" (
	"id"	INTEGER,
	"game_id"	INTEGER NOT NULL,
	"reward_hash_id"	INTEGER NOT NULL,
	"token_id"	INTEGER NULL,
	"reward"	TEXT NOT NULL,
	"time_stamp"	TEXT NOT NULL,
	"block_level"	INTEGER NOT NULL,
	"operation_idx"	INTEGER NOT NULL,
	"chain_id"	TEXT NOT NULL,
	"hash"	TEXT NOT NULL,
	"meta"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("game_id") REFERENCES "game"("game_id")
);

CREATE TABLE IF NOT EXISTS "claim_reward" (
	"id"	INTEGER,
	"game_id"	INTEGER NOT NULL,
	"reward_hash_id"	INTEGER NOT NULL,
	"reward"	TEXT NOT NULL,
	"time_stamp"	TEXT NOT NULL,
	"block_level"	INTEGER NOT NULL,
	"operation_idx"	INTEGER NOT NULL,
	"chain_id"	TEXT NOT NULL,
	"hash"	TEXT NOT NULL,
	"meta"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	FOREIGN KEY("game_id") REFERENCES "game"("game_id")
);

CREATE TABLE IF NOT EXISTS "indexer_reward" (
	"id"	INTEGER,
	"game_id"	INTEGER NOT NULL,
	"reward_hash_id"	INTEGER NOT NULL,
	"token_id"	INTEGER NOT NULL,
	"reward_status"	INTEGER NOT NULL,
	"reward_account"	TEXT NOT NULL,
	"filter_id"	INTEGER NOT NULL,
	"time_stamp"	TEXT NOT NULL,
	"block_level"	INTEGER NOT NULL,
	"operation_idx"	INTEGER NOT NULL,
	"chain_id"	TEXT NOT NULL,
	"hash"	TEXT NOT NULL,
	"reward_hash"	TEXT,
	"reward_counter"	INT,
	"reward_bytes"	TEXT,
	"reward_block_level"	INTEGER,
	"reward_block_timestamp"	TEXT,
	"reward_block_status"	TEXT,
	"reward_block_errors"	TEXT,
	PRIMARY KEY("id" AUTOINCREMENT),
	UNIQUE("reward_hash_id","filter_id"), -- makes sure that only one reward per user per game
	-- UNIQUE("reward_hash"), -- for now unique, only one trx per reward so it is easier to join back together
	FOREIGN KEY("filter_id") REFERENCES "operation_filter"("filter_id"),
	FOREIGN KEY("reward_status") REFERENCES "reward_status"("status_id"),
	FOREIGN KEY("game_id") REFERENCES "game"("game_id")
);
CREATE TABLE IF NOT EXISTS "indexer_block_history" (
	"chain_id"	TEXT NOT NULL,
	"block_hash"	TEXT NOT NULL,
	"block_hash_previous"	TEXT NOT NULL,
	"block_timestamp"	TEXT NOT NULL,
	"block_level"	INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS "indexer_status" (
	"chain_id"	TEXT NOT NULL,
	"block_hash"	TEXT NOT NULL,
	"block_hash_previous"	TEXT NOT NULL,
	"block_timestamp"	TEXT NOT NULL,
	"block_level"	INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS "indexer_reward_game_id_IDX" ON "indexer_reward" (
	"game_id"
);
CREATE INDEX IF NOT EXISTS "indexer_reward_block_level_IDX" ON "indexer_reward" (
	"block_level"	DESC
);
CREATE INDEX IF NOT EXISTS "indexer_reward_status_IDX" ON "indexer_reward" (
	"reward_status"	DESC
);
CREATE INDEX IF NOT EXISTS "indexer_game_reward_IDX" ON "indexer_reward" (
	"game_id", "reward_account"
);
CREATE INDEX IF NOT EXISTS "indexer_game_reward_hash_idX" ON "indexer_reward" (
	"game_id", "reward_hash_id"
);

CREATE INDEX IF NOT EXISTS "daily_reward_reward_hash_idX" ON "daily_reward" (
	"reward_hash_id"
);
CREATE INDEX IF NOT EXISTS "claim_reward_reward_hash_idX" ON "claim_reward" (
	"reward_hash_id"
);


COMMIT;
