import {LOGGER} from "../service/logger-service";
import {UpstreamHost} from "./upstream-host";
import {UpstreamHostNotFound} from "../exceptions/upstream-host-not-found";
import {Middleware} from "../middleware/middleware";
import {MiddlewareProcessor} from "../middleware/middleware-processor";
import {ServerRequest} from "./request";
import {ServerResponse} from "./response";
import {UpstreamRequestTimeoutException} from "../exceptions/upstream-request-timeout-exception";
import {ProxyError} from "../exceptions/proxy-error";
import {LoadBalancer} from "../load_balancer/load-balancer";
import {ProxyRequestOptions} from "./proxy-request-options";


export abstract class Gateway {

    private readonly _domain: string;
    private readonly _name: string;
    private readonly _loadBalancer: LoadBalancer;
    private readonly _middlewares: Middleware[];
    private readonly _requestTimeout: number;

    protected constructor(domain: string, name: string, loadBalancer: LoadBalancer, middlewares: Middleware[], requestTimeout: number) {

        if (!domain) {
            throw new TypeError("Domain cannot be null or empty");
        }

        this._domain = domain;
        this._name = name;
        this._loadBalancer = loadBalancer;
        this._middlewares = middlewares;
        this._requestTimeout = requestTimeout;
    }

    get domain(): string {
        return this._domain;
    }

    get name(): string {
        return this._name;
    }

    get loadBalancer(): LoadBalancer {
        return this._loadBalancer;
    }

    get requestTimeout() {
        return this._requestTimeout;
    }

    abstract get isRegexBased(): boolean;


    abstract resolveUpstream(request: ServerRequest): UpstreamHost | undefined;

    abstract match(domain: string): boolean;

    abstract clone(domain: string): Gateway;

    abstract clean(): Promise<boolean>;

    get middlewares(): Middleware[] {
        return this._middlewares;
    }

    addMiddleware(middleware: Middleware) {
        this._middlewares.push(middleware);
    }

    abstract toJSON(): any;

    request(processor: MiddlewareProcessor, request: ServerRequest, response: ServerResponse) {

        const from = processor.size;

        processor.append(this._middlewares);

        processor.pre(this.domain, request, response, () => {

            const upstream = this.resolveUpstream(request);

            if (upstream) {

                const proxyRequestOptions: ProxyRequestOptions = request.proxyOptionsFor(this, upstream);

                processor.preProxy(upstream, proxyRequestOptions, response, () => {

                    upstream.request(proxyRequestOptions, (upstreamResponse) => {

                        processor.postProxy(upstreamResponse, response, () => {

                            processor.post(upstreamResponse.toResponse(response));

                        });
                    }).then((upstreamRequest) => {

                        request.pipe(upstreamRequest.writable);

                        upstreamRequest.once('timeout', () => {
                            upstreamRequest.destroy(new UpstreamRequestTimeoutException(`Host ${upstream.host} did not respond within ${this.requestTimeout}`));
                        });

                        upstreamRequest.once('error', (error) => {
                            LOGGER.error("UpstreamRequest error event:", error);

                            if (error instanceof ProxyError) {
                                response.endWithStatus(error.toResponse().status);
                            } else {
                                response.endWithStatus(503);
                            }
                        });

                    }).catch((error) => {
                        LOGGER.error("Error calling 'request' on upstream:", upstream, this, error);
                        response.endWithStatus(503);
                    });

                    request.once('error', (error) => {
                        LOGGER.error("problem with request", upstream.host, upstream.port, error);

                        //@ts-ignore
                        if (error && error.code && error.code === 'ABORT_ERR') {
                            return;
                        }

                        response.endWithStatus(503);
                    });
                });

            } else {
                throw new UpstreamHostNotFound(`Gateway ${this.toString()} for (${request.host}, does not resolved any upstream`);
            }

        }, from);
    }
}


export enum GatewaysTypes {
    VirtualHost = 'virtualHost',
    ApiGateway = 'apiGateway'
}
