export interface ILogger {
    Info(toLog: string): void;
    Debug?: (toLog: string) => void;
    DebugLowLevel?: (toLog: string) => void;
}
