import cluster from 'cluster';
import {LOGGER, WORKER_LOGGER} from "./logger-service";
import {ProxyService} from "./proxy-service";
import {GatewayHostService} from "./gateway-host-service";
import {getRepository} from "../app/bootstrap";
import {ResponseStats} from "../model/response-stats";
import {Config} from "../app/config";
import {AdminApiService} from "./admin-api-service";
import {VirtualHost} from "../model/virtual-host";
import {ApiGateway} from "../model/api-gateway";
import {Repository} from "../repository/repository";

enum Command {
    Add,
    Remove
}

interface WorkerMessage {
    cmd: Command,
    data: any
}

export class ProxyStarterService {

    static start(workers: number = Config.numberOfWorkers()) {
        if (workers > 0) {
            ProxyStarterService.startWithWorkers(workers);
        } else {

            const gatewayHostService = new GatewayHostService();

            const repositoryPromise = ProxyStarterService.startProxyService(gatewayHostService);

            repositoryPromise
                .then((repository) => {
                    const adminApiService = new AdminApiService(repository);

                    adminApiService.on('gateway', (gateway) => {
                        gatewayHostService.addGatewayHost(gateway);
                    });

                    adminApiService.on('removed', (gateway) => {
                        gatewayHostService.removeVirtualHostByKey(gateway.domain);
                    });

                    gatewayHostService.on('stats', (stats) => {
                        process.nextTick(() => {
                            repository.saveResponseStatus(stats).catch((error) => {
                                LOGGER.error("Error saving stats", error);
                            });
                        });
                    });
                })
                .catch((error) => {
                    LOGGER.error("Error starting proxy service", error);
                    process.exit(1);
                });
        }
    }

    static startProxyService(gatewayHostService: GatewayHostService): Promise<Repository> {

        const proxyService = new ProxyService(gatewayHostService);

        proxyService.loadFromConfig();

        const repository = getRepository();

        return repository
            .connect()
            .then(() => {
                return repository.loadGateways();
            })
            .then((gateways) => {
                gateways.forEach((g) => gatewayHostService.addGatewayHost(g));
            })
            .then(() => {
                proxyService.serve();
            })
            .then(() => repository);
    }

    static startWithWorkers(workers: number = 0) {
        if (cluster.isPrimary) {

            const repository = getRepository();

            repository
                .connect()
                .then(() => {

                    const adminApiService = new AdminApiService(repository);

                    adminApiService.on('gateway', (gateway) => {
                        for (const id in cluster.workers) {
                            //@ts-ignore
                            cluster.workers[id].send({cmd: Command.Add, data: gateway.toJSON()});
                        }
                    });

                    adminApiService.on('removed', (gateway) => {
                        for (const id in cluster.workers) {
                            //@ts-ignore
                            cluster.workers[id].send({cmd: Command.Remove, data: gateway.toJSON()});
                        }
                    });

                    for (let i = 0; i < workers; i++) {
                        cluster.fork();
                    }


                })
                .catch((error) => {
                    LOGGER.error("Error connecting to repository", error);
                    process.exit(1);
                });
        } else {
            //@ts-ignore
            WORKER_LOGGER.addContext('workerId', cluster.worker.id);
            //@ts-ignore
            WORKER_LOGGER.info(`Worker ${cluster.worker.id} started`);

            const gatewayHostService = new GatewayHostService();

            const repositoryPromise = ProxyStarterService.startProxyService(gatewayHostService);

            repositoryPromise
                .then((repository) => {

                    function logError(error: Error) {
                        WORKER_LOGGER.log("Error saving response stats", error);
                    }

                    gatewayHostService.on('stats', (stats: ResponseStats) => {
                        process.nextTick(() => {
                            repository.saveResponseStatus(stats).catch(logError);
                        });
                    });

                })
                .catch((error) => {
                    WORKER_LOGGER.error("Error starting proxy service", error);
                    cluster.worker?.kill();
                });

            cluster.worker?.on('message', (message: WorkerMessage) => {
                switch (message.cmd) {
                    case Command.Add:
                        let gateway;
                        if (message.data.type === 'virtualHost') {
                            gateway = VirtualHost.fromJSONObject(message.data);
                        } else {
                            gateway = ApiGateway.fromJSONObject(message.data);
                        }

                        if (gateway) {
                            gatewayHostService.addGatewayHost(gateway);
                        }
                        break;
                    case Command.Remove:
                        gatewayHostService.removeVirtualHostByKey(message.data.domain);
                        break;
                }
            });

            process.on('uncaughtException', (exception, origin) => {
                WORKER_LOGGER.error("Uncaught Exception", exception, 'at', origin);
            });

            process.on('unhandledRejection', (reason, promise) => {
                WORKER_LOGGER.error('Unhandled Rejection at:', promise, 'reason:', reason);
            });
        }
    }
}

if (cluster.isPrimary) {
    process.on('uncaughtException', (exception, origin) => {
        LOGGER.error("Uncaught Exception", exception, 'at', origin);
    });

    process.on('unhandledRejection', (reason, promise) => {
        LOGGER.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
}
