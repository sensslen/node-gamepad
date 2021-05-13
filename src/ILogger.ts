export interface ILogger {
    debug?: (toLog: string) => void;
    info(toLog: string): void;
}
