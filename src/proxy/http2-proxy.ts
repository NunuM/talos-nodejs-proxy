import {Proxy} from "./proxy";
import * as http2 from "http2";
import {Http2CompatibleModeRequest, Http2Request, ServerRequest} from "../model/request";
import {Http2CompatibleModeResponse, Http2Response, ServerResponse} from "../model/response";
import {LOGGER} from "../service/logger-service";
import {protocolFrom} from "../model/protocol";
import fs from "fs";


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

        const optionsWithCerts = Object.assign(this._options, {
            //@ts-ignore
            key: fs.readFileSync(this._options.key),
            //@ts-ignore
            cert: fs.readFileSync(this._options.cert)
        });

        if (this._options.allowHTTP1) {
            this._server = http2.createSecureServer(optionsWithCerts, (request, response) => {
                handler(
                    new Http2CompatibleModeRequest(request),
                    new Http2CompatibleModeResponse(response, protocolFrom(request))
                );
            });
        } else {
            this._server = http2.createSecureServer(optionsWithCerts);

            this._server.on('stream', (stream, headers) => {
                handler(new Http2Request(stream, headers), new Http2Response(stream));
            });
        }

        this._server.on('connection', (connection) => {
            LOGGER.debug(`Receive new connection with remote IP: ${connection.remoteAddress}`);
        });

        this._server.on('sessionError', (error) => {
            LOGGER.error("Session error", error);
        });

        this._server.on('unknownProtocol', (socket) => {
            LOGGER.error('unknownProtocol', socket.alpnProtocol);
        });

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
