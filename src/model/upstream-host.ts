import https from "https";
import {LOGGER} from "../service/logger-service";
import {Http2ProxyRequestOptions, ProxyRequestOptions} from "./proxy-request-options";
import * as http2 from "http2";
import {ClientSessionOptions, SecureClientSessionOptions} from "http2";
import util from "util";
import {ClientResponse, Http1ClientResponse, Http2ClientResponse} from "./response";
import {ClientRequest, Http1ClientRequest, Http2ClientRequest} from "./request";
import http from "http";


export class UpstreamHost {

    private _host: string;
    private _port: number;
    private _isOnline: boolean;
    private _isHTTPS: boolean;
    private _isHTTP2: boolean;
    private _isHTTP: boolean;

    private _connection?: http2.ClientHttp2Session;

    /**
     * @constructor
     * @param {string} host
     * @param {number} port
     * @param {boolean} [isAlive=true]
     * @param {boolean} [isHTTPS=false]
     * @param {boolean} [isHTTP2=false]
     * @param {boolean} [isHTTP=true]
     */
    constructor(host: string,
                port: number,
                isAlive: boolean = true,
                isHTTPS: boolean = false,
                isHTTP2: boolean = false,
                isHTTP: boolean = false) {
        this._host = host;
        this._port = port;
        this._isOnline = isAlive;
        this._isHTTPS = isHTTPS;
        this._isHTTP2 = isHTTP2;
        this._isHTTP = isHTTP;
    }

    /**
     * IP Address
     * @return {string}
     */
    get host(): string {
        return this._host;
    }

    /**
     * Set IP Address
     * @param {string} value
     */
    set host(value: string) {
        this._host = value;
    }

    /**
     * Upstream port
     * @return {number}
     */
    get port(): number {
        return this._port;
    }

    /**
     * Define port
     * @param {number} value
     */
    set port(value: number) {
        this._port = value;
    }

    /**
     * Check upstream state
     *
     * @return {boolean}
     */
    get isOnline(): boolean {
        return this._isOnline;
    }

    /**
     * Set upstream state
     *
     * @return {boolean}
     */
    set isOnline(value: boolean) {
        this._isOnline = value;
    }

    get isHTTP(): boolean {
        return this._isHTTP;
    }

    /**
     * Only has HTTPS
     *
     * @return {boolean}
     */
    get isHTTPS(): boolean {
        return this._isHTTPS;
    }

    /**
     *
     * @return {boolean}
     */
    get isHTTP2(): boolean {
        return this._isHTTP2;
    }

    /**
     * Set HTTPS
     *
     * @param {boolean} value
     */
    set isHTTPS(value) {
        this._isHTTPS = value;
    }

    /**
     * Set HTTP
     *
     * @param {boolean} value
     */
    set isHTTP(value: boolean) {
        this._isHTTP = value;
    }

    /**
     * Set HTTP2
     *
     * @param {boolean} value
     */
    set isHTTP2(value) {
        this._isHTTP2 = value;
    }

    clean(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (this._connection) {
                this._connection.close(() => {
                    resolve(true)
                });
            } else {
                resolve(true);
            }
        })
    }

    getOrCreateConnection(client: ClientSessionOptions | SecureClientSessionOptions): Promise<http2.ClientHttp2Session> {
        return new Promise<http2.ClientHttp2Session>((resolve, reject) => {
            if (this.isHTTP2 && (!this._connection || this._connection.destroyed)) {
                this._connection = http2.connect(
                    new URL(util.format("https://%s:%d", this._host, this._port)), client,
                    (session) => {
                        resolve(session);
                    });

                this._connection.once('error', (error) => {
                    LOGGER.error('Http2 upstream error', this, error);
                    this._connection = undefined;
                    reject(error);
                });

            } else if (this._connection) {
                resolve(this._connection);
            } else {
                reject(new Error("Invalid Http2 host"));
            }
        });
    }

    async request(options: ProxyRequestOptions, handler: (response: ClientResponse) => void): Promise<ClientRequest> {
        try {

            if (this.isHTTP) {

                const clientRequest = http.request(options, (res) => {
                    handler(new Http1ClientResponse(res))
                });

                return new Http1ClientRequest(clientRequest);

            } else if (this.isHTTPS) {

                const clientRequest = https.request(options, (res) => {
                    handler(new Http1ClientResponse(res))
                });

                return new Http1ClientRequest(clientRequest);

            } else {

                const requestOptions = options as Http2ProxyRequestOptions;

                const client = await this.getOrCreateConnection(requestOptions.client);

                const clientHttp2Stream = client.request(requestOptions.headers, requestOptions.options);

                clientHttp2Stream.on('response', (headers, flags) => {
                    handler(new Http2ClientResponse(clientHttp2Stream, headers));
                });

                return new Http2ClientRequest(clientHttp2Stream);
            }

        } catch (e) {
            LOGGER.trace("Error executing upstream request", this, e);
            throw e;
        }
    }

    /**
     * To JSON object
     * @return {{host: string, port: number, isAlive: boolean}}
     */
    toJSON(): object {
        return {
            host: this.host,
            port: this.port,
            isAlive: this.isOnline,
            isHTTPS: this.isHTTPS,
            isHTTP2: this.isHTTP2,
            isHTTP: this.isHTTP,
        };
    }
}

module.exports = {UpstreamHost};
