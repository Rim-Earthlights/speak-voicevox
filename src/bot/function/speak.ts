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
import { VoiceBasedChannel } from 'discord.js';
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
}

export async function speak(channel: VoiceBasedChannel, message: string | null): Promise<void> {
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

export async function disconnect(gid: string): Promise<void> {
    await removeAudioPlayer(gid);

    const connection = getVoiceConnection(gid);
    if (connection) {
        connection.destroy();
    }
}
