import * as http2 from "http2";
import {constants} from "http2";
import http from "http";
import {UpstreamHost} from "./upstream-host";
import {Http1ProxyRequestOptions, Http2ProxyRequestOptions, ProxyRequestOptions} from "./proxy-request-options";
import {Writable} from "stream";
import {HeadersConverter} from "./protocol";
import {Gateway} from "./gateway";


export interface ServerRequest {

    get path(): string;

    get host(): string | string[] | undefined;

    get acceptEncoding(): string;

    get contentEncoding(): string | undefined;

    get correlationId(): string | undefined;

    set correlationId(value: string | undefined);

    pipe(writable: Writable): Writable;

    proxyOptionsFor(gateway: Gateway, upstreamHost: UpstreamHost): ProxyRequestOptions;

    getTransport(): any;

    once(eventName: string | symbol, listener: (...args: any[]) => void): this;
}


export class Http1Request implements ServerRequest {

    private readonly _request: http.IncomingMessage;

    constructor(request: http.IncomingMessage) {
        this._request = request;
    }

    get path() {
        return this._request.url || '/';
    }

    get host() {
        return this._request.headers.host;
    }

    get acceptEncoding(): string {
        //@ts-ignore
        return this._request.headers['accept-encoding'] || '';
    }

    get contentEncoding(): string | undefined {
        return this._request.headers["content-encoding"];
    }

    get correlationId(): string | undefined {
        //@ts-ignore
        return this._request.headers["x-correlation-id"];
    }

    set correlationId(value: string | undefined) {
        this._request.headers['x-correlation-id'] = value;
    }

    proxyOptionsFor(gateway: Gateway, upstream: UpstreamHost): ProxyRequestOptions {

        const abortController = new AbortController();

        this._request.setTimeout(gateway.requestTimeout, () => {
            abortController.abort("Socket timeout");
        });

        const copy = JSON.parse(JSON.stringify(this._request.headers));

        copy.host = gateway.domain;

        if (upstream.isHTTP2) {

            return {
                headers: {
                    [http2.constants.HTTP2_HEADER_METHOD]: this._request.method,
                    [http2.constants.HTTP2_HEADER_PATH]: this.path,
                    ...HeadersConverter.convertHttpToHttp2(copy)
                },
                client: {
                    rejectUnauthorized: false,
                    timeout: gateway.requestTimeout,
                    settings: {
                        enablePush: false
                    }
                },
                options: {
                    signal: abortController.signal,
                },
                signal: abortController.signal
            } as Http2ProxyRequestOptions;
        }

        return {
            hostname: upstream.host,
            port: upstream.port,
            path: this.path,
            method: this._request.method,
            headers: copy,
            timeout: gateway.requestTimeout,
            rejectUnauthorized: false,
            signal: abortController.signal
        } as Http1ProxyRequestOptions;
    }

    getTransport(): any {
        return this._request;
    }

    pipe(writable: Writable) {
        return this._request.pipe(writable);
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._request.once(eventName, listener);

        return this;
    }
}

export class Http2CompatibleModeRequest implements ServerRequest {

    private readonly _request: http2.Http2ServerRequest;

    constructor(request: http2.Http2ServerRequest) {
        this._request = request;

        if (!this._request.headers.host) {
            this._request.headers.host = this._request.authority;
        }
    }

    get acceptEncoding(): string {
        //@ts-ignore
        return this._request.headers['accept-encoding'] || '';
    }

    get contentEncoding(): string | undefined {
        return this._request.headers["content-encoding"];
    }

    get correlationId(): string | undefined {
        //@ts-ignore
        return this._request.headers["x-correlation-id"];
    }

    set correlationId(value: string | undefined) {
        this._request.headers['x-correlation-id'] = value;
    }

    getTransport(): any {
        return this._request;
    }

    get host(): string | string[] | undefined {
        return this._request.authority || this._request.headers.host;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._request.once(eventName, listener);
        return this;
    }

    get path(): string {
        return this._request.url;
    }

    pipe(writable: Writable): Writable {
        return this._request.pipe(writable);
    }

    proxyOptionsFor(gateway: Gateway, upstream: UpstreamHost): ProxyRequestOptions {

        const abortController = new AbortController();

        this._request.setTimeout(gateway.requestTimeout, () => {
            abortController.abort("Socket timeout");
        });

        const copy = JSON.parse(JSON.stringify(this._request.headers));

        copy.host = gateway.domain;

        if (upstream.isHTTP2) {
            if (this._request.httpVersion == '2.0') {
                return {
                    headers: copy,
                    client: {
                        rejectUnauthorized: false,
                        timeout: gateway.requestTimeout,
                        settings: {
                            enablePush: false
                        }
                    },
                    options: {
                        signal: abortController.signal
                    },
                    signal: abortController.signal
                } as Http2ProxyRequestOptions;
            } else {
                return {
                    headers: {
                        [http2.constants.HTTP2_HEADER_METHOD]: this._request.method,
                        [http2.constants.HTTP2_HEADER_PATH]: this.path,
                        ...HeadersConverter.convertHttpToHttp2(copy)
                    },
                    client: {
                        rejectUnauthorized: false,
                        timeout: gateway.requestTimeout,
                        settings: {
                            enablePush: true
                        }
                    },
                    options: {
                        signal: abortController.signal
                    },
                    signal: abortController.signal
                } as Http2ProxyRequestOptions;
            }
        }

        if (this._request.httpVersion == '2.0') {
            return {
                hostname: upstream.host,
                port: upstream.port,
                path: this.path,
                method: this._request.method,
                headers: HeadersConverter.convertHttp2ToHttp(copy),
                timeout: gateway.requestTimeout,
                rejectUnauthorized: false,
                signal: abortController.signal
            } as Http1ProxyRequestOptions;
        } else {
            return {
                hostname: upstream.host,
                port: upstream.port,
                path: this.path,
                method: this._request.method,
                headers: copy,
                timeout: gateway.requestTimeout,
                rejectUnauthorized: false,
                signal: abortController.signal
            } as Http1ProxyRequestOptions;
        }
    }


}

export class Http2Request implements ServerRequest {

    private readonly _stream: http2.ServerHttp2Stream;
    private readonly _headers2: http2.IncomingHttpHeaders;

    constructor(stream: http2.ServerHttp2Stream, headers2: http2.IncomingHttpHeaders) {
        this._stream = stream;
        this._headers2 = headers2;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._stream.once(eventName, listener);

        return this;
    }

    pipe(writable: Writable): Writable {
        return this._stream.pipe(writable);
    }

    get path(): string {
        //@ts-ignore
        return this._headers2[constants.HTTP2_HEADER_PATH] || '/';
    }

    get host() {
        return this._headers2[constants.HTTP2_HEADER_HOST] || this._headers2[constants.HTTP2_HEADER_AUTHORITY];
    }

    get acceptEncoding(): string {
        //@ts-ignore
        return this._headers2['accept-encoding'] || '';
    }

    get contentEncoding(): string | undefined {
        return this._headers2["content-encoding"];
    }

    get correlationId(): string | undefined {
        //@ts-ignore
        return this._headers2["x-correlation-id"];
    }

    set correlationId(value: string | undefined) {
        this._headers2['x-correlation-id'] = value;
    }

    proxyOptionsFor(gateway: Gateway, upstream: UpstreamHost): ProxyRequestOptions {

        const abortController = new AbortController();

        this._stream.setTimeout(gateway.requestTimeout, () => {
            abortController.abort("Socket timeout");
        });

        if (upstream.isHTTP2) {
            return {
                headers: this._headers2,
                client: {
                    rejectUnauthorized: false,
                    timeout: gateway.requestTimeout,
                    settings: {
                        enablePush: false,
                    }
                },
                options: {
                    signal: abortController.signal
                },
                signal: abortController.signal
            } as Http2ProxyRequestOptions;
        }

        const http1Headers = HeadersConverter.convertHttp2ToHttp(this._headers2);

        http1Headers.host = gateway.domain;

        return {
            hostname: upstream.host,
            port: upstream.port,
            path: this.path,
            method: this._headers2[http2.constants.HTTP2_HEADER_METHOD],
            headers: http1Headers,
            rejectUnauthorized: false,
            signal: abortController.signal
        } as Http1ProxyRequestOptions;
    }

    getTransport(): any {
        return {
            headers: {host: this.host, ...this._headers2},
            httpVersion: '2.0',
            httpVersionMinor: 0,
            httpVersionMajor: 2,
            socket: this._stream.session?.socket,
            url: this.path,
            method: this._headers2[http2.constants.HTTP2_HEADER_METHOD],
            on: (eventName: string | symbol, listener: (...args: any[]) => void) => {
                this._stream.on(eventName, listener);
            },
            once: (eventName: string | symbol, listener: (...args: any[]) => void) => {
                this._stream.once(eventName, listener);
            },
            getHeader: (header: string) => {
                return this._headers2[header];
            }
        };
    }
}

export interface ClientRequest {

    get writable(): Writable;

    once(eventName: string | symbol, listener: (...args: any[]) => void): this;

    destroy(error?: Error): void;
}


export class Http2ClientRequest implements ClientRequest {

    private readonly _request: http2.ClientHttp2Stream;


    constructor(request: http2.ClientHttp2Stream) {
        this._request = request;
    }

    get writable(): Writable {
        return this._request;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._request.once(eventName, listener);
        return this;
    }

    destroy(error?: Error): void {
        this._request.destroy(error);
    }
}

export class Http1ClientRequest implements ClientRequest {

    private readonly _request: http.ClientRequest;

    constructor(request: http.ClientRequest) {
        this._request = request;
    }

    get writable(): Writable {
        return this._request;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._request.once(eventName, listener);
        return this;
    }

    destroy(error?: Error): void {
        this._request.destroy(error);
    }
}
