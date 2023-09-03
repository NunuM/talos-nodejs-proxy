import {ResponseStats} from "../model/response-stats";
import {Gateway} from "../model/gateway";

/**
 * @interface
 */
export interface Repository {

    /**
     *
     */
    connect(): Promise<void>;

    /**
     *
     * @param domain
     */
    getGatewayById(domain: string): Promise<Gateway | undefined>;

    /**
     * @abstract
     * @param {string} domain
     * @return boolean
     */
    existsGateway(domain: string): Promise<boolean>;

    /**
     * @abstract
     * @param {Gateway} gateway
     * @return boolean
     */
    saveGateway(gateway: Gateway): Promise<boolean>;

    /**
     * @abstract
     * @param {Gateway} gateway
     */
    removeGateway(gateway: Gateway): Promise<boolean>;

    /**
     * @abstract
     * @return {Promise<Array<Gateway>>}
     */
    loadGateways(): Promise<Gateway[]>;

    /**
     * @abstract
     * @param {ResponseStats} record
     */
    saveResponseStatus(record: ResponseStats): Promise<boolean>;

    /**
     * @abstract
     * @return {Promise<Array<string>>}
     */
    loadStats(): Promise<{ [key: string]: number | string }>
}
