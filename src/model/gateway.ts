import {LOGGER} from "../service/logger-service";
import {UpstreamHost} from "./upstream-host";
import {UpstreamHostNotFound} from "../exceptions/upstream-host-not-found";
import {Middleware} from "../middleware/middleware";
import {MiddlewareProcessor} from "../middleware/middleware-processor";
import {ServerRequest} from "./request";
import {ServerResponse} from "./response";
import {UpstreamRequestTimeoutException} from "../exceptions/upstream-request-timeout-exception";
import {ProxyError} from "../exceptions/proxy-error";


export abstract class Gateway {

    private readonly _middlewares: Middleware[] = [];

    abstract get domain(): string;

    abstract get requestTimeout(): number;

    abstract resolveUpstream(request: ServerRequest): UpstreamHost | undefined;

    abstract match(domain: string): boolean;

    abstract get isRegexBased(): boolean;

    abstract clone(domain: string): Gateway;

    abstract clean(): Promise<boolean>;

    get middlewares(): Middleware[] {
        return this._middlewares;
    }

    addMiddleware(middleware: Middleware) {
        this._middlewares.push(middleware);
    }

    request(processor: MiddlewareProcessor, request: ServerRequest, response: ServerResponse) {

        const from = processor.size;

        processor.append(this._middlewares);

        processor.pre(this.domain, request, response, () => {

            const upstream = this.resolveUpstream(request);

            if (upstream) {

                const proxyRequestOptions = request.proxyOptionsFor(this, upstream);

                const abortController = new AbortController();

                proxyRequestOptions.signal = abortController.signal;

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
                            LOGGER.error("upstreamRequest:evt:error:", error);

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
