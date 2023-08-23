import {UpstreamHost} from "../model/upstream-host";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {ProxyRequestOptions} from "../model/proxy-request-options";

export interface Middleware {

    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void;

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void;

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void;

    onProxyResponse(proxyResponse: ProxyResponse, next: () => void): void;

}
