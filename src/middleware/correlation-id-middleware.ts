import {Middleware} from "./middleware";
import {UpstreamHost} from "../model/upstream-host";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {MiddlewareRegistry} from "./middleware-registry";

import {v4 as uuid} from 'uuid';

export class CorrelationIdMiddleware implements Middleware {

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        if (!proxyRequest.correlationId) {
            proxyRequest.correlationId = uuid();
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

    serialize(): any {
        return MiddlewareRegistry.CorrelationId;
    }

}
