import {
    AudioPlayer,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    DiscordGatewayAdapterCreator,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnection
} from '@discordjs/voice';
import { EmbedBuilder, Message, VoiceBasedChannel, VoiceChannel } from 'discord.js';
import got from 'got';
import { Readable } from 'stream';
import { AudioResponse } from '../../interface/audioResponse';
import { UsersRepository } from '../../model/repository/usersRepository';
import { CONFIG } from '../../config/config';
import * as logger from '../../common/logger.js';
import { SpeakerRepository } from '../../model/repository/speakerRepository';
import { DISCORD_CLIENT } from '../../constant/constants';
import { convertMessageWithoutEmoji } from '../../common/common';
import * as SpeakService from '../speaker/speakService';

/**
 * 読み上げを呼び出す
 * @param message メッセージ
 * @param isForce 強制起動
 * @returns void
 */
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
                await ready(channel, message.author.id);
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

    const channel = message.member?.voice.channel;

    if (!channel) {
        const send = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`エラー`)
            .setDescription(`userのボイスチャンネルが見つからなかった`);

        await message.reply({ content: `ボイスチャンネルに入ってから使って～！`, embeds: [send] });
        return;
    }

    await ready(channel, message.author.id);
}

/**
 * 読み上げを開始する
 * @param channel ボイスチャンネル
 * @param uid ユーザーID
 * @returns void
 */
export async function ready(channel: VoiceBasedChannel, uid: string): Promise<void> {
    const usersRepository = new UsersRepository();
    const user = await usersRepository.get(uid);

    if (!user) {
        if (CONFIG.COMMAND.SPEAKER_CONFIG.ENABLE) {
            const send = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle(`エラー`)
                .setDescription(`ユーザーが見つからなかった`);
            channel.send({ embeds: [send] });
        }
        return;
    }

    await SpeakService.initialize(user.voice_id);

    const p = await SpeakService.initAudioPlayer(channel.guild.id, channel);

    if (!p) {
        const send = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`エラー`)
            .setDescription(`他の場所で読み上げちゃんが起動中だよ`);
        channel.send({ embeds: [send] });
        return;
    }

    const send = new EmbedBuilder()
        .setColor('#00cc88')
        .setAuthor({ name: `読み上げちゃん` })
        .setTitle('読み上げを開始します')
        .setDescription(`終了する際は \`.${CONFIG.COMMAND.DISCONNECT}\` で終わるよ`);

    (channel as VoiceChannel).send({ embeds: [send] });

    setTimeout(() => { }, CONFIG.COMMAND.SPEAK.SLEEP_TIME * 1000);
    const repository = new SpeakerRepository();
    await repository.updateUsedSpeaker(channel.guild.id, DISCORD_CLIENT.user!.id, true);
}

/**
 * 読み上げを終了する
 * @param channel ボイスチャンネル
 * @returns void
 */
export async function disconnect(channel: VoiceBasedChannel): Promise<void> {
    const playerData = await SpeakService.getAudioPlayer(channel.guild.id, channel);
    if (!playerData) {
        return;
    }

    const repository = new SpeakerRepository();
    await repository.updateUsedSpeaker(channel.guild.id, DISCORD_CLIENT.user!.id, false);

    await SpeakService.removeAudioPlayer(channel);

    const connection = getVoiceConnection(channel.guild.id);
    if (connection) {
        connection.destroy();
    }
    const send = new EmbedBuilder()
        .setColor('#00cc88')
        .setAuthor({ name: `読み上げちゃん` })
        .setTitle('読み上げ終了')
        .setDescription('またね！');

    await (channel as VoiceChannel).send({ embeds: [send] });
}