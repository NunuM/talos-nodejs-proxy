import * as http2 from "http2";
import {constants} from "http2";
import http from "http";
import {UpstreamHost} from "./upstream-host";
import {Http1ProxyRequestOptions, Http2ProxyRequestOptions, ProxyRequestOptions} from "./proxy-request-options";
import {Writable} from "stream";
import {HeadersConverter, HttpVersion} from "./protocol";
import {Gateway} from "./gateway";


export interface ServerRequest {

    get path(): string;

    get host(): string | string[] | undefined;

    get acceptEncoding(): string;

    get contentEncoding(): string | undefined;

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

    proxyOptionsFor(gateway: Gateway, upstream: UpstreamHost): ProxyRequestOptions {

        const copy = JSON.parse(JSON.stringify(this._request.headers));

        copy.host = upstream.host;

        if (upstream.isHTTP2) {

            delete copy['connection'];

            return {
                headers: {
                    [http2.constants.HTTP2_HEADER_METHOD]: this._request.method,
                    [http2.constants.HTTP2_HEADER_PATH]: this.path,
                    ...copy
                },
                client: {
                    rejectUnauthorized: false,
                    timeout: gateway.requestTimeout
                }
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

    proxyOptionsFor(gateway: Gateway, upstream: UpstreamHost): ProxyRequestOptions {

        if (upstream.isHTTP2) {
            return {
                headers: this._headers2,
                client: {
                    rejectUnauthorized: false,
                    timeout: gateway.requestTimeout
                }
            } as Http2ProxyRequestOptions;
        }

        const http1Headers = HeadersConverter.convert(HttpVersion.H2, HttpVersion.H1, this._headers2);

        http1Headers.host = upstream.host;

        return {
            hostname: upstream.host,
            port: upstream.port,
            path: this.path,
            method: this._headers2[http2.constants.HTTP2_HEADER_METHOD],
            headers: http1Headers,
            rejectUnauthorized: false
        } as Http1ProxyRequestOptions;

    }

    getTransport(): any {
        return this._stream;
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
