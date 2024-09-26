import got from "got";
import { AudioResponse } from "../../interface/audioResponse";
import * as Models from "../../model/models";
import { convertMessageWithoutEmoji, convertVoiceId, SPEAKER_IDS } from "../../common/common";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, entersState, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnection } from "@discordjs/voice";
import { EmbedBuilder, VoiceBasedChannel, VoiceChannel } from "discord.js";
import { UsersRepository } from "../../model/repository/usersRepository";
import { Readable } from "stream";
import { SpeakerRepository } from "../../model/repository/speakerRepository";
import { DISCORD_CLIENT } from "../../constant/constants";
import { Logger } from "../../common/logger";
import { LogLevel } from "../../type/types";

export const Speaker = {
  player: [] as Player[]
};

export interface Player {
  guild_id: string;
  channel: ChannelPlayer;
}

export interface ChannelPlayer {
  id: string;
  connection: VoiceConnection;
  player: AudioPlayer;
  status: AudioPlayerStatus;
  chat: ChatData[];
}

export interface ChatData {
  user_id: string;
  message: Buffer;
}

/**
 * プレイヤーを初期化する
 * @param gid
 * @param channel
 * @returns
 */
export async function initAudioPlayer(gid: string, channel: VoiceBasedChannel): Promise<Player | null> {
  if (Speaker.player.find((p) => p.guild_id === gid)) {
    Logger.put({
      guild_id: gid,
      channel_id: channel.id,
      user_id: 'system',
      level: LogLevel.INFO,
      event: 'initAudioPlayer',
      message: [`Player already exists`]
    });
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
  return Speaker.player.find((p) => p.guild_id === gid)!;
}



/**
 * initialize speaker
 * @param id speaker_id
 */
export const initialize = async (id: number): Promise<void> => {
  const isInitializedUri = `http://127.0.0.1:50021/is_initialized_speaker`;

  if (id < 1000) {
    const isInitialized = (await got
      .get(isInitializedUri, { searchParams: { speaker: id } })
      .json()) as boolean;

    if (!isInitialized) {
      await got
        .post(`http://127.0.0.1:50021/initialize_speaker`, { searchParams: { speaker: id } })
        .json();
    }
  }
}

/**
 * プレイヤーを更新する
 * @param gid
 * @param cid
 * @returns
 */
export async function getAudioPlayer(gid: string, channel: VoiceBasedChannel): Promise<Player | null> {
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
  if (message.length > 50) {
    if (message.indexOf('^') !== 0) {
      message = '長文省略';
    }
  }

  if (!PlayerData) {
    return;
  }

  if (PlayerData.channel.id !== channel.id) {
    return;
  }

  message = convertMessageWithoutEmoji(message);

  if (message.length === 0) {
    return;
  }

  const stream = await audioQuery(user, message);

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



/**
 * 音声を合成してストリームを返す
 * @param user
 * @param message
 * @param flag
 */
export const audioQuery = async (user: Models.Users, message: string): Promise<Buffer> => {
  const audioQueryUri = `http://127.0.0.1:50021/audio_query`;
  const synthesisUri = `http://127.0.0.1:50021/synthesis`;

  const coeiroSynthesisUri = `http://127.0.0.1:50032/v1/synthesis`;

  if (user.voice_id < 1000) {
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

    return stream;
  } else {
    const speaker = SPEAKER_IDS.find((speaker) => speaker.styleId === user.voice_id - 1000);
    if (!speaker) {
      return Buffer.from([]);
    }

    const stream = await got
      .post(coeiroSynthesisUri, {
        json: {
          "speakerUuid": speaker.uuid,
          "styleId": speaker.styleId,
          "text": message,
          "speedScale": user.voice_speed,
          "volumeScale": 1.0,
          "pitchScale": 0,
          "intonationScale": 1.0,
          "prePhonemeLength": 1.0,
          "postPhonemeLength": 1.0,
          "outputSamplingRate": 44100
        },
        responseType: 'buffer'
      })
      .buffer();
    return stream;
  }
};

