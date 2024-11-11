import { CacheType, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { gptList } from '../service/chatService';
import { Logger } from '../../common/logger';
import { LogLevel } from '../../type/types';

/**
 * ChatGPTの会話データの削除
 */
export async function deleteChatData(interaction: ChatInputCommandInteraction<CacheType>) {
  const { id } = getIdInfo(interaction);
  if (!id) {
    return;
  }
  const gpt = gptList.gpt.find((c) => c.id === id);
  if (!gpt) {
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

  const send = new EmbedBuilder().setColor('#00ffff').setTitle(`会話履歴の削除`).setDescription(`会話履歴を削除した`);
  await interaction.reply({ embeds: [send] });
}

function getIdInfo(interaction: ChatInputCommandInteraction<CacheType>) {
  const guild = interaction.guild;
  if (!guild) {
    return { id: interaction.channel?.id ?? interaction.user.dmChannel?.id, isGuild: false };
  }
  return { id: guild.id, isGuild: true };
}
