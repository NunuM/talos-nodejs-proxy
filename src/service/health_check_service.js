/** node imports */
const util = require('util');
const {Socket} = require('net');
const backoff = util.promisify(setTimeout);

/** project imports */
const {LOGGER} = require('../service/logger_service');


class HealthCheckService {

    /**
     * @constructor
     * @param {VirtualHostService} virtualHostService
     */
    constructor(virtualHostService) {
        this._virtualHostService = virtualHostService;
    }

    /**
     * Get virtual host service
     *
     * @return {VirtualHostService}
     */
    get virtualHostService() {
        return this._virtualHostService;
    }

    /**
     * Never returning function that
     * pulls upstream state by establish
     * a socket connection with upstreams.
     *
     * @return {Promise<void>}
     */
    async startHealthCheck() {

        while (true) {

            await backoff(150000);

            LOGGER.info('Starting health checking');

            const virtualHost = this
                .virtualHostService
                .virtualHosts()
                .filter((vHost) => !(vHost.key().startsWith("www") || vHost.key().startsWith("*")));

            for (const host of virtualHost) {

                for (const upstream of host.upstreamHosts) {

                    await backoff(1000);

                    const socket = new Socket();
                    socket.setTimeout(1500);

                    await (new Promise((resolve) => {
                        socket.connect(upstream.port, upstream.host)

                            .on('timeout', () => {

                                host.isOnline = false;

                                LOGGER.error("Upstream host is not contactable", this, host);
                                resolve();
                            }).on('error', (error) => {

                            host.isOnline = false;

                            LOGGER.error("Upstream host is not contactable", this, host, error);
                            resolve();
                        }).on('connect', () => {
                            socket.destroy();
                            resolve();
                        });

                    }));
                }
            }
        }
    }
}

module.exports = {HealthCheckService};