import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {HttpHeaders} from "pluto-http-client";
import {MiddlewareRegistry} from "./middleware-registry";

export class RedirectMiddleware implements Middleware {

    private readonly _location: string;

    constructor(args: { location: string }) {
        this._location = args.location;
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        proxyResponse
            .setHeader(HttpHeaders.LOCATION, this._location);
        proxyResponse.endWithStatus(303);
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
        return {type: MiddlewareRegistry.Redirect, args: {location: this._location}};
    }

    static args(): any {
        return {location: {type: 'string', required: true}}
    }

    equals(other: any): boolean {
        return !!(other && other instanceof RedirectMiddleware);
    }

}
