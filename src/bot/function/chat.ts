import axios from 'axios';
import { CacheType, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Logger } from '../../common/logger';
import { CONFIG, LiteLLMModel } from '../../config/config';
import { GPTMode, LogLevel, ModelResponse } from '../../type/types';
import * as ChatService from '../service/chatService';
import { gptList } from '../service/chatService';

/**
 * ChatGPTの会話データの削除
 */
export async function deleteChatData(interaction: ChatInputCommandInteraction<CacheType>, lastFlag?: boolean) {
  const { id } = getIdInfo(interaction);
  if (!id) {
    await interaction.reply('データが存在しないみたい？');
    return;
  }
  const gpt = gptList.gpt.find((c) => c.id === id);
  if (!gpt) {
    await interaction.reply('会話データが存在しないみたい？');
    return;
  }

  if (lastFlag) {
    const eraseData = gpt.chat[gpt.chat.length - 1];
    gpt.chat.splice(gpt.chat.length - 2, 2);

    const send = new EmbedBuilder()
      .setColor('#00cc00')
      .setTitle(`直前の会話データを削除したよ～！`)
      .setDescription(`会話データ: \nid: ${gpt.id}\nmessage: ${eraseData.content}`);
    await interaction.reply({ embeds: [send] });
    return;
  }
  gptList.gpt = gptList.gpt.filter((c) => c.id !== id);
  Logger.put({
    guild_id: interaction.guild?.id,
    channel_id: interaction.channel?.id,
    user_id: interaction.user.id,
    level: LogLevel.INFO,
    event: 'ChatGPT',
    message: [`Delete: ${gpt.id}`],
  });
  await interaction.reply('会話データを削除したよ～！');
}

function getIdInfo(interaction: ChatInputCommandInteraction<CacheType>) {
  const guild = interaction.guild;
  if (!guild) {
    return { id: interaction.channel?.id ?? interaction.user.dmChannel?.id, isGuild: false };
  }
  return { id: guild.id, isGuild: true };
}

export async function showModelList(interaction: ChatInputCommandInteraction<CacheType>) {
  const response = await axios.get<ModelResponse>(`${CONFIG.OPENAI.BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${CONFIG.OPENAI.KEY}`,
    },
  });
  const models = response.data.data;
  const content = models.map((m) => {
    return `${m.id}`;
  });

  const send = new EmbedBuilder().setColor('#00cc00').setTitle(`モデル一覧`).setDescription(content.join('\n'));
  await interaction.reply({ embeds: [send] });
}

export async function setModel(interaction: ChatInputCommandInteraction<CacheType>, model: string) {
  const { id, isGuild } = getIdInfo(interaction);

  let gpt = gptList.gpt.find((c) => c.id === interaction.user.id);
  if (!gpt) {
    gpt = await ChatService.initalize(interaction.user.id, model as LiteLLMModel, GPTMode.DEFAULT, isGuild);
    ChatService.gptList.gpt.push(gpt);
  }

  gpt.model = model as LiteLLMModel;
  await interaction.reply(`モデルを${model}に設定したよ～！`);
}
