/** node imports */
import util from "util";
import path from 'path';

/** package imports */
import log4js from 'log4js';

/** project imports */
import {Config} from '../app/config';
import http from "http";


log4js.addLayout('email', function (config) {
    return function (logEvent) {
        let emailTemplate;

        if ((emailTemplate = Config.emailHtmlTemplate())) {

            const date = logEvent.startTime.toISOString().match(/([^T]+)T([^\.]+)/);

            if (!date) {
                return;
            }

            const context = Object.entries(logEvent.context).reduce(function (acc, [k, v]) {
                acc += `<tr><td>${k}</td><td>${v}</td></tr>`;
                return acc;
            }, "");

            const data = util.format(...logEvent.data)
                .replace("\n", "<br/>");

            return emailTemplate.replace(":date", `${date[1]} ${date[2]}`)
                .replace(":vars", `${context}`)
                .replace(":data", `${data}`);
        }

        return JSON.stringify(logEvent) + config.separator;
    }
});

log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: Config.loggingFormat(),
            }
        },
        file: {
            type: 'file',
            filename: path.join(Config.accessLogLoggerDirectory(), 'access.log'),
            layout: {
                type: 'pattern',
                pattern: '%m'
            }
        },
        email: {
            type: '@log4js-node/smtp',
            SMTP: {
                "host": Config.email().smtp,
                "port": 25
            },
            recipients: Config.email().recipients,
            subject: Config.email().subject,
            sender: 'proxy@talos.sh',
            layout: {type: 'email'},
            html: true
        },
        'just-errors': {type: 'logLevelFilter', appender: 'email', level: 'error'}
    },
    categories: {
        proxy: {appenders: ['file'], level: Config.loggingLevel()},
        default: {appenders: ['console', 'just-errors'], level: Config.loggingLevel()}
    }
});

/**
 * @readonly
 * @type {Logger}
 */
export const LOGGER = log4js.getLogger();

/**
 * @readonly
 * @type {Logger}
 */
export const ACCESS_LOG = log4js.getLogger('proxy');

export const handler = log4js.connectLogger(ACCESS_LOG, {
    level: 'auto',
    format: (req, res, format) => format(Config.logAccessFormat())
});
