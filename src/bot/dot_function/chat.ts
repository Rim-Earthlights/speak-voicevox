import dayjs from 'dayjs';
import { EmbedBuilder, Message } from 'discord.js';
import { ChatCompletionContentPart } from 'openai/resources';
import { Logger } from '../../common/logger';
import { LiteLLMModel } from '../../config/config';
import { DISCORD_CLIENT } from '../../constant/constants';
import { ChatHistoryChannelType } from '../../model/models/chatHistory';
import { ChatHistoryRepository } from '../../model/repository/chatHistoryRepository';
import { LogLevel, Role } from '../../type/types';
import * as ChatService from '../service/chatService';

/**
 * ChatGPTで会話する
 */
export async function talk(message: Message, content: string, model: LiteLLMModel, mode: ChatService.LiteLLMMode) {
  const { id, isGuild } = getIdInfo(message);
  let llm = ChatService.llmList.llm.find((c) => c.id === id);
  if (!llm) {
    llm = await ChatService.initalize(id, model, mode, isGuild);
    ChatService.llmList.llm.push(llm);
  }
  const openai = llm.openai;
  let weather = undefined;

  const user = message.mentions.users.map((u) => {
    return {
      mention_id: `<@${u.id}>`,
      name: u.displayName,
    };
  });
  if (!user.find((u) => u.mention_id === `<@${message.author.id}>`)) {
    user.push({
      mention_id: `<@${message.author.id}>`,
      name: message.author.displayName,
    });
  }

  const systemContent = {
    server: { name: message.guild?.name },
    user,
    date: dayjs().format('YYYY/MM/DD HH:mm:ss'),
    weather,
  };

  const sendContent = `${JSON.stringify(systemContent)}\n${content}`;

  if (message.attachments) {
    const attachmentUrls = message.attachments.filter((a) => a.height && a.width).map((a) => a.url);
    const urls = attachmentUrls.map((u) => ({ type: 'image_url', image_url: { url: u } }));
    llm.chat.push({
      role: Role.USER,
      content: [{ type: 'text', text: sendContent }, ...urls] as Array<ChatCompletionContentPart>,
    });
  } else {
    llm.chat.push({
      role: Role.USER,
      content: sendContent,
    });
  }

  await Logger.put({
    guild_id: message.guild?.id,
    channel_id: message.channel.id,
    user_id: message.author.id,
    level: LogLevel.INFO,
    event: 'ChatGPT',
    message: [`Request:`, sendContent],
  });

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: llm.chat,
    });

    const completion = response.choices[0].message;

    if (!completion.content) {
      const send = new EmbedBuilder().setColor('#ff0000').setTitle(`エラー`).setDescription(`contentがnull`);
      await message.reply({ embeds: [send] });
      return;
    }

    llm.chat.push({ role: Role.ASSISTANT, content: completion.content });
    llm.timestamp = dayjs();

    if (completion.content.length > 2000) {
      const texts = completion.content.split('\n');
      let chunk = '';
      for (const text of texts) {
        if (chunk.length + text.length > 2000) {
          await message.reply(chunk + '\n');
          chunk = '';
        } else {
          chunk += text + '\n';
        }
      }
      await message.reply(chunk);
    } else {
      await message.reply(completion.content);
    }

    const chatHistoryRepository = new ChatHistoryRepository();
    await chatHistoryRepository.save({
      uuid: llm.uuid,
      bot_id: DISCORD_CLIENT.user!.id,
      channel_id: id,
      name: message.author.displayName,
      content: llm.chat,
      model: llm.model,
      mode: ChatService.LiteLLMMode.DEFAULT,
      channel_type: isGuild ? ChatHistoryChannelType.GUILD : ChatHistoryChannelType.DM,
    });


    await Logger.put({
      guild_id: message.guild?.id,
      channel_id: message.channel.id,
      user_id: message.author.id,
      level: LogLevel.INFO,
      event: 'ChatGPT',
      message: [
        `ResponseId: ${response.id}`,
        `Usage: ${JSON.stringify(response.usage)}`,
        `Model: ${response.model}`,
        `Response:`,
        `${completion.content}`,
      ],
    });
  } catch (e) {
    const error = e as Error;
    console.error(error);

    if (error.message.includes('429')) {
      llm.chat.pop();
      await message.reply(`10秒ほど待ってからもう一度送信してみて！`);
    } else {
      await message.reply(`エラーが発生しました。\n\`\`\`\n${error.message}\n\`\`\``);
    }
    return;
  }
}

function getIdInfo(message: Message) {
  const guild = message.guild;
  if (!guild) {
    return { id: message.author.id, isGuild: false };
  }
  return { id: guild.id, isGuild: true };
}
