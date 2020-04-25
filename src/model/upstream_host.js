/**
 * @class
 */
class UpstreamHost {


    /**
     * @constructor
     * @param {string} host
     * @param {number} port
     * @param {boolean} [isAlive=true]
     */
    constructor(host, port, isAlive) {
        this._host = host;
        this._port = port;
        this._isOnline = isAlive || true;
    }

    /**
     * IP Address
     * @return {string}
     */
    get host() {
        return this._host;
    }

    /**
     * Set IP Address
     * @param {string} value
     */
    set host(value) {
        this._host = value;
    }

    /**
     * Upstream port
     * @return {number}
     */
    get port() {
        return this._port;
    }

    /**
     * Define port
     * @param {number} value
     */
    set port(value) {
        this._port = value;
    }

    /**
     * Check upstream state
     *
     * @return {boolean}
     */
    get isOnline() {
        return this._isOnline;
    }

    /**
     * Set upstream state
     *
     * @return {boolean}
     */
    set isOnline(value) {
        this._isOnline = value;
    }

    /**
     * To JSON object
     * @return {{host: string, port: number, isAlive: boolean}}
     */
    toJSON() {
        return {
            host: this.host,
            port: this.port,
            isAlive: this.isOnline
        };
    }
}

module.exports = {UpstreamHost};