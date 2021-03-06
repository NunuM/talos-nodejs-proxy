/**
 * @class
 */
class UpstreamHost {


    /**
     * @constructor
     * @param {string} host
     * @param {number} port
     * @param {boolean} [isAlive=true]
     * @param {boolean} [isHTTPS=false]
     */
    constructor(host, port, isAlive, isHTTPS) {
        this._host = host;
        this._port = port;
        this._isOnline = isAlive || true;
        this._isHTTPS = isHTTPS || false;
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
     * Only has HTTPS
     *
     * @return {boolean}
     */
    get isOverHTTPS() {
        return this._isHTTPS;
    }

    /**
     * Set HTTPS
     *
     * @param {boolean} value
     */
    set supportHTTPS(value) {
        this._isHTTPS = value;
    }

    /**
     * To JSON object
     * @return {{host: string, port: number, isAlive: boolean}}
     */
    toJSON() {
        return {
            host: this.host,
            port: this.port,
            isAlive: this.isOnline,
            isHTTPS: this.isOverHTTPS
        };
    }
}

module.exports = {UpstreamHost};