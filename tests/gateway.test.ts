import {VirtualHost} from "../src/model/virtual-host";
import {LoadBalancerType} from "../src/load_balancer/load-balancer-type";
import {UpstreamHost} from "../src/model/upstream-host";
import {Gateway} from "../src/model/gateway";
import {ApiGateway} from "../src/model/api-gateway";


describe('Test gateways types', () => {


    test('Test virtual host', () => {

        const upstreamHost1 = new UpstreamHost('localhost', 9990, true);
        const upstreamHost2 = new UpstreamHost('localhost', 9991, true);

        const virtualHost = new VirtualHost('test.com', 'test', LoadBalancerType.RoundRobin, [upstreamHost1, upstreamHost2]);

        expect(virtualHost.name).toBe('test');
        expect(virtualHost.domain).toBe('test.com');
        expect(virtualHost.id()).toBe('test.com');
        expect(virtualHost.isRegexBased).toBe(false);
        expect(virtualHost.lb.type).toBe(LoadBalancerType.RoundRobin);

        virtualHost.name = 'TheTest';

        expect(virtualHost.name).toBe('TheTest');

        expect(virtualHost.upstreamHosts.length).toBe(2);

        expect(virtualHost.upstreamHosts.includes(upstreamHost1)).toBe(true);
        expect(virtualHost.upstreamHosts.includes(upstreamHost2)).toBe(true);


        expect(virtualHost.nextUpstream()).toBe(upstreamHost1);
        expect(virtualHost.nextUpstream()).toBe(upstreamHost2);
        expect(virtualHost.nextUpstream()).toBe(upstreamHost1);
        expect(virtualHost.nextUpstream()).toBe(upstreamHost2);


        const regexVirtualHost = new VirtualHost('*.test.com', 'testr', LoadBalancerType.FirstFree, [upstreamHost1, upstreamHost2]);

        expect(regexVirtualHost.name).toBe('testr');
        expect(regexVirtualHost.domain).toBe('*.test.com');
        expect(regexVirtualHost.id()).toBe('*.test.com');
        expect(regexVirtualHost.isRegexBased).toBe(true);
        expect(regexVirtualHost.lb.type).toBe(LoadBalancerType.FirstFree);

        expect(regexVirtualHost.match('proxy.test.com')).toBe(true);
        expect(regexVirtualHost.match('proxy.proxy.com')).toBe(false);

        expect(regexVirtualHost.nextUpstream()).toBe(upstreamHost1);
        expect(regexVirtualHost.nextUpstream()).toBe(upstreamHost1);
        expect(regexVirtualHost.nextUpstream()).toBe(upstreamHost1);
        expect(regexVirtualHost.nextUpstream()).toBe(upstreamHost1);

        const clonedVirtualHost: Gateway = regexVirtualHost.clone('proxy.test.com');

        expect(clonedVirtualHost instanceof VirtualHost).toBe(true);
        if (clonedVirtualHost instanceof VirtualHost) {
            expect(clonedVirtualHost.name).toBe('testr');
            expect(clonedVirtualHost.domain).toBe('proxy.test.com');
            expect(clonedVirtualHost.id()).toBe('proxy.test.com');
            expect(clonedVirtualHost.isRegexBased).toBe(false);
            expect(clonedVirtualHost.lb.type).toBe(LoadBalancerType.FirstFree);


            upstreamHost1.isOnline = false;

            expect(clonedVirtualHost.nextUpstream()).toBe(upstreamHost2);

            upstreamHost2.isOnline = false;

            expect(clonedVirtualHost.nextUpstream()).toBe(undefined);
        }
    });

    test('Test API Gateway', async () => {

        const upstreamHost1 = new UpstreamHost('localhost', 9991, true);
        const upstreamHost2 = new UpstreamHost('localhost', 9992, true);
        const upstreamHost3 = new UpstreamHost('localhost', 9993, true);

        const apiGateway = new ApiGateway('test.com', 'api gateway test', LoadBalancerType.FirstFree, new Map<string, UpstreamHost[]>([
            ['/api/[0-5]{1}/*', [upstreamHost1]],
            ['/api/[6-9]{1}/*', [upstreamHost3]],
            ['*', [upstreamHost2]]
        ]));

        expect(apiGateway.domain).toBe('test.com');
        expect(apiGateway.name).toBe('api gateway test');
        expect(apiGateway.isRegexBased).toBe(false);

        //@ts-ignore
        const resolvedHostForSlash = await apiGateway.resolveUpstream({path: '/'});

        expect(resolvedHostForSlash).toBe(upstreamHost2);

        //@ts-ignore
        const resolvedHostForApi = await apiGateway.resolveUpstream({path: '/api/v1/users'});

        expect(resolvedHostForApi).toBe(upstreamHost2);

        //@ts-ignore
        const resolvedHostForApiV0 = await apiGateway.resolveUpstream({path: '/api/0/users'});

        expect(resolvedHostForApiV0).toBe(upstreamHost1);

        //@ts-ignore
        const resolvedHostForApiV6 = await apiGateway.resolveUpstream({path: '/api/6/users'});
        expect(resolvedHostForApiV6).toBe(upstreamHost3);

        const regexApiGateway = new ApiGateway('*.test.com', 'regex domain api gateway test', LoadBalancerType.FirstFree, new Map<string, UpstreamHost[]>([
            ['/login', []],
            ['/docs*', [upstreamHost1]],
            ['/api*', [upstreamHost3]],
            ['*', [upstreamHost2]]
        ]));

        expect(regexApiGateway.domain).toBe('*.test.com');
        expect(regexApiGateway.name).toBe('regex domain api gateway test');
        expect(regexApiGateway.isRegexBased).toBe(true);

        expect(regexApiGateway.match('proxy.test.com')).toBe(true);
        expect(regexApiGateway.match('proxy.test.net')).toBe(false);

        //@ts-ignore
        const resolvedHostForSlash1 = await regexApiGateway.resolveUpstream({path: '/'});

        expect(resolvedHostForSlash1).toBe(upstreamHost2);

        //@ts-ignore
        const resolvedHostForApi1 = await regexApiGateway.resolveUpstream({path: '/api/v1/users'});

        expect(resolvedHostForApi1).toBe(upstreamHost3);

        //@ts-ignore
        const resolvedHostForDocs = await regexApiGateway.resolveUpstream({path: '/docsas/y7h?i=0'});

        expect(resolvedHostForDocs).toBe(upstreamHost1);

        const clonedRegexApiGateway = regexApiGateway.clone('proxy.test.com');

        expect(clonedRegexApiGateway instanceof ApiGateway).toBe(true);

        if (clonedRegexApiGateway instanceof ApiGateway) {
            expect(clonedRegexApiGateway.domain).toBe('proxy.test.com');
            expect(clonedRegexApiGateway.name).toBe('regex domain api gateway test');
            expect(clonedRegexApiGateway.isRegexBased).toBe(false);
        }


        const mixedApiGateway = new ApiGateway('test.com', 'api gateway test', LoadBalancerType.FirstFree, new Map<string, UpstreamHost[]>([
            ['/login', [upstreamHost1]],
            ['/api/[6-9]{1}/*', [upstreamHost2]]
        ]));

        //@ts-ignore
        const resolvedHostForSlash2 = await mixedApiGateway.resolveUpstream({path: '/'});

        expect(resolvedHostForSlash2).toBe(undefined);

        //@ts-ignore
        const resolvedHostForLoginRoute = await mixedApiGateway.resolveUpstream({path: '/login'});

        expect(resolvedHostForLoginRoute).toBe(upstreamHost1);
    });

    test('Test API Getaway (de)serialization', () => {

        const upstreamHost1 = new UpstreamHost('localhost', 9991, true);
        const upstreamHost2 = new UpstreamHost('localhost', 9992, true);
        const upstreamHost3 = new UpstreamHost('localhost', 9993, true);

        const apiGateway = new ApiGateway('test.xp', 'api gateway test', LoadBalancerType.FirstFree, new Map<string, UpstreamHost[]>([
            ['/api/[0-5]{1}/*', [upstreamHost1]],
            ['/api/[6-9]{1}/*', [upstreamHost3]],
            ['*', [upstreamHost2]]
        ]));

        expect(apiGateway.domain).toBe('test.xp');
        expect(apiGateway.name).toBe('api gateway test');
        expect(apiGateway.isRegexBased).toBe(false);


        const serialized = JSON.stringify(apiGateway.toJSON());

        expect(serialized).toBeDefined();

        const fromJSONString = ApiGateway.fromJSONString(serialized);

        expect(apiGateway).toStrictEqual(fromJSONString);
    });


    test('Test Virtual Host (de)serialization', () => {

        const upstreamHost1 = new UpstreamHost('localhost', 9990, true);
        const upstreamHost2 = new UpstreamHost('localhost', 9991, true);

        const virtualHost = new VirtualHost('test.pt', 'pt', LoadBalancerType.RoundRobin, [upstreamHost1, upstreamHost2]);

        expect(virtualHost.name).toBe('pt');
        expect(virtualHost.domain).toBe('test.pt');
        expect(virtualHost.id()).toBe('test.pt');
        expect(virtualHost.isRegexBased).toBe(false);
        expect(virtualHost.lb.type).toBe(LoadBalancerType.RoundRobin);

        expect(virtualHost.upstreamHosts.length).toBe(2);

        expect(virtualHost.upstreamHosts.includes(upstreamHost1)).toBe(true);
        expect(virtualHost.upstreamHosts.includes(upstreamHost2)).toBe(true);

        const serializedVH = JSON.stringify(virtualHost.toJSON());

        const virtualHost1 = VirtualHost.fromJSONString(serializedVH);

        expect(virtualHost1).toBeDefined();

        if (virtualHost1) {
            expect(virtualHost1.name).toBe('pt');
            expect(virtualHost1.domain).toBe('test.pt');
            expect(virtualHost1.id()).toBe('test.pt');
            expect(virtualHost1.isRegexBased).toBe(false);
            expect(virtualHost1.lb.type).toBe(LoadBalancerType.RoundRobin);

            expect(virtualHost1.upstreamHosts.length).toBe(2);

            expect(virtualHost1.upstreamHosts).toStrictEqual([upstreamHost1, upstreamHost2]);
        }
    });

})
