import {Gateway, GatewaysTypes} from "./gateway";
import {UpstreamHost} from "./upstream-host";
import {LOGGER} from "../service/logger-service";
import {LoadBalancerFactory, LoadBalancerType} from "../load_balancer/load-balancer-type";
import {Identifiable} from "pluto-http-client/dist/framework/identifiable";
import {TimeUnit} from "pluto-http-client";
import {ServerRequest} from "./request";
import {MiddlewareFactory} from "../middleware/middleware-registry";
import {Middleware} from "../middleware/middleware";

export class ApiGateway extends Gateway implements Identifiable {

    private readonly _regex?: RegExp;
    private readonly _wellDefinedRoutesToUpstreamHosts: Map<string, UpstreamHost[]>;
    private readonly _regexRoutesToUpstreamHosts: Map<RegExp, UpstreamHost[]>;

    constructor(domain: string,
                name: string,
                loadBalancing: LoadBalancerType,
                routesToUpstreamHosts: Map<string | RegExp, UpstreamHost[]>,
                middlewares: Middleware[] = [],
                requestTimeout: number = 1 * TimeUnit.Minutes) {
        super(domain, name, LoadBalancerFactory.getLoadBalancer(loadBalancing), middlewares, requestTimeout);
        this._wellDefinedRoutesToUpstreamHosts = new Map<string, UpstreamHost[]>();
        this._regexRoutesToUpstreamHosts = new Map<RegExp, UpstreamHost[]>();

        if (domain.includes("*")) {
            let regex = domain.split(".").join("\\\.").replace(/\*/g, '\.*');
            this._regex = new RegExp(regex);
        }

        for (let [route, hosts] of routesToUpstreamHosts.entries()) {
            if (typeof route === 'string') {
                if (route.includes("*")) {
                    let regex = route.split("/").join("\\\/").replace(/\*/g, '\.*');
                    this._regexRoutesToUpstreamHosts.set(new RegExp(regex), hosts);
                } else {
                    this._wellDefinedRoutesToUpstreamHosts.set(route, hosts);
                }
            } else {
                this._regexRoutesToUpstreamHosts.set(route, hosts);
            }
        }
    }

    id(): string {
        return this.domain;
    }

    get isRegexBased(): boolean {
        return this.domain.includes("*");
    }

    get wellDefinedRoutesToUpstreamHosts(): Map<string, UpstreamHost[]> {
        return this._wellDefinedRoutesToUpstreamHosts;
    }

    get regexRoutesToUpstreamHosts(): Map<RegExp, UpstreamHost[]> {
        return this._regexRoutesToUpstreamHosts;
    }

    clone(domain: string): Gateway {

        const map = new Map<string | RegExp, UpstreamHost[]>();

        for (const [route, hosts] of this._wellDefinedRoutesToUpstreamHosts.entries()) {
            map.set(route, hosts);
        }

        for (const [regex, hosts] of this._regexRoutesToUpstreamHosts.entries()) {
            map.set(regex, hosts);
        }

        return new ApiGateway(
            domain,
            this.name,
            this.loadBalancer.type,
            map,
            this.middlewares,
            this.requestTimeout
        );
    }

    match(domain: string): boolean {
        if (this.isRegexBased && this._regex) {
            return this._regex.test(domain);
        }

        return false;
    }

    resolveUpstream(request: ServerRequest): UpstreamHost | undefined {
        const path = request.path;

        LOGGER.trace("finding match for path:", path);

        const someHosts = this.wellDefinedRoutesToUpstreamHosts.get(path);

        if (someHosts) {

            LOGGER.trace("found match for path:", path, someHosts);

            const nextHost: UpstreamHost | undefined = this.loadBalancer.nextHost(someHosts);
            if (nextHost) {
                return nextHost;
            }
        }

        for (const [regex, hosts] of this.regexRoutesToUpstreamHosts.entries()) {
            if (regex.test(path)) {

                LOGGER.trace("found match for regex path:", path, hosts);

                const nextHost: UpstreamHost | undefined = this.loadBalancer.nextHost(hosts);
                if (nextHost) {
                    return nextHost;
                }
            }
        }

        return void 0;
    }

    async clean(): Promise<boolean> {

        let result = true;

        for (let upstreamHosts of this._wellDefinedRoutesToUpstreamHosts.values()) {
            for (let upstreamHost of upstreamHosts) {
                result &&= await upstreamHost.clean();
            }
        }

        for (let upstreamHosts of this._regexRoutesToUpstreamHosts.values()) {
            for (let upstreamHost of upstreamHosts) {
                result &&= await upstreamHost.clean();
            }
        }

        return result;
    }

    /**
     * To JSON object
     *
     * @return {object}
     */
    toJSON() {

        const upstreams: { [key: string]: UpstreamHost[] } = {};

        for (const [route, hosts] of this._wellDefinedRoutesToUpstreamHosts.entries()) {
            upstreams[route] = hosts;
        }

        for (let [route, hosts] of this._regexRoutesToUpstreamHosts.entries()) {
            upstreams['r' + route.source] = hosts;
        }

        return {
            type: GatewaysTypes.ApiGateway,
            domain: this.domain,
            name: this.name,
            loadBalancer: this.loadBalancer.type,
            requestTimeout: this.requestTimeout,
            routesToUpstreamHosts: upstreams,
            middlewares: this.middlewares.map((m) => m.serialize()),
        }
    }


    /**
     * Create instance from object
     * @param obj
     */
    static fromJSONObject(obj: ApiGatewayObjectDefinition): ApiGateway | undefined {

        try {

            const routes = new Map<string | RegExp, UpstreamHost[]>();

            for (const [route, upstreams] of Object.entries(obj.routesToUpstreamHosts)) {

                //@ts-ignore
                let upstreamHosts = (upstreams || []).map((upstream) => {
                    //@ts-ignore
                    return new UpstreamHost(
                        upstream.host,
                        upstream.port,
                        upstream.isAlive,
                        upstream.isHTTPS,
                        upstream.isHTTP2,
                        upstream.isHTTP
                    );
                });

                if (route.startsWith('r')) {
                    routes.set(new RegExp(route.substring(1)), upstreamHosts);
                } else {
                    routes.set(route, upstreamHosts);
                }
            }

            // @ts-ignore
            const middlewares = (obj.middlewares || []).map((m) => MiddlewareFactory[m](obj.domain));

            return new ApiGateway(
                obj.domain,
                obj.name,
                obj.loadBalancer,
                routes,
                middlewares,
                obj.requestTimeout
            );
        } catch (e) {
            LOGGER.error("Error creating api gateway instance", obj, e);
        }

        return undefined;
    }

    static fromJSONString(data: string): ApiGateway | undefined {

        try {
            const json = JSON.parse(data);

            return ApiGateway.fromJSONObject(json);

        } catch (e) {
            LOGGER.error("Error deserializing api gateway from raw string", data, e);
        }

        return undefined;
    }
}


export interface ApiGatewayObjectDefinition {
    type: string;
    domain: string;
    name: string;
    loadBalancer: number,
    routesToUpstreamHosts: { [key: string]: Array<{ host: string; port: number, isAlive: boolean, isHTTPS: boolean, isHTTP2: boolean, isHTTP: boolean }> }
    middlewares: number[];
    requestTimeout: number;
}
