import got from 'got';
import { CoeiroSpeakersResponse, SpeakersResponse } from '../interface/audioResponse';


export let SPEAKER_IDS: { uuid: string; styleId: number }[] = [];

/**
 * ボイス名をIDから取得する
 * @param id
 * @returns
 */
export const findVoiceFromId = async (id: number): Promise<string | null> => {
    const speakersUri = `http://127.0.0.1:50021/speakers`;
    const coeiroUri = `http://127.0.0.1:50032/v1/speakers`;
    const speakers = (await got.get(speakersUri).json()) as SpeakersResponse[];
    const coeiro = (await got.get(coeiroUri).json()) as CoeiroSpeakersResponse[];

    let voiceName: string | null = null;
    if (id < 1000) {
        speakers.map((speaker) => {
            const style = speaker.styles.find((style) => style.id === id);
            if (style) {
                voiceName = `${speaker.name}/${style.name}`;
            }
        });
    } else {
        coeiro.map((speaker) => {
            const style = speaker.styles.find((style) => style.styleId === id - 1000);
            if (style) {
                voiceName = `${speaker.speakerName}/${style.styleName}`;
            }
        });
    }

    return voiceName;
};

/**
 * メッセージから絵文字を削除する
 * @param message メッセージ
 * @returns 削除後のメッセージ
 */
export const convertMessageWithoutEmoji = (message: string): string => {
    return message.replace(/<(a|):[^<>]*>/g, '');
};

export const convertVoiceId = (id: number): number => {
    if (id >= 1000) {
        return id - 1000;
    }
    return id;
};

export const initializeCoeiroSpeakerIds = async () => {
    SPEAKER_IDS = [];
    const coeiroUri = `http://127.0.0.1:50032/v1/speakers`;
    const coeiro = (await got.get(coeiroUri).json()) as CoeiroSpeakersResponse[];

    coeiro.map((speaker) => {
        speaker.styles.map((style) => {
            SPEAKER_IDS.push({ uuid: speaker.speakerUuid, styleId: style.styleId });
        });
    });
};