import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {MiddlewareRegistry} from "./middleware-registry";

export class SpamFilter implements Middleware {

    private readonly _settings: any;
    private readonly _requestFilter?: SpamRequestFilter;

    constructor(args: { strategy: string }) {
        this._settings = args;
        const parts = (args?.strategy ?? '').split(";");
        if (parts.length >= 1) {
            switch (parts[0]) {
                case 'EndsWithPathSpamFilter':
                    this._requestFilter = new EndsWithPathSpamFilter(parts[1]);
                    break;
                case 'MethodRequestFilter':
                    this._requestFilter = new MethodRequestFilter(parts[1]);
                    break;
            }
        }
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        if (this._requestFilter) {
            if (!this._requestFilter.isValid(proxyRequest)) {
                proxyResponse.setHeader("Connection", "close");
                //mess with their parsers
                proxyResponse.setHeader("Content-Length", "-10");
                const randomStatusCode = Math.floor(Math.random() * 400) + 600;
                proxyResponse.endWithStatus(randomStatusCode);

                return;
            }
        }

        next();
    }

    onProxyResponse(proxyResponse: ProxyResponse, next: () => void): void {
        next();
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    equals(other: any): boolean {
        return false;
    }

    serialize(): any {
        return {type: MiddlewareRegistry.SpamFilter, strategy: this._settings}
    }

    static args(): any {
        return {
            strategy: {type: 'string', required: true},
        }
    }
}

interface SpamRequestFilter {
    isValid(proxyRequest: ServerRequest): boolean;
}

class EndsWithPathSpamFilter implements SpamRequestFilter {
    private readonly _value: string;

    constructor(value: string) {
        this._value = value;
    }

    isValid(proxyRequest: ServerRequest): boolean {

        try {
            const url = new URL("http://localhost"+proxyRequest.path);
            return !url.pathname.endsWith(this._value);
        } catch (e) {
            //NOP
        }

        return !proxyRequest.path.endsWith(this._value);
    }
}

class MethodRequestFilter implements SpamRequestFilter {

    private readonly _method: string;

    constructor(method: string) {
        this._method = method;
    }

    isValid(proxyRequest: ServerRequest): boolean {
        return !(proxyRequest.method === this._method);
    }
}
