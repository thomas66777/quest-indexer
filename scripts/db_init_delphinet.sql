BEGIN TRANSACTION;

INSERT INTO reward_status (status_id,status_description) VALUES (1,'DETECTED_ON_CHAIN');
INSERT INTO reward_status (status_id,status_description) VALUES (2,'AWAITING_ADMIN_TRANSFER');
INSERT INTO reward_status (status_id,status_description) VALUES (3,'MEMORY_POOL');
INSERT INTO reward_status (status_id,status_description) VALUES (4,'CONFIRMED');
INSERT INTO reward_status (status_id,status_description) VALUES (5,'ERROR');

insert into admin_user (pub_key,pub_key_hash) values ('edpkvHtwEi3pNY5KdUcnbzDtLvxLzRoJRVKvKc7sHVxWqk2VAtES9G','tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf');

insert into game(game_name,game_desc,tezos_contract_fa2,tezos_signer) values ('mystery puzzle', 'first example Tezos Puzzle', 'KT1PS2jZVzNMW54UsnqBqwwkArXnAZ29jiTF','');
insert into game(game_name,game_desc,tezos_contract_fa2,tezos_signer) values ('BCA Auction House', 'auctions', 'KT1ExCAaYfdoiY1S5AJ2Y8Y2PBv8KFTM53yr','tz1NXuEyKGjGXAEn5gSqzgwhkEqNeN5wcaLf');
insert into game(game_name,game_desc,tezos_contract_fa2,tezos_signer) values ('BCA Puzzles', 'another Tezos Puzzle', 'KT1TWb6cE56q2L8yTeNNchXqDSXacrNqyVNZ','tz1h9R2dPcQArNUnaxtzgMC9DSHkppHsis6V');

insert or ignore into admin_game values(1,1);
insert or ignore into admin_game values(1,2);
insert or ignore into admin_game values(1,3);

insert or ignore into game_tokens values
	(1,1),(1,2),(1,3),(1,4),(1,5),(1,6),(1,7),(1,8),(1,9),(1,10),
	(1,11),(1,12),(1,13),(1,14),(1,15),(1,16),(1,17),(1,18),(1,19),(1,20);

insert or ignore into game_tokens values
	(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8),(3,9),(3,10),
	(3,11),(3,12),(3,13),(3,14),(3,15),(3,16),(3,17),(3,18),(3,19),(3,20);

-- INSERT INTO quest (game_id,name,description,reward,criteria) 
-- VALUES (2,'auction','','SPECIAL:auction','{"operations:chain_id":"NetXdQprcVkpaWU","operations:contents:destination":"KT1HvpCCHvC9c4iNzAa6rx4MqNsmPRJf6CEw","operations:contents:kind":"transaction","operations:contents:parameters:entrypoint":"resolve"}');

INSERT or ignore INTO quest (game_id,name,description,reward,criteria) VALUES
	 (2,'auction','','SPECIAL:auction','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:destination":"KT1ExCAaYfdoiY1S5AJ2Y8Y2PBv8KFTM53yr","operations:contents:kind":"transaction","operations:contents:parameters:entrypoint":"resolve"}'),
     (1,'transfer','transfer over 1 XTZ','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:amount":{"eval":"value >= 1000000"}}'),
	 (1,'to-dirauth','Use Kukai wallet to send >= x amount of tez to a DirectAuth Kukai account','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":{"eval":"value.substr(0,3) == \"tz2\""},"operations:contents:amount":{"eval":"value >= 1000000"}}'),
	 (1,'from-dirauth','Use Kukai to send tez from a DirectAuth account to any recipient','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:source":{"eval":"value.substr(0,3) == \"tz2\""},"operations:contents:amount":{"eval":"value >= 1000000"}}'),
	 (1,'register-domain','Register a domain with Tezos Domains','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":"KT1Av7mi7s2tm7The7xZGQB5rX5g8sZTNrqN","operations:contents:parameters:entrypoint":"buy"}'),
	 (1,'send-FA2','Send Any FA2 token to a friend','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":{"eval":"value.substr(0,3) == \"KT1\""},"operations:contents:parameters:entrypoint":"transfer"}'),
	 (1,'send-contrct','Send an FA2 token in a defined contract X to any recipient','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":"<KT1...>","operations:contents:parameters:entrypoint":"transfer"}'),
	 (1,'contrct-to-dauth','Send an FA2 token in a defined contract X to a Twitter (DirectAuth) user','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:source":{"eval":"value.substr(0,3) == \"tz2\""},"operations:contents:destination":"<KT1...>","operations:contents:parameters:entrypoint":"transfer"}'),
     (3,'transfer','transfer over 1 XTZ','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:amount":{"eval":"value >= 1000000"}}'),
	 (3,'to-dirauth','Use Kukai wallet to send >= x amount of tez to a DirectAuth Kukai account','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":{"eval":"value.substr(0,3) == \"tz2\""},"operations:contents:amount":{"eval":"value >= 1000000"}}'),
	 (3,'from-dirauth','Use Kukai to send tez from a DirectAuth account to any recipient','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:source":{"eval":"value.substr(0,3) == \"tz2\""},"operations:contents:amount":{"eval":"value >= 1000000"}}'),
	 (3,'register-domain','Register a domain with Tezos Domains','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":"KT1Av7mi7s2tm7The7xZGQB5rX5g8sZTNrqN","operations:contents:parameters:entrypoint":"buy"}'),
	 (3,'send-FA2','Send Any FA2 token to a friend','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":{"eval":"value.substr(0,3) == \"KT1\""},"operations:contents:parameters:entrypoint":"transfer"}'),
	 (3,'send-contrct','Send an FA2 token in a defined contract X to any recipient','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:destination":"<KT1...>","operations:contents:parameters:entrypoint":"transfer"}'),
	 (3,'contrct-to-dauth','Send an FA2 token in a defined contract X to a Twitter (DirectAuth) user','operations:contents:0:source','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:source":{"eval":"value.substr(0,3) == \"tz2\""},"operations:contents:destination":"<KT1...>","operations:contents:parameters:entrypoint":"transfer"}');


-- INSERT INTO operation_reward (game_id,name,description,destination,token_id,criteria) 
-- VALUES (1,'FA2-reward','use this criteria to match when a token was paid to remove it from the pending db','operations:contents:0:parameters:value:0:args:1:0:args:0:bytes','operations:contents:0:parameters:value:0:args:1:0:args:1:args:0:int','{"operations:chain_id":"NetXm8tYqnMWky1","operations:contents:kind":"transaction","operations:contents:amount":{"eval":"value == 0"},"operations:contents:destination":"KT1PS2jZVzNMW54UsnqBqwwkArXnAZ29jiTF","operations:contents:parameters:entrypoint":"transfer"}');


COMMIT;
