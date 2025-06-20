import dayjs from 'dayjs';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { CONFIG, LiteLLMModel } from '../../config/config.js';
import { CHATBOT_LEMON_TEMPLATE, CHATBOT_LIME_TEMPLATE } from '../../constant/constants.js';

export const gptList = { gpt: [] as ChatGPT[] };

export async function initalize(id: string, model: LiteLLMModel, mode: GPTMode, isGuild: boolean) {
  const openai = new OpenAI({
    organization: CONFIG.OPENAI.ORG,
    project: CONFIG.OPENAI.PROJECT,
    apiKey: CONFIG.OPENAI.KEY,
    maxRetries: 3,
    baseURL: 'http://localhost:4001',
  });
  const gpt: ChatGPT = {
    id,
    openai: openai,
    model: model,
    chat: [],
    isGuild: isGuild,
    timestamp: dayjs(),
  };
  if (mode === GPTMode.DEFAULT) {
    gpt.chat.push({
      role: Role.SYSTEM,
      content: CONFIG.NAME === 'lemon' ? CHATBOT_LEMON_TEMPLATE : CHATBOT_LIME_TEMPLATE,
    });
  }
  return gpt;
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
