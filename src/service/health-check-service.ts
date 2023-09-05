import {GatewayHostService} from "./gateway-host-service";
import {Gateway} from "../model/gateway";
import {VirtualHost} from "../model/virtual-host";

/** node imports */
const util = require('util');
const {Socket} = require('net');
const backoff = util.promisify(setTimeout);

/** project imports */
const {LOGGER} = require('../service/logger-service');


export class HealthCheckService {

    private readonly _gatewayHostService: GatewayHostService;

    /**
     * @constructor
     */
    constructor(gatewayHostService: GatewayHostService) {
        this._gatewayHostService = gatewayHostService;
    }

    get gatewayHostService(): GatewayHostService {
        return this._gatewayHostService;
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

            const gateways: Gateway[] = this
                .gatewayHostService
                .gatewayHosts()
                .filter((vHost) => !(vHost.domain.startsWith("www") || vHost.domain.startsWith("*")));

            for (const gateway of gateways) {

                if (gateway instanceof VirtualHost) {

                    for (const upstream of gateway.upstreamHosts) {

                        await backoff(1000);

                        const socket = new Socket();
                        socket.setTimeout(1500);

                        await (new Promise<void>((resolve) => {
                            socket.connect(upstream.port, upstream.host)

                                .on('timeout', () => {

                                    upstream.isOnline = false;

                                    LOGGER.error("Upstream host is not contactable", this, upstream);
                                    resolve();
                                }).on('error', (error: any) => {

                                upstream.isOnline = false;

                                LOGGER.error("Upstream host is not contactable", this, upstream, error);
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
}

module.exports = {HealthCheckService};
