import {Middleware} from "./middleware";
import {ServerRequest} from "../model/request";
import {ClientResponse, ServerResponse} from "../model/response";
import {UpstreamHost} from "../model/upstream-host";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import util from "util";


class ForwardedHeaderMiddleware implements Middleware {


    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        next()
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        next();
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {
        proxyResponse.setHeader('forwarded', util.format('for=%s;host=%s;proto=%s'));
        next();
    }

    onProxyResponse(proxyResponse: ServerResponse, next: () => void) {
        next();
    }

}
