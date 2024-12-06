import { getVoiceConnection } from '@discordjs/voice';
import { VoiceChannel, VoiceState } from 'discord.js';
import { Logger } from '../../common/logger';
import { DISCORD_CLIENT } from '../../constant/constants';
import { SpeakerRepository } from '../../model/repository/speakerRepository';
import { UsersRepository } from '../../model/repository/usersRepository';
import { LogLevel } from '../../type/types';
import * as SpeakService from '../service/speakService';

/**
 * ボイスチャンネルから切断した時の処理
 * @param voiceState VoiceState
 * @returns void
 */
export async function leftVoiceChannel(voiceState: VoiceState, newState?: VoiceState): Promise<void> {
  const vc = voiceState.channel as VoiceChannel;
  if (vc == null || vc.members.size === 0) {
    return;
  }
  if (voiceState.member?.id === DISCORD_CLIENT.user?.id) {
    Logger.put({
      guild_id: vc.guild.id,
      channel_id: vc.id,
      user_id: undefined,
      level: LogLevel.INFO,
      event: 'leftVoiceChannel',
      message: [`Bot left the voice channel`],
    });

    await SpeakService.removeAudioPlayer(vc);

    const repository = new SpeakerRepository();
    await repository.updateUsedSpeaker(voiceState.guild.id, DISCORD_CLIENT.user!.id, false);
    return;
  }
  const me = vc.members.find((m) => m.id === DISCORD_CLIENT.user?.id);
  const bot = vc.members.filter((m) => m.user.bot);
  if (me && bot.size === vc.members.size) {
    const connection = getVoiceConnection(voiceState.guild.id);
    try {
      const speaker = SpeakService.Speaker.player.find((p) => p.guild_id === voiceState.guild.id);
      if (speaker) {
        SpeakService.Speaker.player = SpeakService.Speaker.player.filter((p) => p.guild_id !== voiceState.guild.id);
      }
      if (connection) {
        connection.destroy();
      }
      const repository = new SpeakerRepository();
      await repository.updateUsedSpeaker(voiceState.guild.id, DISCORD_CLIENT.user!.id, false);
    } catch (e) {
      const error = e as Error;
      Logger.put({
        guild_id: voiceState.guild.id,
        channel_id: vc.id,
        user_id: undefined,
        level: LogLevel.ERROR,
        event: 'leftVoiceChannel',
        message: [`Error: ${error.message}`],
      });
    }
  } else {
    const connection = getVoiceConnection(voiceState.guild.id);
    if (!connection) {
      return;
    }

    const speaker = SpeakService.Speaker.player.find((p) => p.guild_id === voiceState.guild.id);
    if (speaker) {
      if (voiceState.member) {
        const usersRepository = new UsersRepository();
        const user = await usersRepository.get(voiceState.guild.id, voiceState.member.id);
        let username = user?.userSetting.nickname;
        if (!username) {
          username = voiceState.member.displayName;
        }

        if (newState) {
          await SpeakService.addQueue(
            voiceState.channel as VoiceChannel,
            `${username}が${newState.channel?.name}に移動しました`,
            DISCORD_CLIENT.user!.id
          );
        } else {
          await SpeakService.addQueue(
            voiceState.channel as VoiceChannel,
            `${username}が退室しました`,
            DISCORD_CLIENT.user!.id
          );
        }
      }
    }
  }
}

/**
 * ボイスチャンネルに接続した時の処理
 * @param guild サーバ情報
 * @param voiceState VoiceState
 * @returns void
 */
export async function joinVoiceChannel(voiceState: VoiceState): Promise<void> {
  const connection = getVoiceConnection(voiceState.guild.id);

  if (voiceState.member?.user.bot) {
    return;
  }

  if (!connection) {
    return;
  }

  const speaker = SpeakService.Speaker.player.find((p) => p.guild_id === voiceState.guild.id);
  if (speaker) {
    if (voiceState.member) {
      const usersRepository = new UsersRepository();
      const user = await usersRepository.get(voiceState.guild.id, voiceState.member.id);
      let username = user?.userSetting.nickname;
      if (!username) {
        username = voiceState.member.displayName;
      }
      await SpeakService.addQueue(
        voiceState.channel as VoiceChannel,
        `${username}が入室しました`,
        DISCORD_CLIENT.user!.id
      );
    }
  }
}
