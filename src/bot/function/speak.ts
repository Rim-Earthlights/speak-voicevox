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
import { AudioResponse } from '../../interface/audioResponse';

export class Speaker {
    static player: { id: string; voice: number; player: AudioPlayer }[] = [];
}

async function getAudioPlayer(gid: string, voice: number): Promise<AudioPlayer> {
    let PlayerData = Speaker.player.find((p) => p.id === gid);

    if (!PlayerData) {
        PlayerData = { id: gid, voice: voice, player: createAudioPlayer() };
        Speaker.player.push(PlayerData);
    }
    return PlayerData.player;
}

async function updateAudioPlayer(gid: string): Promise<AudioPlayer> {
    const PlayerData = Speaker.player.find((p) => p.id === gid);

    if (PlayerData) {
        const index = Speaker.player.findIndex((p) => p === PlayerData);
        Speaker.player[index].player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause
            }
        });
        return Speaker.player[index].player;
    }
    const p = {
        id: gid,
        voice: 0,
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

export async function ready(channel: VoiceBasedChannel, voice: number): Promise<void> {
    await getAudioPlayer(channel.guild.id, voice);

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
    const send = new EmbedBuilder()
        .setColor('#00cc88')
        .setAuthor({ name: `読み上げちゃん` })
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

    const audioQuery = await got
        .post(audioQueryUri, { searchParams: { text: message, speaker: PlayerData?.voice } })
        .json();
    console.log(JSON.stringify(audioQuery));
    const stream = await got
        .post(synthesisUri, {
            searchParams: { speaker: PlayerData?.voice },
            json: audioQuery,
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
