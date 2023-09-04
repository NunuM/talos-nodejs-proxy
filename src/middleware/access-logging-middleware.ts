import {Middleware} from "./middleware";
import {handler} from "../service/logger-service";
import {UpstreamHost} from "../model/upstream-host";
import {ServerRequest} from "../model/request";
import {ClientResponse, ServerResponse} from "../model/response";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {MiddlewareRegistry} from "./middleware-registry";

export class AccessLoggingMiddleware implements Middleware {

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        handler(proxyRequest.getTransport(), proxyResponse.getTransport(), next);
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    onProxyResponse(proxyResponse: ServerResponse, next: () => void) {
        next();
    }

    serialize(): any {
        return {type: MiddlewareRegistry.AccessLogging, args: {}};
    }

    equals(other: any): boolean {
        return !!(other && other instanceof AccessLoggingMiddleware);
    }
}
