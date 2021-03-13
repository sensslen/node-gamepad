import { ILogger, NodeGamepad } from '.';
import * as config from './controllers/logitech/gamepadf310.json';

let logger: ILogger = {
    Info(toLog: string) {
        console.log(toLog);
    },
    Debug(toLog: string) {
        console.log(toLog);
    },
    DebugLowLevel(toLog: string) {
        console.log(toLog);
    },
};

let gamepad = new NodeGamepad(config, logger);
gamepad.start();

gamepad.on('dpadUp:press', () => console.log(`dpadUp:true`));
gamepad.on('dpadUp:release', () => console.log(`dpadUp:false`));
