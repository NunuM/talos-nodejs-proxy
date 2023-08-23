import http from "http";
import * as http2 from "http2";

export enum Protocol {
    Http,
    Https,
    Http2
}

export enum HttpVersion {
    H1,
    H2
}

export class HeadersConverter {

    static convert(from: HttpVersion, to: HttpVersion, headers: http.IncomingHttpHeaders | http2.IncomingHttpHeaders)
        : http.OutgoingHttpHeaders | http2.OutgoingHttpHeaders {

        if (from == to) {
            return headers;
        }

        if (from == HttpVersion.H1 && to == HttpVersion.H2) {

            delete headers['connection'];
            delete headers['transfer-encoding'];

            return headers;
        } else {
            const withCommaHeaders: { [key: string]: string | string[] | undefined } = {};
            for (const [key, value] of Object.entries(headers)) {
                if (!key.startsWith(':')) {
                    withCommaHeaders[key] = value;
                }

            }
            return withCommaHeaders;
        }
    }

}
