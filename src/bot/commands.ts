import { EmbedBuilder, Message } from 'discord.js';
import * as BotFunctions from './function';
import { UsersRepository } from '../model/repository/usersRepository';
import got from 'got';
import { SpeakersResponse } from '../interface/audioResponse';
import { findVoiceFromId } from '../common/common';

/**
 * 渡されたコマンドから処理を実行する
 *
 * @param command 渡されたメッセージ
 */
export async function commandSelector(message: Message) {
    const content = message.content.replace('.', '').trimEnd().split(' ');
    const command = content[0];
    content.shift();
    switch (command) {
        case 'speak': {
            const channel = message.member?.voice.channel;

            if (!channel) {
                const send = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle(`エラー`)
                    .setDescription(`userのボイスチャンネルが見つからなかった`);

                message.reply({ content: `ボイスチャンネルに入ってから使って～！`, embeds: [send] });
                return;
            }

            await BotFunctions.Speak.ready(channel, message.author.id);
            break;
        }
        case 'speaker-config': {
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
            message.reply({ embeds: [send] });

            break;
        }
        case 'discon': {
            const channel = message.member?.voice.channel;
            if (!channel) {
                return;
            }

            await BotFunctions.Speak.disconnect(channel);
        }
    }
}
