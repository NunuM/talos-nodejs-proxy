import {AccessLoggingMiddleware} from "./access-logging-middleware";
import {EncodingMiddleware} from "./encoding-middleware";
import {ForwardedHeaderMiddleware} from "./forwarded-header-middleware";
import {GatewayInMaintenanceMiddleware} from "./gateway-in-maintenance-middleware";
import {CorrelationIdMiddleware} from "./correlation-id-middleware";
import {GatewayStatsCollectorMiddlewareFactory} from "./factory/gateway-stats-collector-middleware-factory";
import {Middleware} from "./middleware";
import {RedirectMiddleware} from "./redirect-middleware";
import {EncodingMiddlewareFactory} from "./factory/encoding-middleware-factory";
import {SpamFilter} from "./spam-filter";

export enum MiddlewareRegistry {
    AccessLogging = 'AccessLoggingMiddleware',
    ContentEncoding = 'EncodingMiddleware',
    ForwardHeaders = 'ForwardedHeaderMiddleware',
    GatewayInMaintenance = 'GatewayInMaintenanceMiddleware',
    GatewayStatsCollector = 'GatewayStatsCollectorMiddleware',
    CorrelationId = 'CorrelationIdMiddleware',
    Redirect = 'RedirectMiddleware',
    SpamFilter = 'SpamFilter'
}

export class MiddlewareFactory {

    static build(domain: string, deserialized: { type: MiddlewareRegistry, args: { [key: string]: any } }): Middleware {
        switch (deserialized.type) {
            case MiddlewareRegistry.AccessLogging:
                return new AccessLoggingMiddleware();
            case MiddlewareRegistry.ContentEncoding:
                return new EncodingMiddlewareFactory();
            case MiddlewareRegistry.ForwardHeaders:
                return new ForwardedHeaderMiddleware();
            case MiddlewareRegistry.GatewayInMaintenance:
                return new GatewayInMaintenanceMiddleware(deserialized.args.statusCode);
            case MiddlewareRegistry.GatewayStatsCollector:
                //@ts-ignore
                return new GatewayStatsCollectorMiddlewareFactory(Object.assign(deserialized.args, {domain}));
            case MiddlewareRegistry.CorrelationId:
                return new CorrelationIdMiddleware();
            case MiddlewareRegistry.SpamFilter:
                //@ts-ignore
                return new SpamFilter(Object.assign(deserialized.args, {domain}));
            case MiddlewareRegistry.Redirect:
                //@ts-ignore
                return new RedirectMiddleware(deserialized.args);
        }
    }
}

export const MiddlewareList = [
    {id: MiddlewareRegistry.AccessLogging, name: 'AccessLoggingMiddleware', args: {}},
    {id: MiddlewareRegistry.ContentEncoding, name: 'EncodingMiddleware', args: {}},
    {id: MiddlewareRegistry.ForwardHeaders, name: 'ForwardedHeaderMiddleware', args: {}},
    {
        id: MiddlewareRegistry.GatewayInMaintenance,
        name: 'GatewayInMaintenanceMiddleware',
        args: GatewayInMaintenanceMiddleware.args()
    },
    {id: MiddlewareRegistry.CorrelationId, name: 'CorrelationIdMiddleware', args: {}},
    {id: MiddlewareRegistry.GatewayStatsCollector, name: 'GatewayStatsCollectorMiddleware', args: {}},
    {id: MiddlewareRegistry.Redirect, name: 'RedirectMiddleware', args: RedirectMiddleware.args()},
    {id: MiddlewareRegistry.SpamFilter, name: 'SpamFilter', args: SpamFilter.args()}
]
