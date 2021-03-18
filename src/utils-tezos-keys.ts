import Bs58check from 'bs58check'
import { blake2b } from 'blakejs'
import { sign as naclSign } from 'tweetnacl'
import assert from 'assert'

const _prefix = {
    tz1: new Uint8Array([6, 161, 159]),
    tz2: new Uint8Array([6, 161, 161]),
    tz3: new Uint8Array([6, 161, 164]),
    edpk: new Uint8Array([13, 15, 37, 217]),
    edsk: new Uint8Array([43, 246, 78, 7]),
    edsig: new Uint8Array([9, 245, 205, 134, 18]),
    sig: new Uint8Array([4, 130, 43]),
    o: new Uint8Array([5, 116]),
    B: new Uint8Array([1, 52]),
    TZ: new Uint8Array([3, 99, 29]),
    KT1: new Uint8Array([2, 90, 121]),
}
export interface KeyPair {
    sk: string | null;
    pk: string | null;
    pkh: string;
}
const hexToBuf = (hex: string): Uint8Array => {
    return Uint8Array.from(
        hex.match(/[\da-f]{2}/gi).map(function (h) {
            return parseInt(h, 16)
        })
    )
}

const bufToHex = (buffer: Uint8Array): string => {
    const byteArray = Uint8Array.from(buffer),
        hexParts = []
    for (let i = 0; i < byteArray.length; i++) {
        const hex = byteArray[i].toString(16)
        const paddedHex = ('00' + hex).slice(-2)
        hexParts.push(paddedHex)
    }
    return hexParts.join('')
}
const base58encode = (payload: Uint8Array, pre?: Uint8Array): string => {
    const n = new Uint8Array(pre.length + payload.length)
    n.set(pre)
    n.set(payload, pre.length)
    return Bs58check.encode(Buffer.from(bufToHex(n), 'hex'))
}

const base58decode = (enc: string, pre: Uint8Array): Uint8Array => {
    let n = Bs58check.decode(enc)
    n = n.slice(pre.length)
    return n
}

export const validSecretKey = (sk: string): boolean => {
    return sk && sk.length === 98 &&
        validBase58string(sk, 'edsk')
}
const validBase58string = (base58string: string, pre: string): boolean => {
    try {
        let b58prefix: Uint8Array
        if (
            base58string.slice(0, pre.length) === pre &&
            Object.prototype.hasOwnProperty.call(_prefix, pre)
        ) {
            b58prefix = _prefix[pre]
        } else {
            return false
        }
        base58decode(base58string, b58prefix)
        return true
    } catch {
        return false
    }
}
export function secretKeyToKeyPair(sk: string): KeyPair {
    if (!validSecretKey) {
        throw new Error('Invalid secret key')
    }
    const keyPair = naclSign.keyPair.fromSecretKey(base58decode(sk, _prefix.edsk))
    return {
        sk: base58encode(keyPair.secretKey, _prefix.edsk),
        pk: base58encode(keyPair.publicKey, _prefix.edpk),
        pkh: base58encode(blake2b(keyPair.publicKey, null, 20), _prefix.tz1),
    }
}

export const validAddress = (address: string): boolean => {
    return validImplicitAddress(address) || validContractAddress(address)
}
export const validImplicitAddress = (address: string): boolean => {
    return (
        address && address.length === 36 &&
        (validBase58string(address, 'tz1') ||
            validBase58string(address, 'tz2') ||
            validBase58string(address, 'tz3'))
    )
}

export const validContractAddress = (address: string): boolean => {
    return address && address.length === 36 &&
        validBase58string(address, 'KT1')
}

export function addressToHex(address: string): string {
    if (!validAddress(address)) {
        throw new TypeError('Invalid address')
    } else if (address.slice(0, 2) === 'KT') {
        return '01' + bufToHex(base58decode(address, _prefix.KT1)) + '00'
    } else if (address.slice(0, 3) === 'tz1') {
        return '0000' + bufToHex(base58decode(address, _prefix.tz1))
    } else if (address.slice(0, 3) === 'tz2') {
        return '0001' + bufToHex(base58decode(address, _prefix.tz2))
    } else if (address.slice(0, 3) === 'tz3') {
        return '0002' + bufToHex(base58decode(address, _prefix.tz3))
    } else {
        throw new Error('Base58DecodingError')
    }
}

// TODO: add in the KT prefix if ever needed
export function addressFromHex(hex: string): string {
    assert(hex.length == 44, 'invalid address hex length')
    const pre = hex.slice(0, 4)
    let prefix
    let addressHex
    if (pre == '0000') {
        prefix = _prefix.tz1
        addressHex = hex.slice(4)
    } else if (pre == '0001') {
        prefix = _prefix.tz2
        addressHex = hex.slice(4)
    } else if (pre == '0002') {
        prefix = _prefix.tz3
        addressHex = hex.slice(4)
    } else if (hex.slice(0, 2) == '01') {
        prefix = _prefix.KT1
        addressHex = hex.slice(2, 42)
    }
    return base58encode(new Uint8Array(Buffer.from(addressHex, 'hex')), prefix)
}