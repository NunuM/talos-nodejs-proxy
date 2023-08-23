/** node imports */
import http from "http";
import https from "https";
import * as http2 from "http2";

const fs = require('fs');
const path = require('path');

interface ConfigDefinition {

    withHttp?: boolean,
    serverHttpPort?: number,
    serverHttpOptions?: http.ServerOptions,

    withHttps?: boolean,
    serverHttpsPort?: number,
    serverHttpsOptions?: https.ServerOptions,

    withHttp2?: boolean,
    serverHttp2Port?: number,
    serverHttp2Options?: http2.SecureServerOptions,

    serverAdminUIPort?: number,
    serverAdminPassword?: string,

    repository?: "memory" | "redis",
    redisConnectionString?: string,

    smtpServer?: string,
    errorEmailRecipients?: string,
    errorEmailTemplateFile?: string,

    logDirectory?: string,
    logLevel?: string,

    logAccessFormat?: string
    loggingFormat?: string
}

/** package imports */
let config: ConfigDefinition = {};

try {
    config = require(process.env.TLP_CONF_FILE || path.join(__dirname, '..', '..', 'config'));
} catch (e) {
    console.error("Cannot read config file", e);
}

/*********************
 *  APP settings
 *
 */
const WITH_HTTP = process.env.TLP_WITH_HTTP || config.withHttp || false;

const SERVER_HTTP_PORT = process.env.TLP_SERVER_HTTP_PORT || config.serverHttpPort || 8000;

const SERVER_HTTP_OPTIONS = config.serverHttpOptions || {};


const WITH_HTTPS = process.env.TLP_WITH_HTTPS || config.withHttps || false;

const SERVER_HTTPS_PORT = process.env.TLP_SERVER_HTTPS_PORT || config.serverHttpsPort || 8081;

const SERVER_HTTPS_OPTIONS = config.serverHttpsOptions || {};


const WITH_HTTP2 = process.env.TLP_SERVER_HTTP2_PORT || config.serverHttp2Port || 8082;

const SERVER_HTTP2_PORT = process.env.TLP_SERVER_HTTPS_PORT || config.serverHttp2Port || 8081;

const SERVER_HTTP2_OPTIONS = config.serverHttp2Options || {};


const SERVER_ADMIN_PORT = process.env.TLP_SERVER_ADMIN_PORT || config.serverAdminUIPort || 7777;

const SERVER_ADMIN_PASSWORD = process.env.TLP_SERVER_ADMIN_PASSWORD || config.serverAdminPassword || 'cm9vdDpyb290';

const APP_REPOSITORY = process.env.TLP_APP_REPOSITORY || config.repository || 'memory';

const REDIS_CONNECTION_STRING = process.env.TLP_REDIS_CONNECTION_STRING || config.redisConnectionString || '';


/*********************
 *  Email settings
 *
 */
const SMTP_SERVER = process.env.TLP_SMTP_SERVER || config.smtpServer || '';

const ERROR_EMAIL_RECIPIENTS = process.env.TLP_ERROR_EMAIL_RECIPIENTS || config.errorEmailRecipients || '';

let ERROR_EMAIL_TEMPLATE: string | null;

try {
    ERROR_EMAIL_TEMPLATE = fs.readFileSync(process.env.ERROR_EMAIL_TEMPLATE || config.errorEmailTemplateFile).toString();
} catch (e) {
    ERROR_EMAIL_TEMPLATE = null;
}


/*********************
 *  Log settings
 *
 */
const LOG_DIRECTORY = process.env.TLP_LOG_DIRECTORY || config.logDirectory || path.join(__dirname, '..', '..');

const LOG_LEVEL = process.env.TLP_LOG_LEVEL || config.logLevel || 'info';

const LOG_ACCESS_FORMAT = process.env.TLP_LOG_ACCESS_FORMAT || config.logAccessFormat || ':remote-addr - ":method :url HTTP/:http-version" :status :content-length ":referrer" ":user-agent" :response-time';

const LOG_FORMAT = process.env.TLP_LOG_FORMAT || config.loggingFormat || '%[[%d]%] %[[%p]%] %[[%c]%] - %m';

/**
 * @class
 */
export class Config {

    /**
     * Redis connect string
     * @link {https://www.iana.org/assignments/uri-schemes/prov/redis}
     * @return {string}
     */
    static redisConnectionString(): string {
        return REDIS_CONNECTION_STRING;
    }

    /**
     * Start server for HTTP
     *
     * @return {boolean}
     */
    static withHttp() {
        return !!(WITH_HTTP);
    }

    /**
     * Proxy server port
     *
     * @return {number}
     */
    static httpServerPort() {
        return Number(SERVER_HTTP_PORT);
    }

    /**
     * Server options
     */
    static httpServerOptions(): http.ServerOptions {
        return SERVER_HTTP_OPTIONS;
    }

    /**
     * Start server for HTTPS
     *
     * @return {boolean}
     */
    static withHttps() {
        return !!WITH_HTTPS
    }

    /**
     * HTTPS port
     *
     * @return {number}
     */
    static httpsServerPort() {
        return Number(SERVER_HTTPS_PORT);
    }

    /**
     * Server options
     */
    static httpsServerOptions(): https.ServerOptions {

        SERVER_HTTPS_OPTIONS.key = fs.readFileSync(SERVER_HTTPS_OPTIONS.key);
        SERVER_HTTPS_OPTIONS.cert = fs.readFileSync(SERVER_HTTPS_OPTIONS.cert);

        return SERVER_HTTPS_OPTIONS;
    }


    /**
     * Start sever for HTTP2
     * @return {boolean}
     */
    static withHttp2() {
        return !!WITH_HTTP2;
    }

    /**
     * HTTP2 port
     *
     * @return {number}
     */
    static http2ServerPort() {
        return Number(SERVER_HTTP2_PORT);
    }

    /**
     * Server options
     */
    static http2ServerOptions(): http2.SecureServerOptions {

        SERVER_HTTP2_OPTIONS.key = fs.readFileSync(SERVER_HTTP2_OPTIONS.key);
        SERVER_HTTP2_OPTIONS.cert = fs.readFileSync(SERVER_HTTP2_OPTIONS.cert);

        return SERVER_HTTP2_OPTIONS;
    }

    /**
     * Proxy server admin port
     *
     * @return {number}
     */
    static serverAdminUIPort() {
        return SERVER_ADMIN_PORT;
    }

    /**
     * Repository to be used as persistence layer
     *
     * @return {string}
     */
    static repository() {
        return APP_REPOSITORY;
    }

    /**
     * Password in base64
     * @return {string}
     */
    static serverAdminPassword() {
        return SERVER_ADMIN_PASSWORD;
    }

    /**
     * Directory for access log
     * @return {string}
     */
    static accessLogLoggerDirectory() {
        return LOG_DIRECTORY
    }

    /**
     * Log level
     *
     * @return {string}
     */
    static loggingLevel() {
        return LOG_LEVEL;
    }

    /**
     * Access log format
     *
     * @return {string}
     */
    static logAccessFormat() {
        return LOG_ACCESS_FORMAT;
    }

    /**
     * Log format
     *
     * @return {string}
     */
    static loggingFormat() {
        return LOG_FORMAT;
    }

    /**
     * Email connection settings
     *
     * @return {{smtp: string | string, recipients: string[], subject: string}}
     */
    static email() {
        return {
            smtp: SMTP_SERVER,
            recipients: ERROR_EMAIL_RECIPIENTS.split(','),
            subject: ' Proxy - Error Log',
        }
    }

    /**
     *
     * @return {string|null}
     */
    static emailHtmlTemplate() {
        return ERROR_EMAIL_TEMPLATE;
    }
}

