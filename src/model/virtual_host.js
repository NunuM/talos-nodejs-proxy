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
     * @param {number} lb;
     * @param {Array<UpstreamHost>} upstreamHosts
     */
    constructor(host, name, lb, upstreamHosts) {
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
        this._lb = lb;
        switch (lb) {
            case LB_TYPES.RR:
                this._loadBalancer = new RoundRobinLB();
                break;
            default:
                this._loadBalancer = new FirstFreeLB();
                break;
        }
    }

    get host() {
        return this._host;
    }

    set host(value) {
        this._host = value;
    }

    get name() {
        return this._name;
    }

    set name(value) {
        this._name = value;
    }

    get lb() {
        return this._lb;
    }

    /**
     *
     * @return {Array<UpstreamHost>}
     */
    get upstreamHosts() {
        return this._upstreamHosts;
    }

    /**
     *
     * @return {string}
     */
    key() {
        return this.host;
    }

    /**
     *
     * @return {boolean}
     */
    get isRegexBased() {
        return this._isRegex;
    }


    /**
     *
     * @return {UpstreamHost}
     */
    nextUpstream() {
        return this._loadBalancer.nextHost(this.upstreamHosts);
    }


    /**
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