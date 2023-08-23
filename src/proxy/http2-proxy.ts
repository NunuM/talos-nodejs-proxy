import {Proxy} from "./proxy";
import * as http2 from "http2";
import {Http2Request, ServerRequest} from "../model/request";
import {Http2Response, ServerResponse} from "../model/response";
import {LOGGER} from "../service/logger-service";


export class Http2Proxy implements Proxy {

    private readonly _port: number;
    private readonly _options: http2.SecureServerOptions;

    private _server?: http2.Http2SecureServer;

    constructor(port: number, options: http2.SecureServerOptions = {}) {
        this._port = port;
        this._options = options;
    }

    /**
     * @inheritDoc
     */
    start(handler: (request: ServerRequest, response: ServerResponse) => void): void {
        this._server = http2.createSecureServer(this._options);

        this._server.on('stream', (stream, headers) => {
            handler(new Http2Request(stream, headers), new Http2Response(stream));
        });

        this._server.on('connection', (connection) => {
            LOGGER.info(`Receive new connection with remote IP: ${connection.remoteAddress}`);
        });

        this._server.on('sessionError', (error) => {
            LOGGER.error("Session error", error);
        });

        this._server.on('unknownProtocol', (socket) => {
            LOGGER.error('unknownProtocol');
        })

        this._server.on('error', (e) => {
            LOGGER.error(`Occurred an error on proxy server: ${e.message}`);
            this._server?.close();
        });

        this._server.listen(this._port, () => {
            LOGGER.info(`HTTP2 Server is running at: ${this._port}`);
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
