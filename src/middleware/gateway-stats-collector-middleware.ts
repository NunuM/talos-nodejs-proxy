import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {GatewayHostService} from "../service/gateway-host-service";
import {MiddlewareRegistry} from "./middleware-registry";

export class GatewayStatsCollectorMiddleware implements Middleware {

    private readonly _domain: string;
    private readonly _start: Date;
    private readonly _gatewayHostService: GatewayHostService;

    constructor(domain: string, GatewayHostService: GatewayHostService) {
        this._gatewayHostService = GatewayHostService;
        this._start = new Date();
        this._domain = domain;
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    onProxyResponse(proxyResponse: ProxyResponse, next: () => void): void {
        //@ts-ignore
        this._gatewayHostService.requestServed(proxyResponse.status, new Date() - this._start, this._domain);
        next()
    }

    serialize(): any {
        return {type: MiddlewareRegistry.GatewayStatsCollector, args: {}};
    }

    equals(other: any): boolean {
        return !!(other && other instanceof GatewayStatsCollectorMiddleware);
    }

    toString() {
        return MiddlewareRegistry.GatewayStatsCollector;
    }

}
