import { ILogger, NodeGamepad } from '.';
import * as config from './controllers/logitech/chillStream.json';

let logger: ILogger = {
    Log(toLog: string) {
        console.log(toLog);
    },
};

let gamepad = new NodeGamepad(config, logger);
gamepad.start(true);
