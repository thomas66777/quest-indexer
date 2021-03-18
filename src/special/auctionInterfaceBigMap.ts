export interface IBCDAuctionStorage {
    prim: string;
    type: string;
    children: {
        prim: string;
        type: string;
        name: string;
        children?: {
            prim?: string;
            type?: string;
            name: string;
            value?: boolean | string;
        }[];
        value?: number | string;
    }[];
}


export interface IBCDBigMapAuction {
    data: Data;
    count: number;
}

export interface Data {
    key: Key;
    value: Value;
    key_hash: string;
    key_string: string;
    level: number;
    timestamp: string;
}

export interface Key {
    prim: Prim;
    type: Prim;
    value: string;
    name?: KeyName;
}

export enum KeyName {
    Amount = 'amount',
    TokenID = 'token_id',
}

export enum Prim {
    Address = 'address',
    Int = 'int',
    List = 'list',
    Mutez = 'mutez',
    Nat = 'nat',
    Timestamp = 'timestamp',
}

export interface Value {
    prim: string;
    type: string;
    children: ValueChild[];
}

export interface ValueChild {
    prim: Prim;
    type: Prim;
    name: string;
    value?: string;
    children?: PurpleChild[];
}

export interface PurpleChild {
    prim: string;
    type: string;
    children: FluffyChild[];
}

export interface FluffyChild {
    prim: Prim;
    type: Prim;
    name: PurpleName;
    value?: string;
    children?: TentacledChild[];
}

export interface TentacledChild {
    prim: string;
    type: string;
    children: Key[];
}

export enum PurpleName {
    Fa2Address = 'fa2_address',
    Fa2Batch = 'fa2_batch',
}
