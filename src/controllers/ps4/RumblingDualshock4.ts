import { ILogger } from '../../ILogger';
import { NodeGamepad } from '../../NodeGamepad';
import * as config from './dualshock4.json';
import { IConfig } from '../../IConfig';

export interface IRumblingDualshock4ConstructorParameters {
    config?: IConfig;
    logger?: ILogger;
}

export class RumblingDualshock4 extends NodeGamepad {
    private timeout?: ReturnType<typeof setTimeout>;

    constructor(params: IRumblingDualshock4ConstructorParameters) {
        super(params.config ? params.config : config, params.logger);
    }

    public rumble(duration: number): void {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        this.timeout = setTimeout(() => this.rumbleTimeout(), duration);

        this.setRumble(true);
    }

    private rumbleTimeout() {
        this.setRumble(false);
        this.timeout = undefined;
    }

    private setRumble(enable: boolean) {
        if (this._usb) {
            const rumbleNumber = enable ? 1 : 0;
            const rumbleData = [5, 255, 4, rumbleNumber, rumbleNumber, 0, 0, 0, 0, 0, 0];
            this._usb.write(rumbleData);
        }
    }
}
