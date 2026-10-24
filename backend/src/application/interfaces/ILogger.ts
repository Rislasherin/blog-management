export interface ILogger {
  info(arg1: string | object, arg2?: string, ...rest: unknown[]): void;
  warn(arg1: string | object, arg2?: string, ...rest: unknown[]): void;
  error(arg1: string | object | Error, arg2?: string, ...rest: unknown[]): void;
  debug(arg1: string | object, arg2?: string, ...rest: unknown[]): void;
  fatal?(arg1: string | object, arg2?: string, ...rest: unknown[]): void;
}

export default ILogger;
