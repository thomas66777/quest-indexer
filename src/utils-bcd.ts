import assert from 'assert'
import axios from 'axios'

export interface IBCDStorage {
    prim: string;
    type: string;
    children: Child[];
}

export interface Child {
    prim: string;
    type: string;
    name: string;
    value: number | string;
}

export interface IBCDBigMapKeys {
    data: Data;
    count: number;
}

export interface Data {
    key: Key;
    value: null;
    key_hash: string;
    key_string: string;
    level: number;
    timestamp: string;
}

export interface Key {
    prim: string;
    type: string;
    value: string;
}


export interface IBCDBigMap {
    key: {
        prim: string;
        type: string;
        value: string;
    };
    key_hash: string;
    values: ValueElement[];
    total: number;
}
export interface ValueElement {
    value: ValueValue | null;
    level: number;
    timestamp: string;
}
export interface ValueValue {
    prim: string;
    type: string;
    children: any[];
}

export async function getBigMapAtBlockLevel(network: 'delphinet' | 'edo2net' | 'mainnet', contractAddress: string, bigmapName: string, blockLevel: number): Promise<IBCDBigMap> {
    const urlPrefix = process.env.BETTER_CALL_DEV_ENDPOINT || 'https://better-call.dev/v1/'

    const storage: IBCDStorage = (await axios.get(`${urlPrefix}contract/${network}/${contractAddress}/storage`)).data
    const ptr = storage.children.find(c => c.name == bigmapName)
    assert(ptr, `cannot find name ${bigmapName} in contract ${contractAddress}, in network ${network}`)

    const diffCount = Number((await axios.get(`${urlPrefix}bigmap/${network}/${ptr.value}/count`)).data.count)
    const aryBigMapKeys: IBCDBigMapKeys[] = (await axios.get(`${urlPrefix}bigmap/${network}/${ptr.value}/keys`)).data
    // assert(diffCount == aryBigMapKeys.length, 'mismatch key length to diff count')

    const key = aryBigMapKeys.find(k => k.data.level == blockLevel)
    assert(key, `cannot find key ${bigmapName} in contract ${contractAddress}, in network ${network}, at this blockLevel ${blockLevel}`)

    const bigMap = (await axios.get(`${urlPrefix}bigmap/${network}/${ptr.value}/keys/${key.data.key_hash}`)).data
    return bigMap
}

