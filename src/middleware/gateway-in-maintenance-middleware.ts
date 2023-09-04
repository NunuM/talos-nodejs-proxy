import {Middleware} from "./middleware";
import {UpstreamHost} from "../model/upstream-host";
import {ServerRequest} from "../model/request";
import {ClientResponse, ServerResponse} from "../model/response";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {MiddlewareRegistry} from "./middleware-registry";


export class GatewayInMaintenanceMiddleware implements Middleware {

    private readonly _statusCode: number;

    constructor(statusCode: number = 503) {
        this._statusCode = statusCode;
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        proxyResponse.endWithStatus(this._statusCode);
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        next()
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    onProxyResponse(proxyResponse: ServerResponse, next: () => void) {
        next();
    }

    serialize(): any {
        return {type: MiddlewareRegistry.GatewayInMaintenance, args: {statusCode: this._statusCode}};
    }

    static args(): any {
        return {statusCode: {type: 'number', default: 503, required: false}};
    }

    equals(other: any): boolean {
        return !!(other && other instanceof GatewayInMaintenanceMiddleware);
    }
}
