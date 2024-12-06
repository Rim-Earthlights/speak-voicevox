import { CacheType, ChatInputCommandInteraction, EmbedBuilder, Message } from 'discord.js';
import { findVoiceFromId, initializeCoeiroSpeakerIds } from '../common/common';
import { CONFIG } from '../config/config';
import { UsersRepository } from '../model/repository/usersRepository';
import { GPTMode } from '../type/types';
import * as DotBotFunctions from './dot_function';
import * as BotFunctions from './function';

/**
 * 渡されたコマンドから処理を実行する
 *
 * @param command 渡されたメッセージ
 */
export async function commandSelector(message: Message) {
  if (!message.guild) {
    return;
  }
  const content = message.content.replace('.', '').replace(/　/g, ' ').trimEnd().split(' ');
  const command = content[0];
  content.shift();
  switch (command) {
    case CONFIG.NAME: {
      await DotBotFunctions.Chat.talk(message, content.join(' '), CONFIG.OPENAI.DEFAULT_MODEL, GPTMode.DEFAULT);
      break;
    }
    case CONFIG.COMMAND.SPEAK.COMMAND_NAME: {
      await DotBotFunctions.Speak.CallSpeaker(message);
      break;
    }
    case CONFIG.COMMAND.SPEAKER_CONFIG.COMMAND_NAME:
    case CONFIG.COMMAND.SPEAKER_CONFIG.COMMAND_NAME_SHORT: {
      if (!CONFIG.COMMAND.SPEAKER_CONFIG.ENABLE) {
        return;
      }
      const usersRepository = new UsersRepository();
      const user = await usersRepository.get(message.guild.id, message.author.id);

      const voiceType = Number(content[0]);
      const speedSlace = Number(content[1]);
      const pitch = Number(content[2]);
      const intonation = Number(content[3]);

      if (!user) {
        const send = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle(`エラー`)
          .setDescription(`ユーザーが見つからなかった`);

        message.reply({ embeds: [send] });
        return;
      }

      if (!voiceType && !speedSlace) {
        const voiceName = await findVoiceFromId(user.userSetting.voice_id);
        const send = new EmbedBuilder()
          .setColor('#00ffff')
          .setTitle(`現在の設定`)
          .setDescription(`声: ${voiceName}(${user.userSetting.voice_id})\nスピード: ${user.userSetting.voice_speed}`);
        await message.reply({ embeds: [send] });
        return;
      }

      const voiceName = await findVoiceFromId(voiceType);

      if (!voiceName) {
        const send = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle(`エラー`)
          .setDescription(`ID: ${voiceType} が見つからなかった`);

        message.reply({ embeds: [send] });
        return;
      }

      const saveuser = {
        ...user,
        voice_id: Number.isNaN(voiceType) ? 0 : voiceType,
        voice_speed: Number.isNaN(speedSlace) ? 1.0 : speedSlace,
        voice_pitch: Number.isNaN(pitch) ? 0.0 : pitch,
        voice_intonation: Number.isNaN(intonation) ? 1.0 : intonation,
      };

      await usersRepository.save(saveuser);

      const send = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(`設定完了`)
        .setDescription(`声: ${voiceName}(${voiceType})\nスピード: ${saveuser.voice_speed}`);
      await message.reply({ embeds: [send] });

      break;
    }
    case CONFIG.COMMAND.SPEAKER_CONFIG.COMMAND_RESET: {
      await initializeCoeiroSpeakerIds();
      break;
    }
    case CONFIG.COMMAND.DISCONNECT: {
      const channel = message.member?.voice.channel;
      if (!channel) {
        return;
      }

      await DotBotFunctions.Speak.disconnect(channel);
      break;
    }
  }
}

export async function interactionSelector(interaction: ChatInputCommandInteraction<CacheType>) {
  const { commandName } = interaction;
  await interaction.deferReply();

  switch (commandName) {
    case CONFIG.COMMAND.SPEAK.COMMAND_NAME: {
      await BotFunctions.Speak.CallSpeaker(interaction);
      break;
    }
    case CONFIG.COMMAND.SPEAKER_CONFIG.COMMAND_NAME:
    case CONFIG.COMMAND.SPEAKER_CONFIG.COMMAND_NAME_SHORT: {
      if (!interaction.guild) {
        return;
      }
      const usersRepository = new UsersRepository();
      const user = await usersRepository.get(interaction.guild.id, interaction.user.id);

      const voiceType = interaction.options.getNumber('voice_id');
      const voiceSpeed = interaction.options.getNumber('speed') || 1.0;
      const voicePitch = interaction.options.getNumber('pitch') || 0.0;
      const voiceIntonation = interaction.options.getNumber('intonation') || 1.0;

      if (voiceSpeed < 0.1 || 5.0 < voiceSpeed) {
        await interaction.editReply({ content: 'スピードは0.1から5.0の間で設定してください。' });
        return;
      }

      if (!user) {
        await interaction.editReply({ content: 'ユーザーが見つかりません。' });
        return;
      }

      if (!voiceType) {
        const voiceName = await findVoiceFromId(user.userSetting.voice_id);

        const description = [
          `声: ${voiceName}(${user.userSetting.voice_id})`,
          `スピード: ${user.userSetting.voice_speed}`,
          `ピッチ: ${user.userSetting.voice_pitch}`,
          `抑揚: ${user.userSetting.voice_intonation}`,
        ].join('\n');

        const send = new EmbedBuilder().setColor('#00ffff').setTitle(`現在の設定`).setDescription(description);
        await interaction.editReply({ embeds: [send] });
        return;
      }

      const voiceName = await findVoiceFromId(voiceType);

      if (!voiceName) {
        const send = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle(`エラー`)
          .setDescription(`ID: ${voiceType} が見つからなかった`);

        await interaction.editReply({ embeds: [send] });
        return;
      }

      const saveuser = {
        ...user,
        voice_id: voiceType,
        voice_speed: voiceSpeed,
        voice_pitch: voicePitch,
        voice_intonation: voiceIntonation,
      };

      await usersRepository.save(saveuser);

      const description = [
        `声: ${voiceName}(${voiceType})`,
        `スピード: ${saveuser.voice_speed}`,
        `ピッチ: ${saveuser.voice_pitch}`,
        `抑揚: ${saveuser.voice_intonation}`,
      ].join('\n');

      const send = new EmbedBuilder().setColor('#00ff00').setTitle(`設定完了`).setDescription(description);
      await interaction.editReply({ embeds: [send] });
      break;
    }
    case 'erase': {
      await BotFunctions.Chat.deleteChatData(interaction);
      break;
    }
  }
}
