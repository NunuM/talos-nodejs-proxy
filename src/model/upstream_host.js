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

    get host() {
        return this._host;
    }

    set host(value) {
        this._host = value;
    }

    get port() {
        return this._port;
    }

    set port(value) {
        this._port = value;
    }

    get isOnline() {
        return this._isOnline;
    }

    set isOnline(value) {
        this._isOnline = value;
    }

    toJSON() {
        return {
            host: this.host,
            port: this.port,
            isAlive: this.isOnline
        };
    }
}

module.exports = {UpstreamHost};