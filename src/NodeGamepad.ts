import { HID, devices } from 'node-hid';
import { IButtonConfig, IConfig, IJoyStickConfig, IScaleConfig, IStateMappingConfig, IStatusConfig } from './IConfig';

import { EventEmitter } from 'events';
import { IDeviceSpec } from './IDeviceSpec';
import { ILogger } from './ILogger';
import { JoyStickValue } from './JoyStickValue';
import { evaluate } from 'mathjs';

export class NodeGamepad extends EventEmitter {
    protected _usb?: HID = undefined;
    private _running = false;
    private _joystickStates: { [key: string]: JoyStickValue } = {};
    private _buttonStates: { [key: string]: boolean } = {};
    private _statusStates: { [key: string]: number } = {};
    private _scaleStates: { [key: string]: number } = {};
    private _connectRetryTimeout?: ReturnType<typeof setTimeout>;
    private readonly _connectionRetryTimeoutInMs = 500;

    constructor(private config: IConfig, private logger?: ILogger) {
        super();
    }

    public start(): void {
        if (this._running) {
            return;
        }
        this.log(`Starting connection procedure to device:${JSON.stringify(this.toIDeviceSpec(this.config))}`);
        this.registerProgramExitEvents();
        this._running = true;
        this.connect();
    }

    public stop(): void {
        this._running = false;
        this.stopConnectionProcess();
        this.closeUsbDevice();
    }

    public rumble(_intensity: number, _duration: number): void {
        // todo
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
        if (!this._running) {
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
                this.emit('disconnected');
                this.closeUsbDevice();
                setTimeout(() => {
                    this.log('reconnecting');
                    this.connect();
                }, 0);
            });
        } catch (error) {
            const typedError = error as Error;
            this.log(`Connecting failed: ${typedError.message}`);
            this.log('trying again later.');
            this.closeUsbDevice();
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
        process.on('exit', () => {
            this.logDebug('exit encontered, cleaning up');
            this.stop();
        });
    }

    private closeUsbDevice() {
        if (this._usb) {
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
        this.processStates(data);
        this.processScales(data);
    }

    private processJoysticks(data: number[]) {
        this.config.joysticks?.forEach((joystick) => {
            if (data.length > joystick.x.pin || data.length > joystick.y.pin) {
                this.processJoystick(joystick, data);
            }
        });
    }

    private processJoystick(joystick: IJoyStickConfig, data: number[]) {
        const oldState = this._joystickStates[joystick.name];
        const newState = {
            x: data[joystick.x.pin],
            y: data[joystick.y.pin],
        };
        if (oldState === undefined || oldState.x !== newState.x || oldState.y !== newState.y) {
            this.emit(joystick.name + ':move', newState);
        }
        this._joystickStates[joystick.name] = newState;
    }

    private processButtons(data: number[]) {
        this.config.buttons?.forEach((button) => {
            if (data.length > button.pin) {
                this.processButton(data, button);
            }
        });
    }

    private processButton(data: number[], config: IButtonConfig) {
        const oldState = this._buttonStates[config.name];
        const newState: boolean = evaluate(config.value, { value: data[config.pin] });
        if (oldState == undefined) {
            if (newState) {
                this.emit(config.name + ':press');
            }
        } else if (oldState !== newState) {
            const emitEvent = newState ? `${config.name}:press` : `${config.name}:release`;
            this.emit(emitEvent);
        }

        this._buttonStates[config.name] = newState;
    }

    private processScales(data: number[]) {
        this.config.scales?.forEach((scale) => {
            if (data.length > scale.pin) {
                this.processScale(scale, data);
            }
        });
    }

    private processScale(config: IScaleConfig, data: number[]) {
        const oldState = this._scaleStates[config.name];
        const newState = data[config.pin];
        if (oldState !== newState) {
            this.emit(config.name + ':change', newState);
        }
        this._scaleStates[config.name] = newState;
    }

    private processStates(data: number[]) {
        this.config.status?.forEach((status) => {
            if (data.length > status.pin) {
                this.processState(status, data);
            }
        });
    }

    private processState(config: IStatusConfig, data: number[]) {
        const oldState = this._statusStates[config.name];
        const newState = data[config.pin];
        if (oldState !== newState) {
            this.emit(config.name + ':change', this.getStateName(config.states, newState));
        }
        this._statusStates[config.name] = newState;
    }

    private getStateName(states: IStateMappingConfig[], value: number): string {
        for (const state of states) {
            if (state.value === value) {
                return state.state;
            }
        }
        return `unknown state:${value}`;
    }
}
