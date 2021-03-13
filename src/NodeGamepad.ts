import { EventEmitter } from 'events';
import { devices, HID } from 'node-hid';
import { startMonitoring, on, Device, stopMonitoring, find } from 'usb-detection';
import { IConfig } from './IConfig';
import { IDeviceSpec } from './IDeviceSpec';
import { ILogger } from './ILogger';
import { JoyStickValue } from './JoyStickValue';
import { evaluate } from 'mathjs';

export class NodeGamepad extends EventEmitter {
    private static _usbMonitoringCounter = 0;

    protected _usb?: HID;
    private _stopped = false;
    private _joystickStates: { [key: string]: JoyStickValue } = {};
    private _buttonStates: { [key: string]: boolean } = {};
    private _statusStates: { [key: string]: number } = {};
    private _scaleStates: { [key: string]: number } = {};
    private _connectRetryTimeout?: ReturnType<typeof setTimeout>;

    constructor(private config: IConfig, private logger?: ILogger) {
        super();
    }

    public start() {
        this.log(`Starting connection procedure to device:${JSON.stringify(this.toIDeviceSpec(this.config))}`);
        this.registerStopProgramStopEvent();

        this.startMonitoring();
        find(this.config.vendorID, this.config.productID)
            .then((devices) => {
                for (let device of devices) {
                    this.connectIfMatching(device);
                }
            })
            .catch((error) => this.log(`usb device find error:${JSON.stringify(error)}`));

        on(`add:${this.config.vendorID}:${this.config.productID}`, (device) => {
            if (!this._stopped) {
                this.connectIfMatching(device);
            }
        });
        on(`remove:${this.config.vendorID}:${this.config.productID}`, (device) => {
            if (!this._stopped) {
                if (this.deviceIsMatch(device)) {
                    this.stopConnectionRetry();
                }
            }
        });
    }

    public stop() {
        if (!this._stopped) {
            this.stopMonitoring();
            this.stopConnectionRetry();
            this.disconnect();
            this._stopped = true;
        }
    }

    public rumble(_duration: number): void {
        // do nothing here intentionally. gamepads supporting rumbling do need to override this method
    }

    private stopMonitoring() {
        NodeGamepad._usbMonitoringCounter--;
        if (NodeGamepad._usbMonitoringCounter === 0) {
            stopMonitoring();
        }
    }

    private startMonitoring() {
        if (NodeGamepad._usbMonitoringCounter === 0) {
            startMonitoring();
        }
        NodeGamepad._usbMonitoringCounter++;
    }

    private logDebug(toLog: string) {
        if (this.logger?.Debug) {
            this.logger.Debug(`NodeGamepad (Debug):${toLog}`);
        }
    }

    private log(toLog: string) {
        if (this.logger) {
            this.logger.Info(`NodeGamepad:${toLog}`);
        }
    }

    private stopConnectionRetry(): void {
        if (this._connectRetryTimeout) {
            clearTimeout(this._connectRetryTimeout);
            this._connectRetryTimeout = undefined;
        }
    }

    private registerStopProgramStopEvent() {
        process.on('SIGINT', () => this.stop());
        process.on('exit', () => this.stop());
        process.on('uncaughtException', () => this.stop());
    }

    private connect(device: Device): void {
        if (this._usb) {
            return;
        }
        this.log(`Device connected:${JSON.stringify(device)}`);
        const matchingDevices = devices(device.vendorId, device.productId);
        this.logDebug(`Found devices:${JSON.stringify(matchingDevices)}`);
        const deviceToConnect = matchingDevices.find((d) => {
            return device.serialNumber === undefined || device.serialNumber === d.serialNumber;
        });
        if (deviceToConnect?.path === undefined) {
            this.log('Failed to connect. Checking again in 100 ms.');
            this._connectRetryTimeout = setTimeout(() => this.connect(device), 100);
        } else {
            this.logDebug(`connecting to:${JSON.stringify(deviceToConnect)}`);
            this._usb = new HID(deviceToConnect.path);
            this.logDebug(`connected`);
            this.emit('connected');
            this._connectRetryTimeout = undefined;
            this._usb.on('data', (data: number[]) => this.onControllerFrame(data));
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

    private connectIfMatching(device: Device): void {
        if (this.deviceIsMatch(device)) {
            this.connect(device);
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

    private onControllerFrame(data: number[]): void {
        this.logDebug(JSON.stringify(data));

        this.processJoysticks(data);
        this.processButtons(data);
        this.processStatus(data);
        this.processScales(data);
    }

    private processJoysticks(data: number[]) {
        this.config.joysticks?.forEach((joystick) => {
            const oldState = this._joystickStates[joystick.name];
            const newState = {
                x: data[joystick.x.pin],
                y: data[joystick.y.pin],
            };
            if (oldState === undefined || oldState.x !== newState.x || oldState.y !== newState.y) {
                this.emit(joystick.name + ':move', newState);
            }
            this._joystickStates[joystick.name] = newState;
        });
    }

    private processButtons(data: number[]) {
        this.config.buttons?.forEach((button) => {
            const oldState = this._buttonStates[button.name];
            const newState: boolean = evaluate(button.value, { value: data[button.pin] });
            if (oldState == undefined) {
                if (newState) {
                    this.emit(button.name + ':press');
                }
            } else if (oldState !== newState) {
                const emitEvent = newState ? `${button.name}:press` : `${button.name}:release`;
                this.emit(emitEvent);
            }

            this._buttonStates[button.name] = newState;
        });
    }

    private processScales(data: number[]) {
        this.config.scale?.forEach((scale) => {
            const oldState = this._scaleStates[scale.name];
            const newState = data[scale.pin];
            if (oldState !== newState) {
                this.emit(scale.name + ':change', newState);
            }
            this._scaleStates[scale.name] = newState;
        });
    }

    private processStatus(data: number[]) {
        this.config.status?.forEach((status) => {
            const oldState = this._statusStates[status.name];
            const newState = data[status.pin];
            if (oldState !== newState) {
                this.emit(status.name + ':change', this.getStateName(status.states, newState));
            }
            this._statusStates[status.name] = newState;
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
