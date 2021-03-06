import { Router, Request, Response, request } from 'express'
import jsend from 'jsend'
import assert from 'assert'
import { parseIsActive, parseSqlDate, REWARD_STATUS } from '../utils-db'
import { getQuestId } from '../utils-crypto'
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito'
import { Database } from 'better-sqlite3'
import { secretKeyToKeyPair, validContractAddress } from '../utils-tezos-keys'

const router: Router = Router()

router.get('/', (req: Request, res: Response) => {
    res.status(200).json(jsend.success(true))
})
router.get('/status', (req: Request, res: Response) => {
    const db: Database = req.app.get('db')
    const dbStatus = db.prepare('select * from indexer_status').get()

    res.status(200).json(jsend.success(dbStatus ? dbStatus : {}))
})
router.get('/special/:type?', async (req: Request, res: Response) => {
    try {
        const type = req.query.type || req.params.type
        assert(type, 'type is required')
        const db: Database = req.app.get('db')

        const result = db.prepare('select * from special').all()
        result.forEach(r => r.result = JSON.parse(r.result))
        res.status(200).json(jsend.success(result))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})

router.get('/rewards_pending/:game_id?/:from?', async (req: Request, res: Response) => {
    try {
        const game_id = req.query.game_id || req.params.game_id
        assert(game_id, 'must provide game_id')
        const db: Database = req.app.get('db')
        const from = req.query.from || req.params.from || db.prepare('select tezos_contract_fa2 from game where game_id = :game_id').pluck().get({ game_id })
        assert(validContractAddress(from), `invalid contract address ${from}`)

        const aryPending = db.prepare('select * from indexer_reward where game_id = :game_id and reward_status = :reward_status').all({ game_id, reward_status: REWARD_STATUS.AWAITING_ADMIN_TRANSFER })
        const Tezos = new TezosToolkit(process.env.RPC_ENDPOINT)

        const mapContracts: Map<string, ContractAbstraction<ContractProvider>> = req.app.get('mapContracts')
        if (!mapContracts.has(from)) {
            // cache the contracts so this doesnt have to load each time the endpoint is called
            mapContracts.set(from, await Tezos.contract.at(from))
        }
        const contractFA2: ContractAbstraction<ContractProvider> = mapContracts.get(from)

        // create the JSON transferParmas
        const txs = []
        for (const pending of aryPending) {
            txs.push({ to_: pending.reward_account, token_id: pending.token_id, amount: 0 })
        }
        const humanArgs = {
            from_: from, txs
        }

        const transferParamsFA2 = contractFA2.methods.transfer([humanArgs]).toTransferParams()

        res.status(200).json(jsend.success({ humanArgs, transferParamsFA2 }))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})
router.get('/daily_reward/:game_id?/:pkh?', (req: Request, res: Response) => {
    try {
        const game_id = <string>req.query.game_id || req.params.game_id
        const pkh = <string>req.query.pkh || req.params.pkh || ''
        assert(game_id, 'missing required paramaters')

        const reward_hash_id = pkh ? Number(getQuestId(game_id, pkh)) : 0

        const db: Database = req.app.get('db')
        const result = db.prepare(`
        select * 
        from daily_reward 
        where game_id = :game_id and (reward_hash_id = :reward_hash_id or :reward_hash_id=0)
        order by reward, block_level desc
        `).all({ reward_hash_id, game_id })
        result.forEach(r => r.meta = JSON.parse(r.meta))

        res.status(200).json(jsend.success(result))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})
router.get('/claim_reward/:game_id?/:pkh?', (req: Request, res: Response) => {
    try {
        const game_id = <string>req.query.game_id || req.params.game_id
        const pkh = <string>req.query.pkh || req.params.pkh || ''
        assert(game_id, 'missing required paramaters')

        const reward_hash_id = pkh ? Number(getQuestId(game_id, pkh)) : 0

        const db: Database = req.app.get('db')
        const result = db.prepare(`
        select * 
        from claim_reward 
        where game_id = :game_id and (reward_hash_id = :reward_hash_id or :reward_hash_id=0)
        order by reward, block_level desc
        `).all({ reward_hash_id, game_id })
        result.forEach(r => r.meta = JSON.parse(r.meta))

        res.status(200).json(jsend.success(result))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})
router.get('/quests/:game_id?/:pkh?', (req: Request, res: Response) => {
    try {
        const game_id = <string>req.query.game_id || req.params.game_id
        const pkh = <string>req.query.pkh || req.params.pkh || ''
        assert(game_id, 'missing required paramaters')
        const reward_hash_id = Number(getQuestId(game_id, pkh))

        const db: Database = req.app.get('db')

        const results = db
            .prepare(`
            select COALESCE(rs.status_description,'NOT_STARTED') as status, ir.reward_status,
            fil.quest_id, fil.game_id, fil.name, fil.description, fil.reward, fil.criteria,
            fil.time_start, fil.time_end,
            ir.reward_hash_id, ir.token_id, ir.reward_account,
            ir.time_stamp as quest_completed_timestamp, ir.block_level, ir.operation_idx, ir.chain_id, ir.hash,
            ir.reward_hash, ir.reward_block_level, ir.reward_block_timestamp
            from (
                select * from quest where game_id = :game_id
            ) fil
            left join (
                select * from indexer_reward where game_id = :game_id and reward_hash_id = :reward_hash_id
            ) ir on ir.quest_id = fil.quest_id and ir.game_id = fil.game_id
            left join reward_status rs on rs.status_id = ir.reward_status
            order by COALESCE(reward_status,0) desc, ir.block_level desc, fil.name
            `)
            .all({ game_id, reward_hash_id })

        const resultsMapped = results.map(r => {
            return {
                ...r,
                criteria: JSON.parse(r.criteria),
                time_start: parseSqlDate(r.time_start),
                time_end: parseSqlDate(r.time_end),
            }
        })
        resultsMapped.forEach(r => r.is_active = parseIsActive(r.time_start, r.time_end))

        res.status(200).json(jsend.success(resultsMapped))

    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})

router.get('/history/:game_id?', (req: Request, res: Response) => {
    try {
        const game_id = req.query.game_id || req.params.game_id
        const reward_hash_id = req.query.reward_hash_id || req.params.reward_hash_id || '%'
        const reward_status = req.query.reward_status || req.params.reward_status || '%'
        assert(game_id, 'missing required paramaters')

        const db: Database = req.app.get('db')

        const results = db
            .prepare(`
            select rs.status_description, ir.*
            from indexer_reward ir
            join reward_status rs on rs.status_id = ir.reward_status
            where game_id = :game_id and reward_hash_id like :reward_hash_id and reward_status like :reward_status`)
            .all({ game_id, reward_hash_id, reward_status })
        res.status(200).json(jsend.success(results.sort((a, b) => {
            // -completion status
            if (b.reward_status !== a.reward_status)
                return b.reward_status - a.reward_status
            if (b.block_level !== a.block_level)
                return b.block_level - a.block_level

            return 0
        })))

    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})


router.get('/games', (req: Request, res: Response) => {
    try {
        const db: Database = req.app.get('db')

        const results = db.prepare('SELECT * from game').all()

        res.status(200).json(jsend.success(results))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})

router.get('/admin_game/:game_id?', (req: Request, res: Response) => {
    try {
        const game_id = req.query.game_id || req.params.game_id
        assert(game_id, 'game_id is required')

        const db: Database = req.app.get('db')

        const results = db
            .prepare(`
            SELECT au.*
            from admin_game aq 
            join admin_user au on aq.admin_id = au.admin_id
            where aq.game_id = 1
            `)
            .all({ game_id })

        res.status(200).json(jsend.success(results))

    } catch (error) {
        res.status(400).json(jsend.error(error))

    }
})

router.post('/quest/add', (req: Request, res: Response) => {
    const aryRequiredFields = []
    try {
        assert(JSON.parse(process.env.WHITELIST_IP).includes(req.ip), 'Not allowed')
        const game_id = req.body.game_id
        const name = req.body.name
        const description = req.body.description
        const reward = req.body.reward
        const criteria = req.body.criteria
        // const pkh = req.body.pkh
        const sk = req.body.sk

        if (!game_id) { aryRequiredFields.push('game_id') }
        if (!name) { aryRequiredFields.push('name') }
        if (!description) { aryRequiredFields.push('description') }
        if (!reward) { aryRequiredFields.push('reward') }
        if (!criteria) { aryRequiredFields.push('criteria') }
        if (!sk) { aryRequiredFields.push('sk') }
        assert(aryRequiredFields.length === 0, `Missing Required Fields: ${JSON.stringify(aryRequiredFields)}`)

        const db: Database = req.app.get('db')

        // get admin_id
        const { pkh } = secretKeyToKeyPair(sk)
        const admin_id: number = db.prepare('select admin_id from admin_user where pub_key_hash = :pkh').pluck().get({ pkh })
        assert(admin_id, 'this pkh is not admin')

        const aryGamesIds: number[] = db.prepare('select game_id from admin_game where admin_id = :admin_id').pluck().all({ admin_id })
        assert(aryGamesIds.includes(Number(game_id)), 'this admin cannot modify this game criteria')

        // make sure it can parse JSON
        const criteriaAsJson = typeof criteria === 'string' ? JSON.parse(criteria) : criteria

        const sql = `
        INSERT INTO quest (game_id,name,description,reward,criteria) 
        VALUES (:game_id,:name,:description,:reward,:criteria);
        `

        const resDb = db.prepare(sql).run({ game_id, name, description, reward, criteria: JSON.stringify(criteriaAsJson) })

        res.status(200).json(jsend.success({ quest_id: resDb.lastInsertRowid }))
    } catch (error) {
        res.status(400).json(jsend.error(error))

    }
})
router.post('/set_filter_dates', (req: Request, res: Response) => {
    try {
        assert(JSON.parse(process.env.WHITELIST_IP).includes(req.ip), 'Not allowed')
        const quest_id = req.body.quest_id
        const timeStart = req.body.time_start
        const timeEnd = req.body.time_end

        assert(quest_id, 'missing required params')
        const time_start = timeStart ? new Date(timeStart).toISOString() : null
        const time_end = timeEnd ? new Date(timeEnd).toISOString() : null

        const db: Database = req.app.get('db')
        const result = db
            .prepare('update quest set time_start = :time_start, time_end = :time_end where quest_id = :quest_id')
            .run({ quest_id, time_start, time_end })

        res.status(200).json(jsend.success(result.changes))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})
router.delete('/remove_payouts/:game_id?/:pkh?', (req: Request, res: Response) => {
    try {
        assert(JSON.parse(process.env.WHITELIST_IP).includes(req.ip), 'Not allowed')
        const game_id = <string>req.query.game_id || req.params.game_id
        const pkh = <string>req.query.pkh || req.params.pkh

        assert(game_id && pkh, 'missing required params')

        const db: Database = req.app.get('db')
        const result = db.prepare('delete from indexer_reward where game_id = :game_id and reward_hash_id = :reward_hash_id').run({ game_id, reward_hash_id: getQuestId(game_id, pkh) })

        res.status(200).json(jsend.success(result.changes))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})
router.post('/inject_sql', (req: Request, res: Response) => {
    try {
        console.log('req.ip', req.ip)
        // from inside the server
        assert(JSON.parse(process.env.WHITELIST_IP).includes(req.ip), 'Not allowed')

        const db: Database = req.app.get('db')
        const result = db.prepare(req.body.sql).run()

        res.status(200).json(jsend.success(result))
    } catch (error) {
        res.status(400).json(jsend.error(error))
    }
})

export const ApiController: Router = router
