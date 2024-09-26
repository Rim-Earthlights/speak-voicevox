import OpenAI from "openai";
import { ChatGPTModel } from "../config/config";
import { ChatCompletionMessageParam } from "openai/resources";
import dayjs from "dayjs";

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

export type ChatGPT = {
  id: string;
  openai: OpenAI;
  model: ChatGPTModel;
  chat: ChatCompletionMessageParam[];
  isGuild: boolean;
  timestamp: dayjs.Dayjs;
};

export enum GPTMode {
  DEFAULT = 'default',
  NOPROMPT = 'no_prompt'
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type VisionMessage = {
  role: Role;
  content: VisionContent;
}

type VisionContent = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
};

export enum Role {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
};