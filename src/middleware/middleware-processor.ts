import {Middleware} from "./middleware";
import {UpstreamHost} from "../model/upstream-host";
import {ServerRequest} from "../model/request";
import {ClientResponse, ProxyResponse, ServerResponse} from "../model/response";
import {ProxyRequestOptions} from "../model/proxy-request-options";
import {LOGGER} from "../service/logger-service";
import {GatewayHostService} from "../service/gateway-host-service";
import {GatewayStatsCollectorMiddlewareFactory} from "./factory/gateway-stats-collector-middleware-factory";


export class MiddlewareProcessor {

    private readonly _service: GatewayHostService;
    private readonly _middlewares: Middleware[];

    constructor(middlewares: Middleware[], service: GatewayHostService) {
        this._middlewares = middlewares;
        this._service = service;
    }

    get size(): number {
        return this._middlewares.length;
    }

    append(middleware: Middleware[]): void {
        this._middlewares.push(...middleware.map((m) => {
            if (m instanceof GatewayStatsCollectorMiddlewareFactory) {
                return m.build(this._service);
            }
            return m;
        }));
    }

    pre(clientHeader: string, request: ServerRequest, response: ServerResponse, nextStage: () => void, idx = 0) {
        let middlewareIdx = idx;
        const next = () => {
            const middleware = this._middlewares[middlewareIdx++];

            if (middleware) {
                try {
                    middleware.onProxyRequest(request, response, next);
                } catch (e) {
                    LOGGER.error("Error executing middleware", middleware, e);
                }
            } else {
                nextStage();
            }
        }
        next();
    }

    preProxy(upstream: UpstreamHost, options: ProxyRequestOptions, proxyResponse: ServerResponse, nextStage: () => void) {
        let middlewareIdx = 0;
        const next = () => {
            const middleware = this._middlewares[middlewareIdx++];

            if (middleware) {
                try {
                    middleware.preUpstreamRequest(upstream, options, proxyResponse, next);
                } catch (e) {
                    LOGGER.error("Error executing middleware", middleware, e);
                }
            } else {
                nextStage();
            }
        }
        next();
    }

    postProxy(upstreamResponse: ClientResponse, proxyResponse: ServerResponse, nextStage: () => void) {
        let middlewareIdx = 0;
        const next = () => {
            const middleware = this._middlewares[middlewareIdx++];

            if (middleware) {
                try {
                    middleware.postUpstreamResponse(upstreamResponse, proxyResponse, next);
                } catch (e) {
                    LOGGER.error("Error executing middleware", middleware, e);
                }
            } else {
                nextStage();
            }
        }
        next();
    }

    post(proxyResponse: ProxyResponse) {
        let middlewareIdx = 0;
        const next = () => {
            const middleware = this._middlewares[middlewareIdx++];

            if (middleware) {
                try {
                    middleware.onProxyResponse(proxyResponse, next);
                } catch (e) {
                    LOGGER.error("Error executing middleware", middleware, e);
                }
            } else {
                proxyResponse.send();
            }
        }
        next();
    }
}
