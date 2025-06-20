import dayjs from 'dayjs';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { LiteLLMModel } from '../config/config';

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
  SYSTEM = 'system',
}

export type ChatGPT = {
  id: string;
  openai: OpenAI;
  model: LiteLLMModel;
  chat: ChatCompletionMessageParam[];
  isGuild: boolean;
  timestamp: dayjs.Dayjs;
};

export enum GPTMode {
  DEFAULT = 'default',
  NOPROMPT = 'no_prompt',
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type VisionMessage = {
  role: Role;
  content: VisionContent;
};

type VisionContent = {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
};

export enum Role {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

export type ModelResponse = {
  data: {
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }[];
};
