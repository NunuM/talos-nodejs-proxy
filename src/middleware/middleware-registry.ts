import {AccessLoggingMiddleware} from "./access-logging-middleware";
import {EncodingMiddleware} from "./encoding-middleware";
import {ForwardedHeaderMiddleware} from "./forwarded-header-middleware";
import {GatewayInMaintenanceMiddleware} from "./gateway-in-maintenance-middleware";
import {CorrelationIdMiddleware} from "./correlation-id-middleware";
import {GatewayStatsCollectorMiddlewareFactory} from "./factory/gateway-stats-collector-middleware-factory";

export enum MiddlewareRegistry {
    AccessLogging,
    ContentEncoding,
    ForwardHeaders,
    GatewayInMaintenance,
    GatewayStatsCollector,
    CorrelationId
}

export const MiddlewareFactory = {
    [MiddlewareRegistry.AccessLogging]: () => new AccessLoggingMiddleware(),
    [MiddlewareRegistry.ContentEncoding]: () => new EncodingMiddleware(),
    [MiddlewareRegistry.ForwardHeaders]: () => new ForwardedHeaderMiddleware(),
    [MiddlewareRegistry.GatewayInMaintenance]: () => new GatewayInMaintenanceMiddleware(),
    [MiddlewareRegistry.GatewayStatsCollector]: (domain: string) => {
        return new GatewayStatsCollectorMiddlewareFactory(domain);
    },
    [MiddlewareRegistry.CorrelationId]: () => new CorrelationIdMiddleware(),
}


export const MiddlewareList = [
    {id: MiddlewareRegistry.AccessLogging, name: 'AccessLoggingMiddleware'},
    {id: MiddlewareRegistry.ContentEncoding, name: 'EncodingMiddleware'},
    {id: MiddlewareRegistry.ForwardHeaders, name: 'ForwardedHeaderMiddleware'},
    {id: MiddlewareRegistry.GatewayInMaintenance, name: 'GatewayInMaintenanceMiddleware'},
    {id: MiddlewareRegistry.ContentEncoding, name: 'CorrelationIdMiddleware'},
]
