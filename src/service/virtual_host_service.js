/** node imports */
const {EventEmitter} = require('events');

/** project imports */
const {VirtualHost} = require('../model/virtual_host');
const {ResponseStats} = require('../model/response_stats');
const {LOGGER} = require('./logger_service');

/**
 * @class
 * @extends {EventEmitter}
 */
class VirtualHostService extends EventEmitter {

    /**
     *
     * @constructor
     */
    constructor() {
        super();
        this._wellDefinedHosts = new Map();
        this._regexBasedHosts = [];
    }

    /**
     * List of all virtual hosts
     *
     * @return {Array<VirtualHost>}
     */
    virtualHosts() {
        return [].concat(...this._regexBasedHosts, ...this._wellDefinedHosts.values());
    }

    /**
     * Adds new virtual host
     *
     * @fires VirtualHostService#host
     * @param {VirtualHost} vHost
     */
    addVirtualHost(vHost) {
        if (vHost instanceof VirtualHost) {
            if (vHost.isRegexBased) {

                const hasVHost = this._regexBasedHosts.find((v) => v.key() === vHost.key());

                if (hasVHost) {
                    this._regexBasedHosts.splice(this._regexBasedHosts.indexOf(hasVHost), 1);
                }

                this._regexBasedHosts.push(vHost);
            } else {
                this._wellDefinedHosts.set(vHost.key(), vHost);
            }

            /**
             * When a new host needs to be persisted
             * @event VirtualHostService#host
             */
            this.emit('host', vHost);
        }
    }


    /**
     * Finds requested virtual host
     *
     * @param {string} hostHeaderValue
     * @return {Promise<VirtualHost|null>}
     */
    async resolveVirtualHost(hostHeaderValue) {

        const vHost = this._wellDefinedHosts.get(hostHeaderValue);

        if (vHost) {
            return vHost;
        }

        for (const candidate of this._regexBasedHosts) {
            if (candidate.matchHost(hostHeaderValue)) {

                this.addVirtualHost(new VirtualHost(hostHeaderValue, hostHeaderValue, candidate.lb, candidate.upstreamHosts));

                return candidate;
            }
        }

        LOGGER.warn('Not found requested host:', hostHeaderValue);

        return null;
    }

    /**
     * Emit event for client served request
     *
     * @fires VirtualHostService#stats
     * @param {number} status
     * @param {number} timing
     * @param {string} hostHeaderValue
     */
    requestServed(status, timing, hostHeaderValue) {
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
    removeVirtualHostByKey(host) {

        if (this._wellDefinedHosts.has(host)) {

            this._wellDefinedHosts.delete(host);

        } else {

            const vHost = this._regexBasedHosts.find(v => v.key() === host);

            if (vHost) {
                this._regexBasedHosts.slice(this._regexBasedHosts.indexOf(vHost), 1);
            }
        }

        /**
         * When virtual host is removed
         * @event virtualHosts#delete
         */
        super.emit('delete', host);
    }
}


module.exports = {VirtualHostService};