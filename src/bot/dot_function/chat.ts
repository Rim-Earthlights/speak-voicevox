import dayjs from 'dayjs';
import { EmbedBuilder, Message } from 'discord.js';
import { ChatCompletionContentPart } from 'openai/resources';
import { Logger } from '../../common/logger';
import { LiteLLMModel } from '../../config/config';
import { GPTMode, LogLevel, Role } from '../../type/types';
import * as ChatService from '../service/chatService';

/**
 * ChatGPTで会話する
 */
export async function talk(message: Message, content: string, model: LiteLLMModel, mode: GPTMode) {
  const { id, isGuild } = getIdInfo(message);
  let gpt = ChatService.gptList.gpt.find((c) => c.id === id);
  if (!gpt) {
    gpt = await ChatService.initalize(id, model, mode, isGuild);
    ChatService.gptList.gpt.push(gpt);
  }
  const openai = gpt.openai;
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
    gpt.chat.push({
      role: Role.USER,
      content: [{ type: 'text', text: sendContent }, ...urls] as Array<ChatCompletionContentPart>,
    });
  } else {
    gpt.chat.push({
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
      messages: gpt.chat,
    });

    const completion = response.choices[0].message;

    if (!completion.content) {
      const send = new EmbedBuilder().setColor('#ff0000').setTitle(`エラー`).setDescription(`contentがnull`);
      await message.reply({ embeds: [send] });
      return;
    }

    gpt.chat.push({ role: Role.ASSISTANT, content: completion.content });
    gpt.timestamp = dayjs();

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
      gpt.chat.pop();
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
    return { id: message.channel.id, isGuild: false };
  }
  return { id: guild.id, isGuild: true };
}
