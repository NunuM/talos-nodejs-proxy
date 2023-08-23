import {Gateway} from "./gateway";
import {UpstreamHost} from "./upstream-host";
import {LOGGER} from "../service/logger-service";
import {LoadBalancer} from "../load_balancer/load-balancer";
import {LoadBalancerFactory, LoadBalancerType} from "../load_balancer/load-balancer-type";
import {Identifiable} from "pluto-http-client/dist/framework/identifiable";
import {TimeUnit} from "pluto-http-client";
import {ServerRequest} from "./request";

export class ApiGateway extends Gateway implements Identifiable {

    private readonly _domain: string;
    private readonly _name: string;
    private readonly _regex?: RegExp;
    private readonly _loadBalancer: LoadBalancer;
    private readonly _wellDefinedRoutesToUpstreamHosts: Map<string, UpstreamHost[]>;
    private readonly _regexRoutesToUpstreamHosts: Map<RegExp, UpstreamHost[]>;

    constructor(domain: string,
                name: string,
                loadBalancing: LoadBalancerType,
                routesToUpstreamHosts: Map<string | RegExp, UpstreamHost[]>,
                private _requestSocketTimeout: number = 5 * TimeUnit.Seconds) {
        super();
        this._domain = domain;
        this._name = name;
        this._loadBalancer = LoadBalancerFactory.getLoadBalancer(loadBalancing);
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
        return this._domain;
    }

    get name(): string {
        return this._name;
    }

    get domain(): string {
        return this._domain;
    }

    get isRegexBased(): boolean {
        return this._domain.includes("*");
    }

    get wellDefinedRoutesToUpstreamHosts(): Map<string, UpstreamHost[]> {
        return this._wellDefinedRoutesToUpstreamHosts;
    }

    get regexRoutesToUpstreamHosts(): Map<RegExp, UpstreamHost[]> {
        return this._regexRoutesToUpstreamHosts;
    }

    get requestTimeout(): number {
        return this._requestSocketTimeout;
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
            this._loadBalancer.type,
            map
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

            const nextHost: UpstreamHost | undefined = this._loadBalancer.nextHost(someHosts);
            if (nextHost) {
                return nextHost;
            }
        }

        for (const [regex, hosts] of this.regexRoutesToUpstreamHosts.entries()) {
            if (regex.test(path)) {

                LOGGER.trace("found match for regex path:", path, hosts);

                const nextHost: UpstreamHost | undefined = this._loadBalancer.nextHost(hosts);
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

        return Promise.resolve(false);
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
            domain: this._domain,
            name: this._name,
            load_balancer: this._loadBalancer.type,
            socket_timeout: this.requestTimeout,
            routes_to_upstream_hosts: upstreams
        }
    }

    static fromJSONString(data: string): ApiGateway | undefined {

        try {
            const json = JSON.parse(data);
            const routes = new Map<string | RegExp, UpstreamHost[]>();

            for (const [route, upstreams] of Object.entries(json.routes_to_upstream_hosts)) {

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

            return new ApiGateway(
                json.domain,
                json.name,
                json.load_balancer,
                routes,
                json.socket_timeout
            );
        } catch (e) {
            LOGGER.error("Error deserializing api", data, e)
        }

        return undefined;
    }
}
