import {
    AudioPlayer,
    createAudioPlayer,
    createAudioResource,
    DiscordGatewayAdapterCreator,
    getVoiceConnection,
    joinVoiceChannel,
    NoSubscriberBehavior,
    StreamType
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
    player: AudioPlayer;
    chat: ChatData[];
}
interface ChatData {
    user_id: string;
    channel: VoiceBasedChannel;
    voiceId: number;
    speed: number;
    message: string;
}

/**
 * プレイヤーを更新する
 * @param gid
 * @param uid
 * @param voice
 * @param speed
 * @returns
 */
async function updateAudioPlayer(gid: string): Promise<Player> {
    const PlayerData = Speaker.player.find((p) => p.guild_id === gid);

    if (PlayerData) {
        const index = Speaker.player.findIndex((p) => p === PlayerData);

        Speaker.player[index].player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        return Speaker.player[index];
    }
    const p = {
        guild_id: gid,
        player: createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        }),
        chat: []
    };
    const index = Speaker.player.push(p);
    return Speaker.player[index];
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
    await updateAudioPlayer(channel.guild.id);

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

    const vc = getVoiceConnection(channel.guild.id);

    const voiceName = await findVoiceFromId(user.voice_id);

    const connection = vc
        ? vc
        : joinVoiceChannel({
              adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
              channelId: channel.id,
              guildId: channel.guild.id,
              selfDeaf: true,
              selfMute: false
          });
    const send = new EmbedBuilder()
        .setColor('#00cc88')
        .setAuthor({ name: `読み上げちゃん: ${voiceName}` })
        .setTitle('読み上げを開始します')
        .setDescription('終了する際は `.discon` で終わるよ');

    (channel as VoiceChannel).send({ embeds: [send] });
}

export async function addQueue(channel: VoiceBasedChannel, message: string, uid: string): Promise<void> {
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

    const PlayerData = await updateAudioPlayer(channel.guild.id);
    PlayerData.chat.push({
        user_id: uid,
        channel: channel,
        voiceId: user.voice_id,
        speed: user.voice_speed,
        message: message
    });
}

/**
 * 読み上げる
 */
export async function speak(): Promise<void> {
    Speaker.player.map(async (speaker) => {
        const { guild_id, player, chat } = speaker;
        const vc = getVoiceConnection(guild_id);

        const chatData = chat.shift();

        if (!chatData) {
            return;
        }

        const connection = vc
            ? vc
            : joinVoiceChannel({
                  adapterCreator: chatData.channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
                  channelId: chatData.channel.id,
                  guildId: guild_id,
                  selfDeaf: true,
                  selfMute: false
              });

        if (chatData.message.includes('http')) {
            chatData.message = 'URLです';
        }

        if (chatData.message.length > 200) {
            chatData.message = '長文省略';
        }

        const audioQueryUri = `http://127.0.0.1:50021/audio_query`;
        const synthesisUri = `http://127.0.0.1:50021/synthesis`;

        const audioQuery = (await got
            .post(audioQueryUri, { searchParams: { text: chatData.message, speaker: chatData.voiceId } })
            .json()) as AudioResponse;
        const stream = await got
            .post(synthesisUri, {
                searchParams: { speaker: chatData.voiceId },
                json: { ...audioQuery, speedScale: chatData.speed },
                responseType: 'buffer'
            })
            .buffer();

        const p = await updateAudioPlayer(guild_id);
        const resource = createAudioResource(Readable.from(stream), { inputType: StreamType.Arbitrary });
        p.player.play(resource);
        connection.subscribe(player);
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
