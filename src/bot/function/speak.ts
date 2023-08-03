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
import { EmbedBuilder, VoiceBasedChannel, VoiceChannel } from 'discord.js';
import got from 'got';
import { Readable } from 'stream';
import { AudioResponse, SpeakersResponse } from '../../interface/audioResponse';
import { UsersRepository } from '../../model/repository/usersRepository';
import { findVoiceFromId } from '../../common/common';

export class Speaker {
    static player: Player[] = [];
}

interface Player {
    guild_id: string;
    channel_id: string;
    connection: VoiceConnection;
    player: AudioPlayer;
    status: AudioPlayerStatus;
    chat: ChatData[];
}
interface ChatData {
    user_id: string;
    channel: VoiceBasedChannel;
    message: Buffer;
}

/**
 * プレイヤーを更新する
 * @param gid
 * @param cid
 * @returns
 */
async function updateAudioPlayer(gid: string, channel: VoiceBasedChannel): Promise<Player> {
    const PlayerData = Speaker.player.find((p) => p.guild_id === gid);

    if (PlayerData) {
        const index = Speaker.player.findIndex((p) => p === PlayerData);
        return Speaker.player[index];
    }
    const p = {
        guild_id: gid,
        channel_id: channel.id,
        connection: joinVoiceChannel({
            adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
            channelId: channel.id,
            guildId: channel.guild.id,
            selfDeaf: true,
            selfMute: false
        }),
        player: createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        }),
        status: AudioPlayerStatus.Idle,
        chat: []
    };
    p.connection.subscribe(p.player);
    const index = Speaker.player.push(p);
    return Speaker.player[index - 1];
}

/**
 * プレイヤーを削除する
 * @param gid
 */
async function removeAudioPlayer(gid: string): Promise<void> {
    const PlayerData = Speaker.player.find((p) => p.guild_id === gid);
    if (PlayerData) {
        Speaker.player = Speaker.player.filter((p) => p.guild_id !== gid);
    }
}

export async function ready(channel: VoiceBasedChannel, uid: string): Promise<void> {
    const usersRepository = new UsersRepository();
    const user = await usersRepository.get(uid);

    if (!user) {
        const send = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`エラー`)
            .setDescription(`ユーザーが見つからなかった`);
        channel.send({ embeds: [send] });
        return;
    }
    const isInitializedUri = `http://127.0.0.1:50021/is_initialized_speaker`;

    const isInitialized = (await got
        .get(isInitializedUri, { searchParams: { speaker: user.voice_id } })
        .json()) as boolean;

    if (!isInitialized) {
        await got
            .post(`http://127.0.0.1:50021/initialize_speaker`, { searchParams: { speaker: user.voice_id } })
            .json();
    }

    const p = await updateAudioPlayer(channel.guild.id, channel);

    const send = new EmbedBuilder()
        .setColor('#00cc88')
        .setAuthor({ name: `読み上げちゃん` })
        .setTitle('読み上げを開始します')
        .setDescription('終了する際は `.discon` で終わるよ');

    (channel as VoiceChannel).send({ embeds: [send] });
}

export async function addQueue(channel: VoiceBasedChannel, message: string, uid: string): Promise<void> {
    const PlayerData = await updateAudioPlayer(channel.guild.id, channel);

    const usersRepository = new UsersRepository();
    const user = await usersRepository.get(uid);

    if (!user) {
        const send = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle(`エラー`)
            .setDescription(`ユーザーが見つからなかった`);
        channel.send({ embeds: [send] });
        return;
    }

    if (message.includes('http')) {
        message = 'URLです';
    }

    if (message.length > 200) {
        message = '長文省略';
    }

    if (PlayerData.channel_id !== channel.id) {
        return;
    }

    const audioQueryUri = `http://127.0.0.1:50021/audio_query`;
    const synthesisUri = `http://127.0.0.1:50021/synthesis`;

    const audioQuery = (await got
        .post(audioQueryUri, { searchParams: { text: message, speaker: user.voice_id } })
        .json()) as AudioResponse;
    const stream = await got
        .post(synthesisUri, {
            searchParams: { speaker: user.voice_id },
            json: { ...audioQuery, speedScale: user.voice_speed },
            responseType: 'buffer'
        })
        .buffer();


    PlayerData.chat.push({
        user_id: uid,
        channel: channel,
        message: stream
    });
}

/**
 * 読み上げる
 */
export async function speak(): Promise<void> {
    Speaker.player.map(async (speaker) => {
        const { player, chat } = speaker;

        if (speaker.status === AudioPlayerStatus.Playing) {
            return;
        }

        if (player.state.status !== AudioPlayerStatus.Idle) {
            return;
        }

        const chatData = chat.shift();
        if (!chatData) {
            return;
        }

        speaker.status = AudioPlayerStatus.Playing;

        const resource = createAudioResource(Readable.from(chatData.message), { inputType: StreamType.Arbitrary });
        player.play(resource);

        Promise.all([entersState(player, AudioPlayerStatus.Playing, 10 * 1000)]).then(function () {
            speaker.status = AudioPlayerStatus.Idle;
        });
    });
}

export async function disconnect(channel: VoiceBasedChannel): Promise<void> {
    await removeAudioPlayer(channel.guild.id);

    const connection = getVoiceConnection(channel.guild.id);
    if (connection) {
        connection.destroy();
    }
    const send = new EmbedBuilder()
        .setColor('#00cc88')
        .setAuthor({ name: `読み上げちゃん` })
        .setTitle('読み上げ終了')
        .setDescription('またね！');

    (channel as VoiceChannel).send({ embeds: [send] });
}
