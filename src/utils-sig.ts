import * as sotez from 'sotez'
import sodium from 'libsodium-wrappers'
import { blake2b } from 'blakejs'
import { ec as EC } from 'elliptic'
// const EC = require('elliptic').ec
import assert from 'assert'
import { bufferToNum, numToBuffer } from './utils-db'

const isHex = function (s: string) {
    return (sotez.utility.buf2hex(sotez.utility.hex2buf(s)) === s.toLowerCase())
}

export const verifySig = async function (hex: string, signature: string, pubKey: string): Promise<boolean> {
    await sodium.ready

    const sigCurve = signature.substring(0, 2)
    let sig: Uint8Array
    switch (sigCurve) {
        case 'ed':
            sig = sotez.utility.b58cdecode(signature, sotez.prefix.edsig)
            break
        case 'sp':
            sig = sotez.utility.b58cdecode(signature, sotez.prefix.spsig)
            break
        case 'p2':
            sig = sotez.utility.b58cdecode(signature, sotez.prefix.p2sig)
            break
        default:
            sig = sotez.utility.b58cdecode(signature, sotez.prefix.sig)
            break
    }

    // pk is hex format (Beacon does this for reasons not clear)
    let bytes: Uint8Array = sotez.utility.hex2buf(hex)
    if (pubKey.length == 64 && isHex(pubKey)) {
        const pk = Buffer.from(sotez.utility.hex2buf(pubKey))
        bytes = sodium.crypto_generichash(32, bytes)
        return sodium.crypto_sign_verify_detached(sig, bytes, pk)
    } else {
        const curve = pubKey.substring(0, 2)
        switch (curve) {
            case 'ed': {
                bytes = sodium.crypto_generichash(32, bytes)
                const pk = sotez.utility.b58cdecode(pubKey, sotez.prefix.edpk)
                return sodium.crypto_sign_verify_detached(sig, bytes, pk)
            }
            case 'sp':
            case 'p2': {
                bytes = blake2b(32).update(bytes).digest()
                const pk = sotez.utility.b58cdecode(pubKey, curve == 'sp' ? sotez.prefix.sppk : sotez.prefix.p2pk)
                const ec = new EC(curve == 'sp' ? 'secp256k1' : 'p256')
                const key = ec.keyFromPublic(pk)
                return key.verify(bytes, { r: sig.slice(0, 32), s: sig.slice(32) })
            }
        }
    }

    return false
}

export const getPubkeyHash = async function (pubKey: string): Promise<string> {
    await sodium.ready

    // pk is hex format (Beacon does this)
    if (pubKey.length == 64 && isHex(pubKey)) {
        const pk = Buffer.from(sotez.utility.hex2buf(pubKey))
        return sotez.utility.b58cencode(sodium.crypto_generichash(20, pk), sotez.prefix.tz1)
    } else {
        const curve = pubKey.substring(0, 2)
        switch (curve) {
            case 'ed': {
                const pk = sotez.utility.b58cdecode(pubKey, sotez.prefix.edpk)
                return sotez.utility.b58cencode(sodium.crypto_generichash(20, pk), sotez.prefix.tz1)
            }
            case 'sp': {
                const pk = sotez.utility.b58cdecode(pubKey, sotez.prefix.sppk)
                return sotez.utility.b58cencode(sodium.crypto_generichash(20, pk), sotez.prefix.tz2)
            }
            case 'p2': {
                const pk = sotez.utility.b58cdecode(pubKey, sotez.prefix.p2pk)
                return sotez.utility.b58cencode(sodium.crypto_generichash(20, pk), sotez.prefix.tz3)
            }
        }
    }
}

export const encodeStringToMichelson = (s: string): string => {
    const bufVal = Buffer.from(s, 'utf8')
    const buf: Uint8Array = new Uint8Array(bufVal.length + 6)

    // first byte is 5 to signify string
    buf[0] = 5
    // second byte is 1 to signify next 4 will be the length
    buf[1] = 1
    // next 4 bytes will be buffer length
    buf.set(numToBuffer(bufVal.length, 32).reverse(), 2)
    // the rest will be the val
    buf.set(bufVal, 6)

    return `0x${Buffer.from(buf).toString('hex')}`
}

export const decodeMichelsonToString = (hex: string): string => {
    assert(hex.length > 10, 'not long enough string')
    let hexVal = hex
    if (hex.substr(0, 2) == '0x') {
        hexVal = hex.substr(2)
    }
    // bytes 1 is 05 byte 2 is 01 and next 4 are length so need to cut off first 5
    const buf = Buffer.from(hexVal, 'hex')
    assert(buf[0] == 5, 'must be prefixed with 05 to be a Michelson String')
    assert(buf[1] == 1, 'must have second byte be 01')

    const byteLength = Number(bufferToNum(buf.slice(2, 6)))
    assert(buf.length == byteLength + 6, 'invalid byte length of string')

    return buf.slice(6).toString('utf8')
}