import http from 'http'
import https from 'https'
import fs from 'fs'

import express from 'express'

import swaggerUi from 'swagger-ui-express'

import cors from 'cors'
import bodyParser from 'body-parser'
import jsend from 'jsend'
import { ContractAbstraction, ContractProvider, TezosToolkit } from '@taquito/taquito'
import { InMemorySigner, importKey } from '@taquito/signer'

import { ApiController } from './routes/api'
import swaggerDocument from './swagger.json'
import { Database } from 'better-sqlite3'

// import swaggerOptions from '../../swagger'
// const swaggerDocs = swaggerJsDoc({ swaggerDefinition: { swaggerOptions }, apis: ['../routes/*.js'] })

export class AppServer {
    private _app: express.Express;
    private _server: http.Server | https.Server;

    constructor(rootDir: string, db: Database) {
        const ip = String(process.env.API_BINDIP)
        const port = Number(process.env.API_PORT)

        this._app = createExpressApp()

        // Plugin the Routes
        const baseApiEndpoint = `/${process.env.API_PREFIX}/v1`.replace(/\/\//, '/')
        const baseApiSwagger = `/${process.env.API_PREFIX}/swagger`.replace(/\/\//, '/')

        this._app.use(baseApiSwagger, swaggerUi.serve, swaggerUi.setup({
            ...swaggerDocument,
            servers: [
                {
                    'url': baseApiEndpoint,
                    'description': 'base api for endpoints'
                }
            ]
        }))
        this._app.use(baseApiEndpoint, ApiController)

        this._server = getHttpServer(rootDir, this._app)
        this._server.listen(port, ip, () => {
            console.info(`Server running on ${ip}:${port}`)
        })
        this._app.set('trust proxy', true)
        this._app.set('db', db)
        this._app.set('mapContracts', new Map())
    }

}
export function getHttpServer(rootDir: string, app?: express.Express, ssl?: boolean): http.Server | https.Server {
    if (ssl ?? JSON.parse(process.env.API_SSL)) {
        const privateKey = fs.readFileSync(process.env.CA_PRIVATE_KEY_PEM)
        const certificate = fs.readFileSync(process.env.CA_CERTIFICATE_PEM)

        return https.createServer({
            key: privateKey,
            cert: certificate
        }, app)
    } else {
        return http.createServer(app)
    }
}

export function createExpressApp(): express.Express {
    const app = express()

    // Create a Socket Server
    // this._socketServer = new SocketServer(app);

    // For now allow cors but later need to lock this down with IP Adress or credential based access
    // app.use(cors({credentials: true, origin: true}));
    app.use(cors())



    // set the resources folder
    app.use(jsend.middleware)

    // middleware
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())

    return app
}

