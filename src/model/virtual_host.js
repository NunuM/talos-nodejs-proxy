/** node imports */
const vm = require('vm');

/** project imports */
const {UpstreamHost} = require('./upstream_host');
const {LOGGER} = require('../service/logger_service');
const {LB_TYPES} = require('../load_balancer/lb_enum');
const {FirstFreeLB} = require('../load_balancer/first_free_lb');
const {RoundRobinLB} = require('../load_balancer/round_robin_lb');

/**
 * @class VirtualHost
 */
class VirtualHost {

    /**
     * @constructor
     * @param {string} host
     * @param {string} name
     * @param {number} loadBalancing;
     * @param {Array<UpstreamHost>} upstreamHosts
     */
    constructor(host, name, loadBalancing, upstreamHosts) {
        this._host = host;
        this._name = name;
        this._upstreamHosts = upstreamHosts;
        this._isRegex = host.includes('*');
        if (this._isRegex) {

            let regex = host.split(".").join("\\\.").replace(/\*/g, '\.*');

            this._regex = new RegExp(regex);
        } else {
            this._regex = null;
        }
        this._lb = loadBalancing;
        switch (loadBalancing) {
            case LB_TYPES.RR:
                this._loadBalancer = new RoundRobinLB();
                break;
            default:
                this._loadBalancer = new FirstFreeLB();
                break;
        }
    }

    /**
     *
     * @return {string}
     */
    get host() {
        return this._host;
    }

    /**
     *
     * @param {string} value
     */
    set host(value) {
        this._host = value;
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
        return this._lb;
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
     * Identity of this class
     *
     * @return {string}
     */
    key() {
        return this.host;
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


    /**
     * Test if argument is this entity
     *
     * @param hostHeaderValue
     * @return {boolean}
     */
    matchHost(hostHeaderValue) {
        if (this._regex) {
            return this._regex.test(hostHeaderValue);
        }

        return false;
    }

    /**
     * To JSON object
     *
     * @return {string}
     */
    toJSON() {
        return {
            host: this.host,
            name: this.name,
            lb: this._lb,
            upstreamHosts: this.upstreamHosts
        };
    }

    /**
     * Deserialize instance from redis
     *
     * @param {string} data
     */
    static fromRedis(data) {

        if (typeof data === 'string') {
            try {
                const obj = JSON.parse(data);

                obj.upstreamHosts = (obj.upstreamHosts || []).map((proxy) => {
                    return new UpstreamHost(proxy.host, proxy.port, proxy.isAlive);
                });

                return new VirtualHost(obj.host, obj.name, obj.lb, obj.upstreamHosts);

            } catch (e) {
                LOGGER.error("Error parsing data from redis", e);
            }
        }
        return null;
    }
}

module.exports = {VirtualHost};