import {UpstreamHost} from "./upstream-host";
import {LOGGER} from "../service/logger-service";
import {Gateway, GatewaysTypes} from "./gateway";
import {LoadBalancerFactory, LoadBalancerType} from "../load_balancer/load-balancer-type";
import {Identifiable} from "pluto-http-client/dist/framework/identifiable";
import {TimeUnit} from "pluto-http-client";
import {ServerRequest} from "./request";
import {Middleware} from "../middleware/middleware";
import {MiddlewareFactory} from "../middleware/middleware-registry";


/**
 * @class VirtualHost
 */
export class VirtualHost extends Gateway implements Identifiable {

    private readonly _upstreamHosts: UpstreamHost[];
    private readonly _isRegex: boolean;
    private readonly _regex: RegExp | null;

    /**
     * @constructor
     * @param {string} domain
     * @param {string} name
     * @param {number} loadBalancing;
     * @param {Array<UpstreamHost>} upstreamHosts
     * @param {Array<Middleware>} middlewares
     * @param {number} [requestTimeout=60000]
     */
    constructor(domain: string,
                name: string,
                loadBalancing: LoadBalancerType,
                upstreamHosts: UpstreamHost[] = [],
                middlewares: Middleware[] = [],
                requestTimeout: number = 1 * TimeUnit.Minutes) {
        super(domain, name, LoadBalancerFactory.getLoadBalancer(loadBalancing), middlewares, requestTimeout);

        this._upstreamHosts = upstreamHosts;
        this._isRegex = domain.includes('*');
        if (this._isRegex) {
            let regex = domain.split(".").join("\\\.").replace(/\*/g, '\.*');
            this._regex = new RegExp(regex);
        } else {
            this._regex = null;
        }
    }

    /**
     * Identity of this class
     *
     * @return {string}
     */
    id(): string {
        return this.domain;
    }

    /**
     * Associated upstreams for this virtual host
     *
     * @return {Array<UpstreamHost>}
     */
    get upstreamHosts() {
        return this._upstreamHosts;
    }

    /**
     * Check if this virtual host is based on a regex match
     *
     * @return {boolean}
     */
    get isRegexBased() {
        return this._isRegex;
    }


    /**
     * Find next available upstream node
     * using defined load balancing policy
     *
     * @return {UpstreamHost}
     */
    nextUpstream() {
        return this.loadBalancer.nextHost(this.upstreamHosts);
    }

    /**
     * Test if argument is this entity
     *
     * @param hostHeaderValue
     * @return {boolean}
     */
    match(hostHeaderValue: string): boolean {
        if (this._regex) {
            return this._regex.test(hostHeaderValue);
        }

        return false;
    }

    /**
     * To JSON object
     *
     * @return {object}
     */
    toJSON() {
        return {
            type: GatewaysTypes.VirtualHost,
            domain: this.domain,
            name: this.name,
            loadBalancer: this.loadBalancer.type,
            requestTimeout: this.requestTimeout,
            upstreamHosts: this.upstreamHosts,
            middlewares: this.middlewares.map((m) => m.serialize()),
        };
    }

    /**
     * Create instance from object
     * @param obj
     */
    static fromJSONObject(obj: VirtualHostObjectDefinition): VirtualHost | undefined {

        try {
            // @ts-ignore
            const domain: string = obj.domain || obj.host;

            //@ts-ignore
            obj.upstreamHosts = (obj.upstreamHosts || []).map((proxy) => {
                return new UpstreamHost(
                    proxy.host,
                    proxy.port,
                    proxy.isAlive,
                    proxy.isHTTPS,
                    proxy.isHTTP2,
                    proxy.isHTTP
                );
            });

            // @ts-ignore
            const middlewares = (obj.middlewares || []).map((m) => MiddlewareFactory[m](domain));

            // @ts-ignore
            return new VirtualHost(
                domain,
                obj.name,
                obj.lb || obj.loadBalancer,
                // @ts-ignore
                obj.upstreamHosts,
                middlewares,
                obj.requestTimeout);

        } catch (e) {
            LOGGER.error("Error creating virtual host instance", obj, e);
        }

        return undefined;

    }

    /**
     * Deserialize instance from redis
     *
     * @param {string} data
     */
    static fromJSONString(data: string): VirtualHost | undefined {
        if (typeof data === 'string') {
            try {
                const obj = JSON.parse(data);
                return VirtualHost.fromJSONObject(obj);
            } catch (e) {
                LOGGER.error("Error deserializing virtual host from raw string", data, e);
            }
        }
        return undefined;
    }

    resolveUpstream(request: ServerRequest): UpstreamHost | undefined {
        return this.nextUpstream();
    }

    clone(domain: string): Gateway {
        return new VirtualHost(domain, this.name, this.loadBalancer.type, this.upstreamHosts, this.middlewares, this.requestTimeout);
    }

    async clean(): Promise<boolean> {

        let result = true;

        for (let upstreamHost of this._upstreamHosts) {
            result &&= await upstreamHost.clean();
        }

        return result;
    }
}

export interface VirtualHostObjectDefinition {
    type: string;
    domain: string;
    host?: string; // old support
    lb?: number; // old support
    name: string;
    loadBalancer: number,
    upstreamHosts: Array<{ host: string; port: number, isAlive: boolean, isHTTPS: boolean, isHTTP2: boolean, isHTTP: boolean }>,
    middlewares: number[];
    requestTimeout: number;
}
