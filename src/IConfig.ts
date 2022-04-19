import { IDeviceSpec } from './IDeviceSpec';

export interface IJoyStickConfig {
    name: string;
    x: { pin: number };
    y: { pin: number };
}

export interface IButtonConfig {
    value: string;
    pin: number;
    name: string;
}

export interface IStatusConfig {
    name: string;
    pin: number;
    states: IStateMappingConfig[];
}

export interface IStateMappingConfig {
    value: number;
    state: string;
}

export interface IScaleConfig {
    pin: number;
    name: string;
}

export interface IConfig extends IDeviceSpec {
    joysticks?: IJoyStickConfig[];
    buttons?: IButtonConfig[];
    status?: IStatusConfig[];
    scales?: IScaleConfig[];
}
