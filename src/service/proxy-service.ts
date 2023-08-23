import {HttpProxy} from "../proxy/http-proxy";
import {HttpsProxy} from "../proxy/https-proxy";
import {Proxy} from "../proxy/proxy";
import {LOGGER} from "./logger-service";
import {GatewayHostService} from "./gateway-host-service";
import {Config} from "../app/config";
import {ProxyError} from "../exceptions/proxy-error";
import {Middleware} from "../middleware/middleware";
import {AccessLoggingMiddleware} from "../middleware/access-logging-middleware";
import {ServerRequest} from "../model/request";
import {ServerResponse} from "../model/response";
import {Protocol} from "../model/protocol";
import {Http2Proxy} from "../proxy/http2-proxy";
import http from "http";
import https from "https";
import http2 from "http2";
import {MiddlewareProcessor} from "../middleware/middleware-processor";
import {EncodingMiddleware} from "../middleware/encoding-middleware";

export class ProxyService {

    private _proxies: Map<Protocol, Proxy>;
    private readonly _middlewares: Middleware[];

    constructor(private _gatewayHostService: GatewayHostService) {
        this._proxies = new Map<Protocol, Proxy>();
        this._middlewares = [
            new AccessLoggingMiddleware(),
            new EncodingMiddleware()
        ];
    }

    init() {
        if (Config.withHttp()) {
            this.httpProxy(Config.httpServerPort(), Config.httpServerOptions());
        }

        if (Config.withHttps()) {
            this.httpsProxy(Config.httpsServerPort(), Config.httpsServerOptions());
        }

        if (Config.withHttp2()) {
            this.http2Proxy(Config.http2ServerPort(), Config.http2ServerOptions());
        }
    }

    serve() {
        for (let proxy of this._proxies.values()) {
            proxy.start(this.baseHandler());
        }
    }

    async stop() {
        try {
            for (let gatewayHost of this._gatewayHostService.gatewayHosts()) {
                await gatewayHost.clean();
            }
        } catch (e) {
            LOGGER.error("Error cleaning gateway", e);
        }

        for (let proxy of this._proxies.values()) {
            await proxy.close();
        }
    }

    private get gatewayHostService(): GatewayHostService {
        return this._gatewayHostService;
    }

    httpProxy(port: number, options: http.ServerOptions) {

        const proxy = new HttpProxy(port, options);

        this._proxies.set(Protocol.Http, proxy);
    }

    httpsProxy(port: number, options: https.ServerOptions) {
        const proxy = new HttpsProxy(port, options);

        this._proxies.set(Protocol.Https, proxy);
    }

    http2Proxy(port: number, options: http2.SecureServerOptions) {
        const proxy = new Http2Proxy(port, options);

        this._proxies.set(Protocol.Http2, proxy);
    }

    private baseHandler() {
        return (proxyRequest: ServerRequest, proxyResponse: ServerResponse) => {

            let clientHeader: string | string[] | undefined = proxyRequest.host;

            if (Array.isArray(clientHeader)) {
                proxyResponse.endWithStatus(404);
                return;
            }

            if (!clientHeader) {
                proxyResponse.endWithStatus(404);
                return;
            }

            this.handleRequest(clientHeader, proxyRequest, proxyResponse);
        }
    }

    private handleRequest(clientHeader: string, proxyRequest: ServerRequest, proxyResponse: ServerResponse) {

        const processor = new MiddlewareProcessor(this._middlewares);

        processor.pre(clientHeader, proxyRequest, proxyResponse, () => {
            this.gatewayRequest(processor, clientHeader, proxyRequest, proxyResponse);
        });
    }

    private gatewayRequest(processor: MiddlewareProcessor,
                           clientHeader: string,
                           proxyRequest: ServerRequest,
                           proxyResponse: ServerResponse) {

        this.gatewayHostService
            .resolveGateway(clientHeader)
            .then((gateway) => gateway.request(processor, proxyRequest, proxyResponse))
            .catch((error) => {
                LOGGER.error("Error proxying request", clientHeader, error);
                if (error instanceof ProxyError) {
                    const response = error.toResponse();

                    proxyResponse.endWithStatus(response.status);

                } else {
                    proxyResponse.endWithStatus(200);
                }
            });
    }

}
