import {UpstreamHost} from "./model/upstream-host";
import {VirtualHost} from "./model/virtual-host";
import {LoadBalancerType} from "./load_balancer/load-balancer-type";
import {GatewayHostService} from "./service/gateway-host-service";
import {ProxyService} from "./service/proxy-service";
import {TimeUnit} from "pluto-http-client";

const upstreamHost1 = new UpstreamHost('talos.sh', 443, true, true, false, false);
const virtualHost = new VirtualHost('talos.sh', 'test', LoadBalancerType.RoundRobin, [upstreamHost1]);

const gatewayHostService = new GatewayHostService();
gatewayHostService.addGatewayHost(virtualHost);

const proxyService = new ProxyService(gatewayHostService);

/*proxyService.http2Proxy(8888, {
    key: fs.readFileSync('ssl/key3.pem'),
    cert: fs.readFileSync('ssl/cert3.pem'),
    rejectUnauthorized: false,
});*/

proxyService.httpProxy(8888, {requestTimeout: 30 * TimeUnit.Minutes});

proxyService.serve();
