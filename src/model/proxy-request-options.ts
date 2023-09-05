import http from "http";
import * as http2 from "http2";
import {ClientSessionOptions, SecureClientSessionOptions} from "http2";

export interface ProxyRequestOptions {
    signal?: AbortSignal
}


export interface Http1ProxyRequestOptions extends http.RequestOptions, ProxyRequestOptions {

}

export interface Http2ProxyRequestOptions extends ProxyRequestOptions {
    headers: http2.IncomingHttpHeaders;
    options: http2.ClientSessionRequestOptions;
    client: ClientSessionOptions | SecureClientSessionOptions;
}
