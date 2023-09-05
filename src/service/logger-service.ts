/** node imports */
import util from "util";
import path from 'path';

/** package imports */
import log4js from 'log4js';

/** project imports */
import {Config} from '../app/config';

let emailLogConfig = {
    type: 'console'
};
const alarmistic = Config.alarmistic();
const logging = Config.logging();

if (alarmistic) {

    log4js.addLayout('email', function (config) {
        return function (logEvent) {
            let emailTemplate;

            if ((emailTemplate = alarmistic.errorEmailTemplateFile)) {

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

    emailLogConfig = {
        type: '@log4js-node/smtp',
        //@ts-ignore
        SMTP: {
            host: alarmistic.smtpServer,
            port: alarmistic.smtpPort
        },
        recipients: alarmistic.recipients.join(','),
        subject: alarmistic.subject,
        sender: alarmistic.senderEmail,
        layout: {type: 'email'},
        html: true
    };
}

log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[[%d]%] %[[%p]%] %[[%c]%] - %m'
            }
        },
        worker: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%[[%d]%] %[[%p]%] %[[%c]%] [worker:%X{workerId}] - %m'
            }
        },
        file: {
            type: 'file',
            filename: path.join(logging.accessLog.logDirectory, 'access.log'),
            layout: {
                type: 'pattern',
                pattern: '%m'
            }
        },
        email: emailLogConfig,
        'just-errors': {type: 'logLevelFilter', appender: 'email', level: alarmistic ? 'error' : 'off'}
    },
    categories: {
        proxy: {appenders: ['console', 'just-errors'], level: logging.proxy.level},
        accessLog: {appenders: ['file', 'just-errors'], level: logging.accessLog.level},
        admin: {appenders: ['console', 'just-errors'], level: logging.admin.level},
        worker: {appenders: ['worker', 'just-errors'], level: logging.worker.level},
        default: {appenders: ['console', 'just-errors'], level: logging.proxy.level}
    }
});

/**
 * @readonly
 * @type {Logger}
 */
export const LOGGER = log4js.getLogger('proxy');

/**
 * @readonly
 * @type {Logger}
 */
export const ADMIN_LOGGER = log4js.getLogger('admin');

/**
 * @readonly
 * @type {Logger}
 */
export const WORKER_LOGGER = log4js.getLogger('worker');

/**
 * @readonly
 * @type {Logger}
 */
export const ACCESS_LOG = log4js.getLogger('accessLog');

export const handler = log4js.connectLogger(ACCESS_LOG, {
    level: 'auto',
    format: (req, res, format) => format(logging.accessLog.format)
});
