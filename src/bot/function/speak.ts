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
import dayjs from 'dayjs';
import got from 'got';
import { Readable } from 'stream';
import { AudioResponse, SpeakersResponse } from '../../interface/audioResponse';

export class Speaker {
    static player: { id: string; voice: number; speed: number; player: AudioPlayer }[] = [];
}

async function updateAudioPlayer(gid: string, voice?: number, speed?: number): Promise<AudioPlayer> {
    const PlayerData = Speaker.player.find((p) => p.id === gid);

    if (PlayerData) {
        const index = Speaker.player.findIndex((p) => p === PlayerData);
        Speaker.player[index].voice = voice ? voice : Speaker.player[index].voice;
        Speaker.player[index].speed = speed ? speed : Speaker.player[index].speed;
        Speaker.player[index].player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        return Speaker.player[index].player;
    }
    const p = {
        id: gid,
        voice: voice ? voice : 3,
        speed: speed ? speed : 1.0,
        player: createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        })
    };
    Speaker.player.push(p);
    return p.player;
}

async function removeAudioPlayer(gid: string): Promise<void> {
    const PlayerData = Speaker.player.find((p) => p.id === gid);
    if (PlayerData) {
        Speaker.player = Speaker.player.filter((p) => p.id !== gid);
    }
}

export async function ready(channel: VoiceBasedChannel, voice: number, speed?: number): Promise<void> {
    await updateAudioPlayer(channel.guild.id, voice, speed);

    const speakersUri = `http://127.0.0.1:50021/speakers`;
    const speakers = (await got.get(speakersUri).json()) as SpeakersResponse[];

    const isInitializedUri = `http://127.0.0.1:50021/is_initialized_speaker`;

    const isInitialized = (await got.get(isInitializedUri, { searchParams: { speaker: voice } }).json()) as boolean;

    if (!isInitialized) {
        await got.post(`http://127.0.0.1:50021/initialize_speaker`, { searchParams: { speaker: voice } }).json();
    }

    const vc = getVoiceConnection(channel.guild.id);

    let voiceName: string = '不明';
    speakers.map((speaker) => {
        const style = speaker.styles.find((style) => style.id === voice);
        if (style) {
            voiceName = `${speaker.name}/${style.name}`;
        }
    });

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

export async function speak(channel: VoiceBasedChannel, message: string): Promise<void> {
    const vc = getVoiceConnection(channel.guild.id);

    const connection = vc
        ? vc
        : joinVoiceChannel({
              adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
              channelId: channel.id,
              guildId: channel.guild.id,
              selfDeaf: true,
              selfMute: false
          });

    if (message?.includes('http')) {
        message = 'URLです';
    }
    const audioQueryUri = `http://127.0.0.1:50021/audio_query`;
    const synthesisUri = `http://127.0.0.1:50021/synthesis`;
    const saveFileName = dayjs().format('YYYY-MM-DD_HH-mm-ss.wav');
    const PlayerData = Speaker.player.find((p) => p.id === channel.guild.id);

    const audioQuery = (await got
        .post(audioQueryUri, { searchParams: { text: message, speaker: PlayerData?.voice } })
        .json()) as AudioResponse;
    const stream = await got
        .post(synthesisUri, {
            searchParams: { speaker: PlayerData?.voice },
            json: { ...audioQuery, speedScale: PlayerData?.speed },
            responseType: 'buffer'
        })
        .buffer();

    const player = await updateAudioPlayer(channel.guild.id);
    const resource = createAudioResource(Readable.from(stream), { inputType: StreamType.Arbitrary });
    player.play(resource);
    connection.subscribe(player);
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
