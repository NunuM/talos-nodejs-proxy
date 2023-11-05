/** node imports */
import http from "http";
import https from "https";
import * as http2 from "http2";
import {Validator} from 'jsonschema'
import appConfigurationSchema from './scema/app-config.schema.json';
import path from 'path';
import fs from "fs";
import {MiddlewareRegistry} from "../middleware/middleware-registry";
import {Header, HttpHeaders} from "pluto-http-client";
import util from "util";
import {Buffer} from "buffer";

interface Proxy {
    globalMiddlewares: Array<{ type: MiddlewareRegistry, args: { [key: string]: any } }>,
    servers: Server[];
}

interface Server {
    port: number;
    protocol: 'http' | 'https' | 'http2',
    options: http.ServerOptions | https.ServerOptions | http2.SecureServerOptions
}

interface EmailAlarmistic {
    smtpServer: string;
    smtpPort: number;
    senderEmail: string;
    subject: string;
    recipients: string[];
    errorEmailTemplateFile: string
}

interface MemoryRepository {
    type: 'memory'
}

interface FileRepository {
    type: 'file',
    filePath: string;
}

interface RedisRepository {
    type: 'redis',
    redisConnectionString: string;
}

enum LogLevel {
    Off = "off",
    Fatal = "fatal",
    Error = "error",
    Warn = " warn",
    Info = " info",
    Debug = "debug",
    Trace = "trace",
    All = "all",
}

interface Logging {
    proxy: { level: LogLevel },
    accessLog: { level: LogLevel, logDirectory: string, format: string },
    admin: { level: LogLevel },
    worker: { level: LogLevel }
}

interface AdminAPINoAuth {
    type: 'none';
}

interface AdminAPIBasisAuth {
    type: 'basic';
    username: string;
    password: string;
}

interface AdminAPI {
    port: number;
    bindOnlyLocalhost: boolean;
    authenticator: AdminAPINoAuth | AdminAPIBasisAuth
}

interface ConfigDefinition {
    appId: string;
    numberOfWorkers?: number;
    proxy: Proxy;
    administration: AdminAPI,
    repository: MemoryRepository | FileRepository | RedisRepository;
    alarmist?: EmailAlarmistic;
    logging: Logging
}

let config: ConfigDefinition;

try {

    config = require(process.env.TLP_CONF_FILE || path.join(__dirname, '..', '..', 'config'));

    const validator = new Validator();
    //@ts-ignore
    const validatorResult = validator.validate(config, appConfigurationSchema);

    if (!validatorResult.valid) {
        console.error("Invalid configuration:", validatorResult.toString());
        process.exit(1);
    }

    if (config.alarmist?.errorEmailTemplateFile) {
        config.alarmist.errorEmailTemplateFile = fs.readFileSync(config.alarmist.errorEmailTemplateFile, {encoding: 'utf8'});
    }

} catch (e) {
    console.error("Error reading application configurations:", e);
    process.exit(1);
}


/**
 * @class
 */
export class Config {

    /**
     * Proxy version
     */
    static version(): string {
        return '1.0.0';
    }

    /**
     * App ID
     */
    static appId(): string {
        return config.appId;
    }

    /**
     * Workers
     */
    static numberOfWorkers(): number {
        return config.numberOfWorkers || 0;
    }

    /**
     * Proxy configuration
     */
    static proxyConfigs(): Proxy {
        return config.proxy;
    }

    /**
     * Proxy server admin port
     */
    static administration(): AdminAPI {
        return config.administration;
    }

    static adminAPIHeader(): Header {
        if(config.administration.authenticator.type === 'none') {
            return new Header(HttpHeaders.AUTHORIZATION, "none");
        } else if(config.administration.authenticator.type === 'basic') {

            const basicAuth = Buffer.from(
                util.format("%s:%s",
                    config.administration.authenticator.username,
                    config.administration.authenticator.password)
            ).toString('base64');

            return new Header(HttpHeaders.AUTHORIZATION, util.format("Basic %s", basicAuth));
        }
        return new Header(HttpHeaders.AUTHORIZATION, "none");
    }

    /**
     * Repository to be used as persistence layer
     */
    static repository(): MemoryRepository | FileRepository | RedisRepository {
        return config.repository;
    }

    /**
     * Log level
     */
    static logging(): Logging {
        return config.logging;
    }

    /**
     * Email connection settings
     */
    static alarmistic(): EmailAlarmistic | undefined {
        return config?.alarmist;
    }
}

