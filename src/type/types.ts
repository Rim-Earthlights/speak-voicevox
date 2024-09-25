export type LogData = {
  guild_id?: string;
  channel_id?: string;
  user_id?: string;
  level: LogLevel;
  event: string;
  message?: string[];
};

export enum LogLevel {
  INFO = 'info',
  ERROR = 'error',
  SYSTEM = 'system'
}
