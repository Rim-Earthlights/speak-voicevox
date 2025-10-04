import axios from 'axios';
import { CacheType, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Logger } from '../../common/logger';
import { CONFIG, LiteLLMModel } from '../../config/config';
import { ChatHistory } from '../../model/models';
import { ChatHistoryRepository } from '../../model/repository/chatHistoryRepository';
import { LogLevel, ModelResponse } from '../../type/types';
import * as ChatService from '../service/chatService';
import { llmList } from '../service/chatService';

/**
 * ChatGPTの会話データの削除
 */
export async function deleteChatData(interaction: ChatInputCommandInteraction<CacheType>, lastFlag?: boolean) {
  const { id } = getIdInfo(interaction);
  if (!id) {
    await interaction.reply('データが存在しないみたい？');
    return;
  }
  const gpt = llmList.llm.find((c) => c.id === id);
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
  llmList.llm = llmList.llm.filter((c) => c.id !== id);
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
    return { id: interaction.user.id, isGuild: false };
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

  let gpt = llmList.llm.find((c) => c.id === interaction.user.id);
  if (!gpt) {
    gpt = await ChatService.initalize(interaction.user.id, model as LiteLLMModel, ChatService.LiteLLMMode.DEFAULT, isGuild);
    ChatService.llmList.llm.push(gpt);
  }

  gpt.model = model as LiteLLMModel;
  await interaction.reply(`モデルを${model}に設定したよ～！`);
}

export async function revert(interaction: ChatInputCommandInteraction<CacheType>) {
  await interaction.deferReply();

  try {
    const uuid = interaction.options.getString('uuid');
    const { id, isGuild } = getIdInfo(interaction);

    if (!id) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('エラー')
        .setDescription('チャンネルIDが見つかりませんでした。');
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    let chatHistory: ChatHistory | null = null;
    const chatHistoryRepository = new ChatHistoryRepository();

    if (uuid) {
      chatHistory = await chatHistoryRepository.get(uuid);
    } else {
      // データベースから最新のチャット履歴を取得
      chatHistory = await chatHistoryRepository.getLatestByChannelId(id);
    }

    if (!chatHistory) {
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('エラー')
        .setDescription('チャット履歴が見つかりませんでした。');
      await interaction.editReply({ embeds: [errorEmbed] });
      return;
    }

    // llmListから該当するチャットセッションを探す
    let llm: ChatService.LiteLLM | undefined;
    if (uuid) {
      llm = ChatService.llmList.llm.find((llm) => llm.uuid === uuid);
    } else {
      llm = ChatService.llmList.llm.find((llm) => llm.id === id);
    }

    if (llm) {
      // 現在のチャット履歴がある場合は上書きしない
      const warningEmbed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('履歴が存在する')
        .setDescription('まだチャットが残ってるみたい～！そのまま喋れるよ！');

      await interaction.editReply({ embeds: [warningEmbed] });
      return;
    } else {
      // 現在のチャット履歴がない場合は、DBから取得した履歴で上書きする
      const llm = await ChatService.initalize(id, chatHistory.model, chatHistory.mode, isGuild);
      ChatService.llmList.llm.push({ ...llm, chat: chatHistory.content, uuid: chatHistory.uuid });
    }

    const successEmbed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('復元完了')
      .setDescription(
        `チャット履歴を復元しました。\n履歴UUID: ${chatHistory.uuid}\nメッセージ数: ${chatHistory.content.length - 1}`
      );

    await interaction.editReply({ embeds: [successEmbed] });
  } catch (error) {
    const err = error as Error;
    Logger.put({
      guild_id: interaction.guild?.id,
      channel_id: interaction.channel?.id,
      user_id: interaction.user.id,
      level: LogLevel.ERROR,
      event: 'ChatGPT',
      message: [`Revert: ${err.message}`],
    });

    const errorEmbed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('エラー')
      .setDescription('チャット履歴の復元中にエラーが発生しました。');

    await interaction.editReply({ embeds: [errorEmbed] });
  }
}