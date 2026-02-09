import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {HttpHeaders} from "pluto-http-client";
import {MiddlewareRegistry} from "./middleware-registry";
import {LOGGER} from "../service/logger-service";

export class RedirectMiddleware implements Middleware {

    private readonly _location: string;
    private readonly _path?:string;

    constructor(args: { location: string, path?: string }) {
        this._location = args.location;
        this._path = args.path;
        LOGGER.debug("Creating redirect middleware", args);
    }

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        if(this._path) {
            if(proxyRequest.path == this._path) {
                LOGGER.debug("Redirect middleware path match:", this._path, proxyRequest.path, this._location);
                proxyResponse
                    .setHeader(HttpHeaders.LOCATION, this._location);
                proxyResponse.endWithStatus(303);
            } else {
                next();
            }
        } else {
            LOGGER.debug("Global redirect middleware :", this._path, proxyRequest.path, this._location);
            proxyResponse
                .setHeader(HttpHeaders.LOCATION, this._location);
            proxyResponse.endWithStatus(303);
        }
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
        const serialized: any =  {type: MiddlewareRegistry.Redirect, args: {location: this._location}};
        if(this._path) {
            serialized.args['path'] = this._path;
        }

        return serialized;
    }

    static args(): any {
        return {
            location: {type: 'string', required: true},
            path: {type: 'string', required: false}
        }
    }

    equals(other: any): boolean {
        return !!(other && other instanceof RedirectMiddleware);
    }

    toString() {
        return MiddlewareRegistry.Redirect;
    }

}
