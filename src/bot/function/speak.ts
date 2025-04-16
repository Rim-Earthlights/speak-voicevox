import { getVoiceConnection } from '@discordjs/voice';
import { CacheType, ChatInputCommandInteraction, EmbedBuilder, GuildMember, VoiceBasedChannel } from 'discord.js';
import { CONFIG } from '../../config/config';
import { DISCORD_CLIENT } from '../../constant/constants';
import { SpeakerRepository } from '../../model/repository/speakerRepository';
import { UsersRepository } from '../../model/repository/usersRepository';
import * as SpeakService from '../service/speakService';

export async function CallSpeaker(interaction: ChatInputCommandInteraction<CacheType>) {
  if (!interaction.guild || !DISCORD_CLIENT.user) {
    return;
  }

  const repository = new SpeakerRepository();
  const self = await repository.getSpeaker(interaction.guild.id, DISCORD_CLIENT.user.id);

  if (!self) {
    const send = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle(`エラー`)
      .setDescription(`呼び出せるbotが見つからなかった`);

    await interaction.editReply({ embeds: [send] });
    return;
  }

  const channel = (interaction.member as GuildMember).voice.channel;

  if (!channel) {
    const send = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle(`エラー`)
      .setDescription(`userのボイスチャンネルが見つからなかった`);

    await interaction.editReply({ content: `ボイスチャンネルに入ってから使って～！`, embeds: [send] });
    return;
  }

  if (self?.is_used) {
    await interaction.editReply({ content: `読み上げちゃんはすでに使用中です。` });
    return;
  }

  await ready(interaction, interaction.user.id);
}

export async function ready(interaction: ChatInputCommandInteraction<CacheType>, uid: string): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const usersRepository = new UsersRepository();
  const user = await usersRepository.get(interaction.guild.id, uid);

  if (!user) {
    if (CONFIG.COMMAND.SPEAKER_CONFIG.ENABLE) {
      const send = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle(`エラー`)
        .setDescription(`ユーザーが見つからなかった`);
      interaction.editReply({ embeds: [send] });
    }
    return;
  }

  await SpeakService.initialize(user.userSetting.voice_id);

  const p = await SpeakService.initAudioPlayer(interaction.guild!.id, interaction.channel as VoiceBasedChannel);

  if (!p) {
    const send = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle(`エラー`)
      .setDescription(`他の場所で読み上げちゃんが起動中だよ`);
    interaction.editReply({ embeds: [send] });
    return;
  }

  const send = new EmbedBuilder()
    .setColor('#00cc88')
    .setAuthor({ name: `読み上げちゃん` })
    .setTitle('読み上げを開始します')
    .setDescription(`終了する際は \`.${CONFIG.COMMAND.DISCONNECT}\` で終わるよ`);

  interaction.editReply({ embeds: [send] });

  setTimeout(() => { }, CONFIG.COMMAND.SPEAK.SLEEP_TIME * 1000);
  const repository = new SpeakerRepository();
  await repository.updateUsedSpeaker(interaction.guild!.id, DISCORD_CLIENT.user!.id, true);
}

/**
 * 読み上げを終了する
 * @param channel ボイスチャンネル
 * @returns void
 */
export async function disconnect(interaction: ChatInputCommandInteraction<CacheType>): Promise<void> {
  if (!interaction.guild || !DISCORD_CLIENT.user) {
    interaction.reply({ content: `ボイスチャンネルに入ってから使って～！` });
    return;
  }

  const playerData = await SpeakService.getAudioPlayer(interaction.guild!.id, interaction.channel as VoiceBasedChannel);
  if (!playerData) {
    return;
  }

  const repository = new SpeakerRepository();
  await repository.updateUsedSpeaker(interaction.guild!.id, DISCORD_CLIENT.user!.id, false);

  await SpeakService.removeAudioPlayer(interaction.channel as VoiceBasedChannel);

  const connection = getVoiceConnection(interaction.guild!.id);
  if (connection) {
    connection.destroy();
  }
  const send = new EmbedBuilder()
    .setColor('#00cc88')
    .setAuthor({ name: `読み上げちゃん` })
    .setTitle('読み上げ終了')
    .setDescription('またね！');

  await interaction.reply({ embeds: [send] });
}
