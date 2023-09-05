import {InMemoryRepository} from "../src/repository/in-memory-repository";
import {Repository} from "../src/repository/repository";
import {UpstreamHost} from "../src/model/upstream-host";
import {VirtualHost} from "../src/model/virtual-host";
import {LoadBalancerType} from "../src/load_balancer/load-balancer-type";
import {ApiGateway} from "../src/model/api-gateway";

describe('Test Repositories', () => {

    test('test in memory repository', async () => {

        const inMemoryRepository: Repository = new InMemoryRepository();

        let gateways = await inMemoryRepository.loadGateways();
        const stats = await inMemoryRepository.loadStats();

        expect(gateways.length).toBe(0);
        expect(Object.keys(stats).length).toBe(0);

        const upstreamHost1 = new UpstreamHost('localhost', 9990, true);
        const upstreamHost2 = new UpstreamHost('localhost', 9991, true);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1, upstreamHost2]);

        const savedVH = await inMemoryRepository.saveGateway(virtualHost);

        expect(savedVH).toBe(true);

        const apiGateway = new ApiGateway('test.net', 'api gateway test', LoadBalancerType.FirstFree, new Map<string, UpstreamHost[]>([
            ['/api/[0-5]{1}/*', [upstreamHost1]],
            ['*', [upstreamHost2]]
        ]));

        const savedApiGateway = await inMemoryRepository.saveGateway(apiGateway);

        expect(savedApiGateway).toBe(true);

        gateways = await inMemoryRepository.loadGateways();
        expect(gateways.length).toBe(2);

        const removedVH = await inMemoryRepository.removeGateway(virtualHost);

        expect(removedVH).toBe(true);

        gateways = await inMemoryRepository.loadGateways();
        expect(gateways.length).toBe(1);

    });




});
