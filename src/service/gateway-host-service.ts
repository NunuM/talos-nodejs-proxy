/** node imports */
import {VirtualHost} from "../model/virtual-host";
import {Gateway} from "../model/gateway";
import {GatewayNotFoundError} from "../exceptions/gateway-not-found-error";

import {EventEmitter} from 'events';

/** project imports */
import {ResponseStats} from '../model/response-stats';
import {LOGGER} from "./logger-service";

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


    exists(domain: string): boolean {
        for (let gatewayHost of this.gatewayHosts()) {
            if (gatewayHost.domain === domain) {
                return true;
            }
        }
        return false;
    }

    /**
     * Adds new virtual host
     */
    addGatewayHost(gateway: Gateway) {

        LOGGER.info("adding gateway:", gateway.domain);

        if (gateway.isRegexBased) {

            const hasVHost = this._regexBasedHosts.find((v) => v.domain === gateway.domain);

            if (hasVHost) {
                this._regexBasedHosts.splice(this._regexBasedHosts.indexOf(hasVHost), 1);
            }

            this._regexBasedHosts.push(gateway);
        } else {
            this._wellDefinedHosts.set(gateway.domain, gateway);
        }
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

        if(hostHeaderValue.startsWith('www.')) {
            hostHeaderValue = hostHeaderValue.substring(4);
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

                this.emit("resolved", gateway);

                return gateway;
            }
        }

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
     * @param {string} domain
     */
    removeVirtualHostByKey(domain: string): boolean {

        let gateway;

        if (this._wellDefinedHosts.has(domain)) {

            gateway = this._wellDefinedHosts.get(domain);

            this._wellDefinedHosts.delete(domain);

        } else {

            gateway = this._regexBasedHosts.find(v => v.domain === domain);

            if (gateway) {
                this._regexBasedHosts.splice(this._regexBasedHosts.indexOf(gateway), 1);
            }
        }

        /**
         * When virtual host is removed
         * @event virtualHosts#delete
         */
        if (gateway) {
            super.emit('delete', gateway);
            return true;
        }

        return false;
    }
}
