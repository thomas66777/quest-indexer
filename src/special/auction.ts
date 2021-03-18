import { getBigMapAtBlockLevel, ValueElement } from '../utils-bcd'
import { Database } from 'better-sqlite3'

// Example response can be here:
// curl https://better-call.dev/v1/bigmap/delphinet/73954/keys/exprtZBwZUeYYYfUs9B9Rg2ywHezVHnCCnmF9WsDQVrs582dSK63dC | jq
export async function processAuction(contractAddress: string, blockLevel: number, db: Database, mapAuction) {
    const network = process.env.API_PREFIX
    const bigMap = await getBigMapAtBlockLevel(<any>network, contractAddress, 'auctions', blockLevel)

    // find the last bid
    for (const v of bigMap.values) {
        if (!v.value) { continue }
        const children = v.value.children
        const dataStorage = children.find(c => c.name == 'highest_bidder')
        if (dataStorage) {
            // add to the db
            const params = {
                type: 'auction',
                contract: contractAddress,
                result: JSON.stringify({
                    highest_bidder: dataStorage.value,
                    level: v.level,
                    key: bigMap.key.value,
                    key_hash: bigMap.key_hash,
                }),
                block_level: blockLevel,
            }
            db.prepare('insert or ignore into special (type, contract, result, block_level) values (:type, :contract, :result, :block_level)').run(params)
            mapAuction.delete(`${this.contractActionAddress}|${bigMap.key.value}`)
            break
        }
    }
}