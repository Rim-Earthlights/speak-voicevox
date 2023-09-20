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
import { AudioResponse } from '../../interface/audioResponse';
import { UsersRepository } from '../../model/repository/usersRepository';
import { CONFIG } from '../../config/config';
import * as logger from '../../common/logger.js';
import { SpeakerRepository } from '../../model/repository/speakerRepository';
import { DISCORD_CLIENT } from '../../constant/constants';


export const Speaker = {
    player: [] as Player[]
};

interface Player {
    guild_id: string;
    channel: ChannelPlayer;
}

interface ChannelPlayer {
    id: string;
    connection: VoiceConnection;
    player: AudioPlayer;
    status: AudioPlayerStatus;
    chat: ChatData[];
}

interface ChatData {
    user_id: string;
    message: Buffer;
}

async function initAudioPlayer(gid: string, channel: VoiceBasedChannel): Promise<Player | null> {
    if (Speaker.player.find((p) => p.guild_id === gid)) {
        logger.info(gid, 'initAudioPlayer', JSON.stringify(Speaker.player.find((p) => p.guild_id === gid)));
        return null;
    }

    const p = {
        guild_id: gid,
        channel: {
            id: channel.id,
            connection: joinVoiceChannel({
                adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
                channelId: channel.id,
                guildId: channel.guild.id,
                selfDeaf: true,
                selfMute: false
            }),
            player: createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Stop
                }
            }),
            status: AudioPlayerStatus.Idle,
            chat: []
        }
    };
    p.channel.connection.subscribe(p.channel.player);
    Speaker.player.push(p);
    return Speaker.player.find(p => p.guild_id === gid)!;
}
/**
 * プレイヤーを更新する
 * @param gid
 * @param cid
 * @returns
 */
async function getAudioPlayer(gid: string, channel: VoiceBasedChannel): Promise<Player | null> {

    const PlayerData = Speaker.player.find((p) => p.guild_id === gid && p.channel.id === channel.id);
    if (PlayerData) {
        return PlayerData;
    }

    return null;
}

/**
 * プレイヤーを削除する
 * @param gid
 */
export async function removeAudioPlayer(channel: VoiceBasedChannel): Promise<boolean> {
    const PlayerData = Speaker.player.find((p) => p.guild_id === channel.guild.id);
    if (PlayerData) {
        Speaker.player = Speaker.player.filter((p) => p.guild_id !== channel.guild.id);
    }
    return true;
}

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
    const isInitializedUri = `http://127.0.0.1:50021/is_initialized_speaker`;

    const isInitialized = (await got
        .get(isInitializedUri, { searchParams: { speaker: user.voice_id } })
        .json()) as boolean;

    if (!isInitialized) {
        await got
            .post(`http://127.0.0.1:50021/initialize_speaker`, { searchParams: { speaker: user.voice_id } })
            .json();
    }

    const p = await initAudioPlayer(channel.guild.id, channel);

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

    const repository = new SpeakerRepository();
    await repository.updateUsedSpeaker(channel.guild.id, DISCORD_CLIENT.user!.id, true);

    (channel as VoiceChannel).send({ embeds: [send] });
}

export async function addQueue(channel: VoiceBasedChannel, message: string, uid: string): Promise<void> {
    const PlayerData = await getAudioPlayer(channel.guild.id, channel);

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

    if (!PlayerData) {
        return;
    }

    if (PlayerData.channel.id !== channel.id) {
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


    PlayerData.channel.chat.push({
        user_id: uid,
        message: stream
    });
}

/**
 * 読み上げる
 */
export async function speak(): Promise<void> {
    Speaker.player.map(async (speaker) => {
        if (speaker.channel.status !== AudioPlayerStatus.Idle) {
            return;
        }

        const chatData = speaker.channel.chat.shift();
        if (!chatData) {
            return;
        }

        speaker.channel.status = AudioPlayerStatus.Playing;

        const resource = createAudioResource(Readable.from(chatData.message), { inputType: StreamType.Arbitrary });
        speaker.channel.player.play(resource);

        await entersState(speaker.channel.player, AudioPlayerStatus.Playing, 1000);
        await entersState(speaker.channel.player, AudioPlayerStatus.Idle, 24 * 60 * 60 * 1000);
        speaker.channel.status = AudioPlayerStatus.Idle;
    });
}

export async function disconnect(channel: VoiceBasedChannel): Promise<void> {
    const playerData = await getAudioPlayer(channel.guild.id, channel);
    if (!playerData) {
        return;
    }

    const repository = new SpeakerRepository();
    await repository.updateUsedSpeaker(channel.guild.id, DISCORD_CLIENT.user!.id, false);

    await removeAudioPlayer(channel);

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
