import {Middleware} from "../middleware";
import {ServerRequest} from "../../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../../model/response";
import {UpstreamHost} from "../../model/upstream-host";
import {ProxyRequestOptions} from "../../model/proxy-request-options";
import {GatewayHostService} from "../../service/gateway-host-service";
import {GatewayStatsCollectorMiddleware} from "../gateway-stats-collector-middleware";
import {MiddlewareRegistry} from "../middleware-registry";


export class GatewayStatsCollectorMiddlewareFactory implements Middleware {

    private readonly _domain: string;

    constructor(args: { domain: string }) {
        this._domain = args.domain;
    }

    build(service: GatewayHostService) {
        return new GatewayStatsCollectorMiddleware(this._domain, service);
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        next()
    }

    onProxyResponse(proxyResponse: ProxyResponse, next: () => void): void {
        next()
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        next()
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
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
