import {GatewayHostService} from "../../service/gateway-host-service";
import {Middleware} from "../middleware";
import {ServerRequest} from "../../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../../model/response";
import {UpstreamHost} from "../../model/upstream-host";
import {ProxyRequestOptions} from "../../model/proxy-request-options";

export abstract class MiddlewareAbstractFactory implements Middleware {

    abstract build(service?: GatewayHostService): Middleware;

    abstract equals(other: any): boolean;

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

    abstract serialize(): any;
}

