import { NodeGamepad } from '../..';
import * as config from './dualshock4.json';
import { IConfig } from '../../IConfig';

export class RumblingDualshock4 extends NodeGamepad {
    private timeout?: ReturnType<typeof setTimeout>;

    constructor(customConfig?: IConfig) {
        if (customConfig) {
            super(customConfig);
        } else {
            super(config);
        }
    }

    public rumble(duration: number) {
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
