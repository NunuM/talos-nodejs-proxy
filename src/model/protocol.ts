import http2 from "http2";

export enum Protocol {
    Http,
    Https,
    Http2
}

type HeadersType = { [key: string]: string | string[] | undefined };

export function protocolFrom(request: http2.Http2ServerRequest) {
    if (request.httpVersion === '2.0') {
        return Protocol.Http2;
    }

    return Protocol.Http;
}

export class HeadersConverter {

    static convertHttpToHttp2(httpHeaders: HeadersType): HeadersType {
        const http2Headers: HeadersType = {};

        for (const [name, value] of Object.entries(httpHeaders)) {
            // Skip these headers in HTTP/2
            if (
                name === 'connection' ||
                name === 'keep-alive' ||
                name === 'transfer-encoding'
            ) {
                continue;
            }
            // Add other header conversion logic here
            http2Headers[name] = value;
        }
        return http2Headers;
    }


    static convertHttp2ToHttp(http2Headers: HeadersType): HeadersType {

        const httpHeaders: HeadersType = {};

        for (const [name, value] of Object.entries(http2Headers)) {

            // Skip HTTP/2 pseudo headers (those that start with ':') in HTTP/1.1
            if (name.startsWith(':')) {
                continue;
            }

            // Skip other headers that are not applicable in HTTP/1.1
            if (
                name === 'content-length' ||
                name === 'transfer-encoding'
            ) {
                continue;
            }

            // Add other header conversion logic here
            httpHeaders[name] = value;
        }
        return httpHeaders;
    }
}
