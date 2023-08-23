/** node imports */
import {VirtualHost} from "../model/virtual-host";
import {Gateway} from "../model/gateway";
import {GatewayNotFoundError} from "../exceptions/gateway-not-found-error";

const {EventEmitter} = require('events');

/** project imports */
const {ResponseStats} = require('../model/response-stats');
const {LOGGER} = require('./logger-service');

/**
 * @class
 * @extends {EventEmitter}
 */
export class GatewayHostService extends EventEmitter {


    private readonly _regexBasedHosts: Gateway[];

    /**
     * @constructor
     */
    constructor(private _wellDefinedHosts: Map<string, Gateway> = new Map<string, Gateway>()) {
        super();
        this._wellDefinedHosts = new Map();
        this._regexBasedHosts = [];
    }

    /**
     * List of all virtual hosts
     *
     * @return {Array<VirtualHost>}
     */
    gatewayHosts(): Gateway[] {
        return Array(...this._regexBasedHosts).concat(...this._wellDefinedHosts.values());
    }

    /**
     * Adds new virtual host
     */
    addGatewayHost(gateway: Gateway) {

        if (gateway.isRegexBased) {

            const hasVHost = this._regexBasedHosts.find((v) => v.domain === gateway.domain);

            if (hasVHost) {
                this._regexBasedHosts.splice(this._regexBasedHosts.indexOf(hasVHost), 1);
            }

            this._regexBasedHosts.push(gateway);
        } else {
            this._wellDefinedHosts.set(gateway.domain, gateway);
        }

        /**
         * When a new host needs to be persisted
         * @event VirtualHostService#host
         */
        this.emit('gateway', gateway);
    }


    /**
     * Finds requested virtual host
     *
     * @param {string} hostHeaderValue
     * @return {Promise<Gateway>}
     */
    async resolveGateway(hostHeaderValue = ''): Promise<Gateway> {

        let idx;
        if (hostHeaderValue.length === 0) {
            throw new GatewayNotFoundError(`Gateway not found for empty domain:${hostHeaderValue}`);
        }

        if ((idx = hostHeaderValue.indexOf(":")) !== -1) {
            hostHeaderValue = hostHeaderValue.substring(0, idx)
        }

        const vHost = this._wellDefinedHosts.get(hostHeaderValue);

        if (vHost) {
            return vHost;
        }

        for (const candidate of this._regexBasedHosts) {
            if (candidate.match(hostHeaderValue)) {

                const gateway = candidate.clone(hostHeaderValue);

                this.addGatewayHost(gateway);

                return gateway;
            }
        }

        LOGGER.warn('Not found requested host:', hostHeaderValue);

        throw new GatewayNotFoundError(`Gateway not found for domain:${hostHeaderValue}`);
    }

    /**
     * Emit event for client served request
     *
     * @fires VirtualHostService#stats
     * @param {number} status
     * @param {number} timing
     * @param {string} hostHeaderValue
     */
    requestServed(status: number, timing: number, hostHeaderValue: string) {
        /**
         * @event VirtualHostService#stats
         */
        this.emit('stats', new ResponseStats(status, timing, hostHeaderValue));
    }


    /**
     * Remove virtual host
     *
     * @fires VirtualHostService#delete
     * @param {string} host
     */
    removeVirtualHostByKey(host: string) {

        let gateway;

        if (this._wellDefinedHosts.has(host)) {

            gateway = this._wellDefinedHosts.get(host);

            this._wellDefinedHosts.delete(host);

        } else {

            gateway = this._regexBasedHosts.find(v => v.domain === host);

            if (gateway) {
                this._regexBasedHosts.splice(this._regexBasedHosts.indexOf(gateway), 1);
            }
        }

        /**
         * When virtual host is removed
         * @event virtualHosts#delete
         */
        super.emit('delete', gateway);
    }
}
