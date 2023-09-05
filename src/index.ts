// import {UpstreamHost} from "./model/upstream-host";
// import {VirtualHost} from "./model/virtual-host";
// import {LoadBalancerType} from "./load_balancer/load-balancer-type";
// import {GatewayHostService} from "./service/gateway-host-service";
// import {ProxyService} from "./service/proxy-service";
// import * as fs from "fs";
// import {AdminApiService} from "./service/admin-api-service";
// import {ApiGateway} from "./model/api-gateway";
// import {GatewayInMaintenanceMiddleware} from "./middleware/gateway-in-maintenance-middleware";
// import {InMemoryRepository} from "./repository/in-memory-repository";
//
// const upstreamHost1 = new UpstreamHost('talos.sh', 443, true, true, false, false);
// const virtualHost = new VirtualHost('talos.sh', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);
//
// const virtualHost2 = new VirtualHost('nunum.me',
//     'nunum',
//     LoadBalancerType.RoundRobin,
//     [upstreamHost1],
//     [new GatewayInMaintenanceMiddleware()]
// );
//
// const apiGateway = new ApiGateway(
//     'google.com',
//     'api gateway test', LoadBalancerType.FirstFree, new Map<string, UpstreamHost[]>(
//         [
//         ['/api/[0-5]{1}/*', [upstreamHost1]],
//     ]
//     ),
//     [new GatewayInMaintenanceMiddleware()]
// );
//
// const gatewayHostService = new GatewayHostService();
// gatewayHostService.addGatewayHost(virtualHost);
// gatewayHostService.addGatewayHost(virtualHost2);
// gatewayHostService.addGatewayHost(apiGateway);
//
// const adminApiService = new AdminApiService(new InMemoryRepository());
//
// const proxyService = new ProxyService(gatewayHostService);
//
// proxyService.httpsProxy(8888, {
//     key: fs.readFileSync('ssl/key3.pem'),
//     cert: fs.readFileSync('ssl/cert3.pem'),
//     rejectUnauthorized: false
// });
//
// proxyService.serve();
