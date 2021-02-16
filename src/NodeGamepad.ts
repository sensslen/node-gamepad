import { EventEmitter } from 'events';
import { devices, HID } from 'node-hid';
import { startMonitoring, on, Device, stopMonitoring, find } from 'usb-detection';
import { IConfig } from './IConfig';
import { IDeviceSpec } from './IDeviceSpec';
import { ILogger } from './ILogger';
import { JoyStickValue } from './JoyStickValue';

export class NodeGamepad extends EventEmitter {
    protected _usb?: HID;
    private _joystickStates: { [key: string]: JoyStickValue } = {};
    private _buttonStates: { [key: string]: number } = {};
    private connectRetryTimeout?: ReturnType<typeof setTimeout>;

    constructor(private config: IConfig, private logger?: ILogger) {
        super();
    }

    public start(debug = false) {
        this.log(`Starting connection procedure to device:${JSON.stringify(this.toIDeviceSpec(this.config))}`);
        this.registerStopProgramStopEvent();

        startMonitoring();
        find(this.config.vendorID, this.config.productID)
            .then((devices) => {
                for (let device of devices) {
                    this.connectIfMatching(device, debug);
                }
            })
            .catch((error) => this.log(`usb device find error:${JSON.stringify(error)}`));

        on(`add:${this.config.vendorID}:${this.config.productID}`, (device) => this.connectIfMatching(device, debug));
        on(`remove:${this.config.vendorID}:${this.config.productID}`, (device) => {
            if (this.deviceIsMatch(device)) {
                this.stopConnectionRetry();
            }
        });
    }

    private logDebug(toLog: string, debug: boolean) {
        if (debug) {
            this.log(toLog);
        }
    }

    private log(toLog: string) {
        if (this.logger) {
            this.logger.Log(`NodeGamepad:${toLog}`);
        }
    }

    private stopConnectionRetry(): void {
        if (this.connectRetryTimeout) {
            clearTimeout(this.connectRetryTimeout);
            this.connectRetryTimeout = undefined;
        }
    }

    private registerStopProgramStopEvent() {
        process.on('SIGINT', () => this.stop());
        process.on('exit', () => this.stop());
    }

    public stop() {
        this.stopConnectionRetry();
        this.disconnect();
        stopMonitoring();
    }

    public rumble(_duration: number): void {
        // do nothing here intentionally. gamepads supporting rumbling do need to override this method
    }

    private connect(device: Device, debug: boolean): void {
        if (this._usb) {
            return;
        }
        this.log(`Device connected:${JSON.stringify(device)}`);
        let matchingDevices = devices(device.vendorId, device.productId);
        if (this.config.serialNumber) {
            matchingDevices = matchingDevices.filter((d) => d.serialNumber == device.serialNumber);
        }
        this.logDebug(`Available Devices sorted By Serial Number:${JSON.stringify(matchingDevices)}`, debug);
        if (matchingDevices.length < 1 || !matchingDevices[0].path) {
            this.log('Failed to connect. Checking again in 100 ms.');
            this.connectRetryTimeout = setTimeout(() => this.connect(device, debug), 100);
        } else {
            this.emit('connected');
            this.connectRetryTimeout = undefined;
            this._usb = new HID(matchingDevices[0].path);
            this._usb.on('data', (data: number[]) => this.onControllerFrame(data, debug));
            this._usb.on('error', (error) => {
                this.log(`Error occurred:${JSON.stringify(error)}`);
                this.disconnect();
            });
        }
    }

    private disconnect() {
        if (this._usb) {
            this.emit('disconnected');
            this._usb.close();
            this._usb = undefined;
        }
    }

    private toIDeviceSpec(spec: IDeviceSpec): IDeviceSpec {
        return {
            vendorID: spec.vendorID,
            productID: spec.productID,
            serialNumber: spec.serialNumber,
        };
    }

    private connectIfMatching(device: Device, debug: boolean): void {
        if (this.deviceIsMatch(device)) {
            this.connect(device, debug);
        }
    }

    private deviceIsMatch(device: Device): boolean {
        let match = true;
        if (this.config.serialNumber) {
            match = match && this.config.serialNumber === device.serialNumber;
        }
        match = match && this.config.productID === device.productId;
        match = match && this.config.vendorID === device.vendorId;
        return match;
    }

    private onControllerFrame(data: number[], debug: boolean): void {
        this.logDebug(JSON.stringify(data), debug);

        this.processJoysticks(data);
        this.processButtons(data);
        this.processStatus(data);
    }

    private processJoysticks(data: number[]) {
        this.config.joysticks?.forEach((joystick) => {
            const oldState = this._joystickStates[joystick.name];
            const newState = {
                x: data[joystick.x.pin],
                y: data[joystick.y.pin],
            };
            if (oldState && (oldState.x !== newState.x || oldState.y !== newState.y)) {
                this.emit(joystick.name + ':move', oldState);
            }
            this._joystickStates[joystick.name] = newState;
        });
    }

    private processButtons(data: number[]) {
        this.config.buttons?.forEach((button) => {
            const oldState = this._buttonStates[button.name];
            const newState = data[button.pin] & 0xff;
            const isPressed = newState >= button.value;
            if (oldState) {
                if (oldState !== newState) {
                    this.emit(button.name + ':change', oldState);
                    const oldPressed = oldState >= button.value;
                    if (oldPressed != isPressed) {
                        isPressed ? this.emit(button.name + ':press') : this.emit(button.name + ':release');
                    }
                }
            } else if (isPressed) {
                this.emit(button.name + ':press');
            }
            this._buttonStates[button.name] = newState;
        });
    }

    private processStatus(data: number[]) {
        this.config.status?.forEach((status) => {
            const oldState = this._buttonStates[status.name];
            const newState = data[status.pin] & 0xff;
            if (!oldState || oldState != newState) {
                this.emit(status.name + ':change', this.getStateName(status.states, newState));
            }
            this._buttonStates[status.name] = newState;
        });
    }

    private getStateName(states: { value: number; state: string }[], value: number): string {
        for (let state of states) {
            if (state.value === value) {
                return state.state;
            }
        }
        return `unknown state:${value}`;
    }
}
