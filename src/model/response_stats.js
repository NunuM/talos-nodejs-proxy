/**
 * @class
 */
class ResponseStats {

    /**
     * @constructor
     * @param {number} status
     * @param {number} timing
     * @param {string} vHost
     */
    constructor(status, timing, vHost) {
        this._status = status;
        this._timing = timing;
        this._vHost = vHost;
        this._date = new Date()
    }

    get status() {
        return this._status;
    }

    set status(value) {
        this._status = value;
    }

    get timing() {
        return this._timing;
    }

    /**
     *
     * @return {Date}
     */
    get date() {
        return this._date;
    }

    set timing(value) {
        this._timing = value;
    }

    get vHost() {
        return this._vHost;
    }

    set vHost(value) {
        this._vHost = value;
    }

    /**
     *
     * @return {string}
     */
    statusCounterKey() {
        return `${this.vHost}:${this.status}`;
    }

    /**
     *
     * @return {string}
     */
    latencyKey() {
        return `${this.vHost}:latency`;
    }

    /**
     *
     * @return {string}
     */
    totalNumberOfRequestKey() {
        return `${this.vHost}:req`;
    }

    /**
     *
     * @return {string}
     */
    lastRequestDateKey() {
        return `${this.vHost}:last`;
    }

    /**
     *
     * @return {string}
     */
    toJSON() {
        return JSON.stringify({
            status: this.status,
            timing: this.timing,
            vHost: this.vHost,
            date: this._date.getTime()
        });
    }
}

module.exports = {ResponseStats};
