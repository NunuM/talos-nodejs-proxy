import http from "http";
import http2 from "http2";
import {pipeline, Readable, Transform} from "stream";
import {LOGGER} from "../service/logger-service";
import {HeadersConverter, Protocol} from "./protocol";

export interface ServerResponse {

    get protocol(): Protocol;

    setHeader(headerName: string, headerValue: string | string[]): void;

    endWithStatus(status: number, onEnd?: () => void): void;

    transform(transformer: Transform): void;

    finally(status: number, headers: any, stream: Readable): void;

    getTransport(): any;
}

export interface ProxyResponse extends ServerResponse {

    get status(): number;

    deleteHeader(headerName: string): void;

    send(): void;
}

class ProxyResponseImpl implements ServerResponse, ProxyResponse {

    private readonly _source: ClientResponse;
    private readonly _sink: ServerResponse;

    constructor(source: ClientResponse, sink: ServerResponse) {
        this._source = source;
        this._sink = sink;
    }

    endWithStatus(status: number, onEnd?: () => void): void {
        this._sink.endWithStatus(status, onEnd);
    }

    finally(status: number, headers: any, stream: Readable): void {
        this._sink.endWithStatus(status,)
    }

    getTransport(): any {
        return this._sink.getTransport();
    }

    get protocol(): Protocol {
        return this._sink.protocol;
    }

    setHeader(headerName: string, headerValue: string | string[]): void {
        this._source.headers[headerName] = headerValue;
    }

    transform(transformer: Transform): void {
        this._sink.transform(transformer);
    }

    deleteHeader(headerName: string): void {
        delete this._source.headers[headerName];
    }

    get status(): number {
        return this._source.status;
    }

    send(): void {
        this._sink.finally(this._source.status, this._source.headers, this._source.readable);
    }

}


export class Http1Response implements ServerResponse {

    private readonly _headers: { [key: string]: string | string[] } = {};
    private readonly _transform: Transform[] = [];
    private readonly _serverResponse: http.ServerResponse;

    constructor(serverResponse: http.ServerResponse) {
        this._serverResponse = serverResponse;
    }

    setHeader(headerName: string, headerValue: string | string[]): void {
        this._headers[headerName] = headerValue;
    }

    endWithStatus(status: number, onEnd?: () => void): void {
        this._serverResponse.writeHead(status, this._headers);
        this._serverResponse.end(onEnd);
    }

    transform(transformer: Transform): void {
        this._transform.push(transformer);
    }

    getTransport(): any {
        return this._serverResponse;
    }

    finally(status: number, headers: any, stream: Readable) {

        this._serverResponse.writeHead(status, Object.assign(headers, this._headers));

        //@ts-ignore
        pipeline(stream, ...this._transform, this._serverResponse, (error) => {
            if (error) {
                LOGGER.error("Pipeline failed", error);
            }
        });
    }

    get protocol(): Protocol {
        return Protocol.Http;
    }
}

export class Http2CompatibleModeResponse implements ServerResponse {

    private readonly _protocol: Protocol;
    private readonly _transform: Transform[] = [];
    private readonly _headers: { [key: string]: string | string[] } = {};
    private readonly _response: http2.Http2ServerResponse;

    constructor(response: http2.Http2ServerResponse, protocol: Protocol) {
        this._response = response;
        this._protocol = protocol;
    }

    endWithStatus(status: number, onEnd?: () => void): void {
        this._response.writeHead(status, this._headers);
        this._response.end(onEnd);
    }

    finally(status: number, headers: any, stream: Readable): void {
        this._response.writeHead(status, Object.assign(headers, this._headers));

        //@ts-ignore
        pipeline(stream, ...this._transform, this._response, (error) => {
            if (error) {
                LOGGER.error("Pipeline failed", error);
            }
        });
    }

    getTransport(): any {
        return this._response;
    }

    get protocol(): Protocol {
        return this._protocol;
    }

    setHeader(headerName: string, headerValue: string | string[]): void {
        this._headers[headerName] = headerValue;
    }

    transform(transformer: Transform): void {
        this._transform.push(transformer);
    }
}

export class Http2Response implements ServerResponse {

    private readonly _headers: { [key: string]: string | string[] } = {};
    private readonly _transform: Transform[] = [];
    private readonly _serverResponse: http2.ServerHttp2Stream;

    private _transport?: any;

    constructor(serverResponse: http2.ServerHttp2Stream) {
        this._serverResponse = serverResponse;
    }

    setHeader(headerName: string, headerValue: string | string[]): void {
        this._headers[headerName] = headerValue;
    }

    transform(transformer: Transform): void {
        this._transform.push(transformer);
    }

    getTransport(): any {
        return this._transport = {
            statusCode: undefined,
            headers: this._headers,
            writeHead: () => {
            },
            getHeader: (header: string) => {
                return this._headers[header];
            },
            on: (eventName: string | symbol, listener: (...args: any[]) => void) => {
                if (eventName !== 'end')
                    this._serverResponse.on(eventName, listener);
            },
            once: (eventName: string | symbol, listener: (...args: any[]) => void) => {
                this._serverResponse.once(eventName, listener);
            }
        };
    }

    private emitToTransportStatus(status: number, headers: any) {
        // @ts-ignore
        this._transport?.statusCode = status;
        this._transport?.writeHead(status, headers);
    }

    finally(status: number, headers: any, stream: Readable) {

        this.emitToTransportStatus(status, headers);

        this._serverResponse.respond({
            [http2.constants.HTTP2_HEADER_STATUS]: status,
            ...Object.assign(headers, this._headers)
        });

        //@ts-ignore
        pipeline(stream, ...this._transform, this._serverResponse, (error) => {
            if (error) {
                LOGGER.error("Pipeline failed", error);
            }
        });
    }

    endWithStatus(status: number, onEnd?: () => void): void {

        this.emitToTransportStatus(status, this._headers);

        this._serverResponse.respond({
            [http2.constants.HTTP2_HEADER_STATUS]: status,
        });
        this._serverResponse.end(onEnd);
    }

    get protocol(): Protocol {
        return Protocol.Http2;
    }

}

export interface ClientResponse {

    get status(): number;

    get headers(): any;

    get contentEncoding(): string | undefined;

    get readable(): Readable;

    toResponse(serverResponse: ServerResponse): ProxyResponse;

    once(eventName: string | symbol, listener: (...args: any[]) => void): this;
}

export class NormalizedResponse implements ClientResponse {

    private readonly _status: number;
    private readonly _headers: any;
    private readonly _readable: Readable;

    constructor(status: number, headers: any, readable: Readable) {
        this._status = status;
        this._headers = headers;
        this._readable = readable;
    }

    get contentEncoding(): string | undefined {
        return this._headers["content-encoding"];
    }

    get headers(): any {
        return this._headers;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        return this;
    }

    get readable(): Readable {
        return this._readable;
    }

    get status(): number {
        return this._status;
    }

    toResponse(serverResponse: ServerResponse): ProxyResponse {
        return new ProxyResponseImpl(this, serverResponse);
    }

}

export class Http2ClientResponse implements ClientResponse {

    private readonly _headers: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader;
    private readonly _response: http2.ClientHttp2Stream;

    constructor(response: http2.ClientHttp2Stream, headers: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader) {
        this._response = response;
        this._headers = headers;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._response.once(eventName, listener);
        return this;
    }

    get contentEncoding(): string | undefined {
        return this._headers["content-encoding"];
    }

    get headers(): any {
        return this._headers;
    }

    get readable(): Readable {
        return this._response;
    }

    get status(): number {
        //@ts-ignore
        return this._headers[http2.constants.HTTP2_HEADER_STATUS];
    }

    toResponse(serverResponse: ServerResponse): ProxyResponse {
        if (serverResponse.protocol == Protocol.Http) {
            return new ProxyResponseImpl(
                new NormalizedResponse(
                    this.status,
                    HeadersConverter.convertHttp2ToHttp(this._headers), this._response),
                serverResponse
            );

        } else {
            return new ProxyResponseImpl(
                new NormalizedResponse(this.status, this.headers, this._response),
                serverResponse
            );
        }
    }
}

export class Http1ClientResponse implements ClientResponse {

    private readonly _response: http.IncomingMessage;

    constructor(response: http.IncomingMessage) {
        this._response = response;
    }

    once(eventName: string | symbol, listener: (...args: any[]) => void): this {
        this._response.once(eventName, listener);
        return this;
    }


    get contentEncoding(): string | undefined {
        return this._response.headers["content-encoding"];
    }

    get headers(): any {
        return this._response.headers;
    }

    get readable(): Readable {
        return this._response;
    }

    get status(): number {
        return this._response.statusCode || 503;
    }

    toResponse(serverResponse: ServerResponse): ProxyResponse {

        if (serverResponse.protocol == Protocol.Http2) {
            return new ProxyResponseImpl(
                new NormalizedResponse(
                    this.status,
                    HeadersConverter.convertHttpToHttp2(this.headers),
                    this._response),
                serverResponse
            );
        }

        return new ProxyResponseImpl(
            new NormalizedResponse(this.status, this.headers, this._response),
            serverResponse
        );
    }
}
