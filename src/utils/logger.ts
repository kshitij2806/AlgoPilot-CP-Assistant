export class Logger {
  private static prefix = '[CP-Assistant]';

  static info(message: string, ...args: any[]) {
    console.log(`${this.prefix} ℹ️ ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`${this.prefix} ⚠️ ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`${this.prefix} ❌ ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]) {
    console.debug(`${this.prefix} 🔍 ${message}`, ...args);
  }
}
