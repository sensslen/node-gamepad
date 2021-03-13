import { ILogger, NodeGamepad } from '.';
import * as config from './controllers/logitech/gamepadf310.json';

let logger: ILogger = {
    Log(toLog: string) {
        console.log(toLog);
    },
};

let gamepad = new NodeGamepad(config, logger);
gamepad.start(true);

gamepad.on('dpadUp:press', () => console.log(`dpadUp:true`));
gamepad.on('dpadUp:release', () => console.log(`dpadUp:false`));
