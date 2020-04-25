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

    /**
     * Status code
     * @return {number}
     */
    get status() {
        return this._status;
    }

    /**
     * Set status code
     * @param {number} value
     */
    set status(value) {
        this._status = value;
    }

    /**
     * Time taken to serve the request (milliseconds)
     * @return {number}
     */
    get timing() {
        return this._timing;
    }

    /**
     * Request served date
     * @return {Date}
     */
    get date() {
        return this._date;
    }

    /**
     * Set request duration
     * @param {number} value
     */
    set timing(value) {
        this._timing = value;
    }

    /**
     * Virtual host
     * @return {string}
     */
    get vHost() {
        return this._vHost;
    }

    /**
     * Set virtual host
     * @param {string} value
     */
    set vHost(value) {
        this._vHost = value;
    }

    /**
     * Status code request key
     *
     * @return {string}
     */
    statusCounterKey() {
        return `${this.vHost}:${this.status}`;
    }

    /**
     * Latency request key
     *
     * @return {string}
     */
    latencyKey() {
        return `${this.vHost}:latency`;
    }

    /**
     * Total requests key
     *
     * @return {string}
     */
    totalNumberOfRequestKey() {
        return `${this.vHost}:req`;
    }

    /**
     * Last request timestamp
     *
     * @return {string}
     */
    lastRequestDateKey() {
        return `${this.vHost}:last`;
    }

    /**
     * To JSON object
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
