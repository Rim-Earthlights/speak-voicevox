import got from "got";
import { AudioResponse } from "../../interface/audioResponse";
import * as Models from "../../model/models";
import { convertVoiceId, SPEAKER_IDS } from "../../common/common";

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
 * 音声を合成してストリームを返す
 * @param user
 * @param message
 * @param flag
 */
export const audioQuery = async (user: Models.Users, message: string, flag?: boolean, uuid?: string): Promise<Buffer> => {
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
        json: { ...audioQuery, speedScale: flag ? 1.3 : user.voice_speed },
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
          "styleId": convertVoiceId(speaker.styleId),
          "text": message,
          "speedScale": flag ? 1.3 : user.voice_speed,
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