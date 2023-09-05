/** node imports */
import * as util from "util";

enum KeysSuffix {
    Latency = 'latency',
    RequestCounter = 'req',
    LastRequestDate = 'last'
}

/**
 * @class
 */
export class ResponseStats {

    private _status: number;
    private _timing: number;
    private _vHost: string;
    private readonly _date: Date;

    /**
     * @constructor
     * @param {number} status
     * @param {number} timing
     * @param {string} vHost
     */
    constructor(status: number, timing: number, vHost: string) {
        this._status = status;
        this._timing = timing;
        this._vHost = vHost;
        this._date = new Date()
    }

    /**
     * Status code
     * @return {number}
     */
    get status(): number {
        return this._status;
    }

    /**
     * Set status code
     * @param {number} value
     */
    set status(value: number) {
        this._status = value;
    }

    /**
     * Time taken to serve the request (milliseconds)
     * @return {number}
     */
    get timing(): number {
        return this._timing;
    }

    /**
     * request served date
     * @return {Date}
     */
    get date(): Date {
        return this._date;
    }

    /**
     * Set request duration
     * @param {number} value
     */
    set timing(value: number) {
        this._timing = value;
    }

    /**
     * Virtual host
     * @return {string}
     */
    get vHost(): string {
        return this._vHost;
    }

    /**
     * Set virtual host
     * @param {string} value
     */
    set vHost(value: string) {
        this._vHost = value;
    }

    /**
     * Status code request key
     *
     * @return {string}
     */
    statusCounterKey(): string {
        return `${this.vHost}:${this.status}`;
    }

    /**
     * Latency request key
     *
     * @return {string}
     */
    latencyKey(): string {
        return `${this.vHost}:${KeysSuffix.Latency}`;
    }

    /**
     * Total requests key
     *
     * @return {string}
     */
    totalNumberOfRequestKey(): string {
        return `${this.vHost}:${KeysSuffix.RequestCounter}`;
    }

    /**
     * Last request timestamp
     *
     * @return {string}
     */
    lastRequestDateKey(): string {
        return `${this.vHost}:${KeysSuffix.LastRequestDate}`;
    }

    /**
     * To JSON object
     * @return {string}
     */
    toJSON(): string {
        return JSON.stringify({
            status: this.status,
            timing: this.timing,
            vHost: this.vHost,
            date: this._date.getTime()
        });
    }

    /**
     * Status‘
     */
    toString(): string {
        return util.format("status:%d, timing:%s, virtual host:%s at %s", this.status, this.timing, this.vHost, this.date)
    }
}

module.exports = {ResponseStats};
