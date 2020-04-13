/** node imports */
const {EventEmitter} = require('events');

/** project imports */
const {VirtualHost} = require('../model/virtual_host');
const {ResponseStats} = require('../model/response_stats');
const {LOGGER} = require('./logger_service');

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
     *
     * @return {Array<VirtualHost>}
     */
    virtualHosts() {
        return [].concat(...this._regexBasedHosts, ...this._wellDefinedHosts.values());
    }

    /**
     *
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
            this.emit('host', vHost);
        }
    }


    /**
     *
     * @param {string} hostHeaderValue
     * @return {Promise<VirtualHost|null>}
     */
    async resolveVirtualHost(hostHeaderValue) {

        const vHost = this._wellDefinedHosts.get(hostHeaderValue.toLowerCase());

        if (vHost) {
            return vHost;
        }

        for (const candidate of this._regexBasedHosts) {
            if (candidate.matchHost(hostHeaderValue.toLowerCase())) {

                this.addVirtualHost(new VirtualHost(hostHeaderValue, hostHeaderValue, candidate.lb, candidate.upstreamHosts));

                return candidate;
            }
        }

        LOGGER.warn('Not found requested host:', hostHeaderValue);

        return null;
    }

    requestServed(status, timing, hostHeaderValue) {
        this.emit('stats', new ResponseStats(status, timing, hostHeaderValue));
    }


    /**
     *
     * @param {string} host
     */
    removeVirtualHostBykey(host) {

        if (this._wellDefinedHosts.has(host)) {

            this._wellDefinedHosts.delete(host);

        } else {

            const vHost = this._regexBasedHosts.find(v => v.key() === host);

            if (vHost) {
                this._regexBasedHosts.slice(this._regexBasedHosts.indexOf(vHost), 1);
            }
        }

        super.emit('delete', host);
    }
}


module.exports = {VirtualHostService};