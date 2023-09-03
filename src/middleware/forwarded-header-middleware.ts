import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import util from "util";
import {MiddlewareRegistry} from "./middleware-registry";
import {Config} from "../app/config";


export class ForwardedHeaderMiddleware implements Middleware {

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        //@ts-ignore
        options.headers['forwarded'] = util.format('proto=%s;by=%s', proxyResponse.protocol, Config.appId());

        next();
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    onProxyResponse(proxyResponse: ServerResponse, next: () => void) {
        next();
    }

    serialize(): any {
        return MiddlewareRegistry.ForwardHeaders;
    }

}
