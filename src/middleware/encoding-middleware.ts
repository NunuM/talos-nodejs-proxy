import {Middleware} from "./middleware";
import {HttpHeaders} from "pluto-http-client";
import zlib from "zlib";
import {UpstreamHost} from "../model/upstream-host";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {Transform} from "stream";

export class EncodingMiddleware implements Middleware {

    private _accepts?: string;
    private _transformer?: Transform;


    onProxyRequest(proxyRequest: ServerRequest, proxyResponse: ServerResponse, next: () => void): void {
        this._accepts = proxyRequest.acceptEncoding;
        next();
    }

    preUpstreamRequest(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, next: () => void): void {
        next()
    }

    postUpstreamResponse(upstreamRequest: ClientResponse, proxyResponse: ServerResponse, next: () => void): void {

        if (upstreamRequest.contentEncoding) {
            next();
            return;
        }

        proxyResponse.setHeader('vary', HttpHeaders.ACCEPT_ENCODING);

        if (this._accepts?.includes('gzip')) {

            proxyResponse.setHeader('content-encoding', "gzip");

            this._transformer = zlib.createGzip();

        } else if (this._accepts?.includes('br')) {

            proxyResponse.setHeader('content-encoding', "br");

            this._transformer = zlib.createBrotliCompress();
        } else if (this._accepts?.includes('deflate')) {

            proxyResponse.setHeader('content-encoding', "deflate");

            this._transformer = zlib.createDeflate();
        }

        next()
    }

    onProxyResponse(proxyResponse: ProxyResponse, next: () => void) {

        if (this._transformer) {
            proxyResponse.deleteHeader('content-length');
            proxyResponse.transform(this._transformer);
        }

        next();
    }

}
