import { HID, devices } from 'node-hid';

import { EventEmitter } from 'events';
import { IConfig } from './IConfig';
import { IDeviceSpec } from './IDeviceSpec';
import { ILogger } from './ILogger';
import { JoyStickValue } from './JoyStickValue';
import { evaluate } from 'mathjs';

export class NodeGamepad extends EventEmitter {
    protected _usb?: HID = undefined;
    private _stopped = false;
    private _joystickStates: { [key: string]: JoyStickValue } = {};
    private _buttonStates: { [key: string]: boolean } = {};
    private _statusStates: { [key: string]: number } = {};
    private _scaleStates: { [key: string]: number } = {};
    private _connectRetryTimeout?: ReturnType<typeof setTimeout>;
    private readonly _connectionRetryTimeoutInMs = 100;

    constructor(private config: IConfig, private logger?: ILogger) {
        super();
    }

    public start(): void {
        this.log(`Starting connection procedure to device:${JSON.stringify(this.toIDeviceSpec(this.config))}`);
        this.registerProgramExitEvents();
        this.connect();
    }

    public stop(): void {
        if (!this._stopped) {
            this.stopConnectionProcess();
            this.disconnect();
            this._stopped = true;
        }
    }

    public rumble(_duration: number): void {
        // do nothing here intentionally. gamepads supporting rumbling do need to override this method
    }

    private logDebug(toLog: string) {
        if (this.logger?.debug) {
            this.logger.debug(`NodeGamepad (Debug):${toLog}`);
        }
    }

    private log(toLog: string) {
        if (this.logger) {
            this.logger.info(`NodeGamepad:${toLog}`);
        }
    }

    private connect(): void {
        if (this._stopped) {
            return;
        }

        let deviceList = devices(this.config.vendorID, this.config.productID);
        if (this.config.serialNumber) {
            deviceList = deviceList.filter((d) => d.serialNumber === this.config.serialNumber);
        }

        if (deviceList.length < 1) {
            this.logDebug('Device not found, trying again later');
            this._connectRetryTimeout = setTimeout(() => this.connect(), this._connectionRetryTimeoutInMs);
            return;
        }

        const deviceToConnectTo = deviceList[0];

        if (deviceToConnectTo?.path === undefined) {
            this.logDebug('Failed to connect. Checking again later.');
            this._connectRetryTimeout = setTimeout(() => this.connect(), this._connectionRetryTimeoutInMs);
            return;
        }

        this.logDebug(`connecting to:${JSON.stringify(deviceToConnectTo)}`);
        try {
            this._usb = new HID(deviceToConnectTo.path);
            this.log('connected');
            this.emit('connected');
            this._connectRetryTimeout = undefined;
            this._usb.on('data', (data: number[]) => this.onControllerFrame(data));
            this._usb.on('error', (error) => {
                this.log(`Error occurred:${JSON.stringify(error)}`);
                setTimeout(() => {
                    this.log('reconnecting');
                    this.disconnect();
                    this.connect();
                }, 0);
            });
        } catch (error) {
            const typedError = error as Error;
            this.log(`Connecting failed: ${typedError.message}`);
            this.log('trying again later.');
            this._connectRetryTimeout = setTimeout(() => this.connect(), this._connectionRetryTimeoutInMs);
        }
    }

    private stopConnectionProcess(): void {
        if (this._connectRetryTimeout) {
            clearTimeout(this._connectRetryTimeout);
            this._connectRetryTimeout = undefined;
        }
    }

    private registerProgramExitEvents() {
        process.on('exit', () => this.stop());
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
        for (const state of states) {
            if (state.value === value) {
                return state.state;
            }
        }
        return `unknown state:${value}`;
    }
}
