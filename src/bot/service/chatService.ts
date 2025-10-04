import dayjs from 'dayjs';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { CONFIG, LiteLLMModel } from '../../config/config.js';
import { CHATBOT_LEMON_TEMPLATE, CHATBOT_LIME_TEMPLATE } from '../../constant/constants.js';

export const llmList = { llm: [] as LiteLLM[] };

export async function initalize(id: string, model: LiteLLMModel, mode: LiteLLMMode, isGuild: boolean) {
  const openai = new OpenAI({
    organization: CONFIG.OPENAI.ORG,
    project: CONFIG.OPENAI.PROJECT,
    apiKey: CONFIG.OPENAI.KEY,
    maxRetries: 3,
    baseURL: 'http://localhost:4001',
  });
  const gpt: LiteLLM = {
    id,
    uuid: crypto.randomUUID(),
    openai: openai,
    model: model,
    chat: [],
    isGuild: isGuild,
    memory: false,
    timestamp: dayjs(),
  };
  if (mode === LiteLLMMode.DEFAULT) {
    gpt.chat.push({
      role: Role.SYSTEM,
      content: CONFIG.NAME === 'lemon' ? CHATBOT_LEMON_TEMPLATE : CHATBOT_LIME_TEMPLATE,
    });
  }
  return gpt;
}

export type LiteLLM = {
  id: string;
  uuid: string;
  openai: OpenAI;
  model: LiteLLMModel;
  chat: ChatCompletionMessageParam[];
  isGuild: boolean;
  memory: boolean;
  timestamp: dayjs.Dayjs;
};

export enum LiteLLMMode {
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
