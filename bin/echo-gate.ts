#!/usr/bin/env node

import cluster from 'cluster';
import {Config} from "../src/app/config";
import commandLineArgs from 'command-line-args';
import commandLineUsage from "command-line-usage";
import {ProxyStarterService} from "../src/service/proxy-starter-service";

if (cluster.isPrimary) {

    const optionDefinitions = [
        {
            name: 'help',
            alias: 'h',
            type: Boolean,
            description: 'Display this usage guide.'
        },
        {
            name: 'verbose',
            alias: 'v',
            type: Boolean,
            defaultValue: false
        }
    ]

    const options = commandLineArgs(optionDefinitions);

    if (options.help) {
        const usage = commandLineUsage([
            {
                header: 'EchoGate',
                content: 'Proxy starter.'
            },
            {
                header: 'Options',
                optionList: optionDefinitions
            },
            {
                content: 'EchoGate home: {underline https://github.com/NunuM/talos-nodejs-proxy}'
            }
        ])
        console.log(usage);
        process.exit(0);
    }


    console.log(`
  _____     _             ____                      
 |_   _|_ _| | ___  ___  |  _ \\ _ __ _____  ___   _ 
   | |/ _\` | |/ _ \\/ __| | |_) | '__/ _ \\ \\/ / | | |
   | | (_| | | (_) \\__ \\ |  __/| | | (_) >  <| |_| |
   |_|\\__,_|_|\\___/|___/ |_|   |_|  \\___/_/\\_\\\\__, |
                                              |___/ 
   v${Config.version()}                                              
`);
}

ProxyStarterService.start();
