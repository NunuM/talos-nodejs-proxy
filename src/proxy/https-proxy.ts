import {LOGGER} from "../service/logger-service";
import * as https from "https";
import {Socket} from "net";
import {Proxy} from "./proxy";
import {Http1Request, ServerRequest} from "../model/request";
import {Http1Response, ServerResponse} from "../model/response";
import fs from "fs";


export class HttpsProxy implements Proxy {

    private readonly _port: number;
    private readonly _options: https.ServerOptions;

    private _server: https.Server | undefined;

    constructor(private port: number, options: https.ServerOptions = {}) {
        this._port = port;
        this._options = options;
    }

    /**
     * @inheritDoc
     */
    start(handler: (request: ServerRequest, response: ServerResponse) => void) {

        const optionsWithCerts = Object.assign(this._options, {
            //@ts-ignore
            key: fs.readFileSync(this._options.key),
            //@ts-ignore
            cert: fs.readFileSync(this._options.cert)
        });

        this._server = https.createServer(optionsWithCerts, (req, res) => {

            handler(new Http1Request(req), new Http1Response(res));

        })
            .on('clientError', (err, socket) => {
                //@ts-ignore
                if (err && err.code && err.code === 'ECONNRESET' || !socket.writable) {
                    return;
                }

                LOGGER.error("Client error", err);

                socket.end('HTTP/1.1 588 Bad request\r\n\r\n');
            })
            .on('connection', (connection: Socket) => {
                LOGGER.debug(`Receive new connection with remote IP: ${connection.remoteAddress}`);
            })
            .on('error', (e) => {
                LOGGER.error(`Occurred an error on proxy server: ${e.message}`);
                this._server?.close();
            })
            .listen(this._port, () => {
                LOGGER.info(`HTTPs Server is running at: ${this._port}`);
            });
    }

    /**
     * @inheritDoc
     */
    close(): Promise<boolean> {
        if (this._server) {
            return new Promise<boolean>((resolve, reject) => {
                this._server?.close((error) => {
                    if (error) {
                        LOGGER.error("Error closing HTTPs server", error);
                        reject(error);
                    } else {
                        resolve(true);
                    }
                });

            });
        }

        return Promise.resolve(true);
    }

}
