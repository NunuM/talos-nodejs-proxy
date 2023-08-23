import {UpstreamHost} from "./upstream-host";
import {LOGGER} from "../service/logger-service";
import {Gateway} from "./gateway";
import {LoadBalancerFactory, LoadBalancerType} from "../load_balancer/load-balancer-type";
import {LoadBalancer} from "../load_balancer/load-balancer";
import {Identifiable} from "pluto-http-client/dist/framework/identifiable";
import {TimeUnit} from "pluto-http-client";
import {ServerRequest} from "./request";


/**
 * @class VirtualHost
 */
export class VirtualHost extends Gateway implements Identifiable {

    private readonly _domain: string;
    private _name: string;
    private readonly _upstreamHosts: UpstreamHost[];
    private readonly _isRegex: boolean;
    private readonly _regex: RegExp | null;
    private readonly _loadBalancer: LoadBalancer;
    private _requestTimeout: number;

    /**
     * @constructor
     * @param {string} domain
     * @param {string} name
     * @param {number} loadBalancing;
     * @param {Array<UpstreamHost>} upstreamHosts
     * @param {number} [requestTimeout=60000]
     */
    constructor(domain: string,
                name: string,
                loadBalancing: LoadBalancerType,
                upstreamHosts: UpstreamHost[] = [],
                requestTimeout: number = 1 * TimeUnit.Minutes) {
        super();
        this._domain = domain;
        this._name = name;
        this._upstreamHosts = upstreamHosts;
        this._isRegex = domain.includes('*');
        if (this._isRegex) {
            let regex = domain.split(".").join("\\\.").replace(/\*/g, '\.*');
            this._regex = new RegExp(regex);
        } else {
            this._regex = null;
        }
        this._loadBalancer = LoadBalancerFactory.getLoadBalancer(loadBalancing);
        this._requestTimeout = requestTimeout;
    }

    /**
     * Identity of this class
     *
     * @return {string}
     */
    id(): string {
        return this._domain;
    }

    get domain(): string {
        return this._domain;
    }

    /**
     * Label of virtual host
     *
     * @return {string}
     */
    get name() {
        return this._name;
    }

    /**
     * Define new label for virtual host
     *
     * @param {string} value
     */
    set name(value) {
        this._name = value;
    }

    get lb() {
        return this._loadBalancer;
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
        return this._loadBalancer.nextHost(this.upstreamHosts);
    }


    get requestTimeout(): number {
        return this._requestTimeout;
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
            domain: this.domain,
            name: this.name,
            lb: this.lb.type,
            upstreamHosts: this.upstreamHosts,
            requestTimeout: this.requestTimeout
        };
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

                return new VirtualHost(obj.domain || obj.host,
                    obj.name,
                    obj.lb,
                    obj.upstreamHosts,
                    obj.requestTimeout);

            } catch (e) {
                LOGGER.error("Error parsing data from redis", e);
            }
        }
        return undefined;
    }

    resolveUpstream(request: ServerRequest): UpstreamHost | undefined {
        return this.nextUpstream();
    }

    clone(domain: string): Gateway {
        return new VirtualHost(domain, this.name, this.lb.type, this.upstreamHosts);
    }

    async clean(): Promise<boolean> {

        let result = true;

        for (let upstreamHost of this._upstreamHosts) {
            result &&= await upstreamHost.clean();
        }

        return result;
    }


}
