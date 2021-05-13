import * as config from './controllers/logitech/gamepadf310.json';

import { ILogger, NodeGamepad } from '.';

const logger: ILogger = {
    info(toLog: string) {
        console.log(toLog);
    },
    debug(toLog: string) {
        console.log(toLog);
    },
};

const gamepad = new NodeGamepad(config, logger);
gamepad.start();

gamepad.on('dpadUp:press', () => console.log('dpadUp:true'));
gamepad.on('dpadUp:release', () => console.log('dpadUp:false'));
