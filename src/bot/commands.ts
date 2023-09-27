import { ChannelType, EmbedBuilder, Message } from 'discord.js';
import * as BotFunctions from './function';
import { UsersRepository } from '../model/repository/usersRepository';
import got from 'got';
import { SpeakersResponse } from '../interface/audioResponse';
import { findVoiceFromId } from '../common/common';
import { CONFIG } from '../config/config';
import { SpeakerRepository } from '../model/repository/speakerRepository';
import { DISCORD_CLIENT } from '../constant/constants';

/**
 * 渡されたコマンドから処理を実行する
 *
 * @param command 渡されたメッセージ
 */
export async function commandSelector(message: Message) {
    if (!message.guild || !DISCORD_CLIENT.user) {
        return;
    }
    const content = message.content.replace('.', '').trimEnd().split(' ');
    const command = content[0];
    content.shift();
    switch (command) {
        case CONFIG.COMMAND.SPEAK: {
            await CallSpeaker(message);
        }
        case CONFIG.COMMAND.SPEAKER_CONFIG.SPEAKER_CONFIG:
        case CONFIG.COMMAND.SPEAKER_CONFIG.SPEAKER_CONFIG_SHORT: {
            if (!CONFIG.COMMAND.SPEAKER_CONFIG.ENABLE) {
                return;
            }
            const usersRepository = new UsersRepository();
            const user = await usersRepository.get(message.author.id);

            const voiceType = Number(content[0]);
            const speedSlace = Number(content[1]);

            if (!user) {
                const send = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`エラー`)
                    .setDescription(`ユーザーが見つからなかった`);

                message.reply({ embeds: [send] });
                return;
            }

            if (!voiceType && !speedSlace) {
                const voiceName = await findVoiceFromId(user.voice_id);

                const send = new EmbedBuilder()
                    .setColor('#00ffff')
                    .setTitle(`現在の設定`)
                    .setDescription(`ボイスタイプ: ${voiceName}(${user.voice_id})\nスピード: ${user.voice_speed}`);
                await message.reply({ embeds: [send] });
                return;
            }


            const saveuser = {
                ...user,
                voice_id: Number.isNaN(voiceType) ? 0 : voiceType,
                voice_speed: Number.isNaN(speedSlace) ? 1.0 : speedSlace
            };

            await usersRepository.save(saveuser);

            const voiceName = await findVoiceFromId(Number.isNaN(voiceType) ? 0 : voiceType);

            const send = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle(`設定完了`)
                .setDescription(`ボイスタイプ: ${voiceName}\nスピード: ${saveuser.voice_speed}`);
            await message.reply({ embeds: [send] });

            break;
        }
        case CONFIG.COMMAND.DISCONNECT: {
            const channel = message.member?.voice.channel;
            if (!channel) {
                return;
            }

            await BotFunctions.Speak.disconnect(channel);
        }
    }
}

export async function CallSpeaker(message: Message, isForce = false) {
    if (!message.guild || !DISCORD_CLIENT.user) {
        return;
    }

    const repository = new SpeakerRepository();
    const self = await repository.getSpeaker(message.guild.id, DISCORD_CLIENT.user.id);
    const speaker = await repository.getUnusedSpeaker(message.guild.id);

    if (isForce) {
        if (!self?.is_used) {
            const channel = message.member?.voice.channel;
            if (channel) {
                await BotFunctions.Speak.ready(channel, message.author.id);
            }
            return;
        }
    }

    if (!speaker) {
        const send = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`エラー`)
            .setDescription(`呼び出せるbotが見つからなかった`);

        await message.reply({ embeds: [send] });
        return;
    }
    if (speaker.user_id !== DISCORD_CLIENT.user.id) {
        return;
    }

    setTimeout(() => null, 200);

    const channel = message.member?.voice.channel;

    if (!channel) {
        const send = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`エラー`)
            .setDescription(`userのボイスチャンネルが見つからなかった`);

        await message.reply({ content: `ボイスチャンネルに入ってから使って～！`, embeds: [send] });
        return;
    }

    await BotFunctions.Speak.ready(channel, message.author.id);
}