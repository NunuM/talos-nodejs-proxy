import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {MiddlewareRegistry} from "./middleware-registry";
import {LOGGER} from "../service/logger-service";

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
                case 'ContainsStringInPathSpamFilter':
                    this._requestFilter = new ContainsStringInPathSpamFilter(parts[1]);
                    break;
            }
        }
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        if (this._requestFilter) {
            if (!this._requestFilter.isValid(proxyRequest)) {
                LOGGER.debug("Blocking request:", this._requestFilter.toString(), proxyRequest.path, 504);

                proxyResponse.setHeader("Connection", "close");
                //mess with their parsers
                proxyResponse.setHeader("Content-Length", "-10.5");

                proxyResponse.endWithStatus(504);

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
    private readonly _value: string | string[];

    constructor(value: string) {
        if (value.includes(",")) {
            this._value = value.split(",");
        } else {
            this._value = value;
        }
    }

    isValid(proxyRequest: ServerRequest): boolean {
        let path: string = proxyRequest.path;
        try {
            const url = new URL("http://localhost" + proxyRequest.path);
            path = url.pathname;
        } catch (e) {
            //NOP
        }

        if (Array.isArray(this._value)) {
            for (let token of this._value) {
                if (path.endsWith(token)) {
                    return false;
                }
            }
            return true;
        } else {
            return !path.endsWith(this._value);
        }
    }

    toString(): string {
        return 'EndsWithPathSpamFilter:' + this._value;
    }
}

class ContainsStringInPathSpamFilter implements SpamRequestFilter {
    private readonly _value: string | string[];

    constructor(value: string) {
        if (value.includes(",")) {
            this._value = value.split(",");
        } else {
            this._value = value;
        }
    }

    isValid(proxyRequest: ServerRequest): boolean {
        const path: string = proxyRequest.path;

        if (Array.isArray(this._value)) {
            for (let token of this._value) {
                if (path.includes(token)) {
                    return false;
                }
            }
            return true;
        } else {
            return !path.endsWith(this._value);
        }
    }

    toString(): string {
        return 'ContainsStringInPathSpamFilter:' + this._value;
    }
}

class MethodRequestFilter implements SpamRequestFilter {
    private readonly _value: string | string[];

    constructor(value: string) {
        if (value.includes(",")) {
            this._value = value.split(",");
        } else {
            this._value = value;
        }
    }

    isValid(proxyRequest: ServerRequest): boolean {
        const method = proxyRequest.method ?? '';
        if (Array.isArray(this._value)) {
            for (let token of this._value) {
                if (method == token) {
                    return false;
                }
            }
            return true;
        } else {
            return !(method === this._value);
        }
    }

    toString(): string {
        return 'MethodRequestFilter:' + this._value;
    }
}
