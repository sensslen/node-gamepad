import { IDeviceSpec } from './IDeviceSpec';

export interface IConfig extends IDeviceSpec {
    joysticks?: { name: string; x: { pin: number }; y: { pin: number } }[];
    buttons?: { value: number; pin: number; name: string }[];
    status?: {
        name: string;
        pin: number;
        states: { value: number; state: string }[];
    }[];
}
