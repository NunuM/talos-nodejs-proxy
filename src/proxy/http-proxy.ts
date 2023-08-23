import * as http from "http";
import {LOGGER} from "../service/logger-service";
import {Proxy} from "./proxy";
import {Http1Request, ServerRequest} from "../model/request";
import {Http1Response, ServerResponse} from "../model/response";

export class HttpProxy implements Proxy {

    private readonly _port: number;
    private readonly _options: http.ServerOptions;

    private _server: http.Server | undefined;

    constructor(port: number, options: http.ServerOptions = {}) {
        this._port = port;
        this._options = options;
    }

    /**
     * @inheritDoc
     */
    start(handler: (request: ServerRequest, response: ServerResponse) => void) {
        this._server = http.createServer(this._options,

            (req, res) => {

                handler(new Http1Request(req), new Http1Response(res));
            })
            .on('clientError', (err, socket) => {
                LOGGER.error("HTTP Server ClientError ", err);

                //@ts-ignore
                if (err && err.code && err.code === 'ECONNRESET' || !socket.writable) {
                    return;
                }

                socket.end('HTTP/1.1 588 Bad request\r\n\r\n');
            })
            .on('connection', (connection) => {
                LOGGER.info(`Receive new connection with remote IP: ${connection.remoteAddress}`);
            })
            .on('error', (e) => {
                LOGGER.error(`Occurred an error on proxy server: ${e.message}`);
                this._server?.close();
            })
            .listen(this._port, () => {
                LOGGER.info(`HTTP Server is running at: ${this._port}`);
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
                        LOGGER.error("Error closing HTTP server", error);
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
