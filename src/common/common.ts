import got from 'got';
import { SpeakersResponse } from '../interface/audioResponse';

/**
 * ボイス名をIDから取得する
 * @param id
 * @returns
 */
export const findVoiceFromId = async (id: number): Promise<string | null> => {
    const speakersUri = `http://127.0.0.1:50021/speakers`;
    const speakers = (await got.get(speakersUri).json()) as SpeakersResponse[];

    let voiceName: string | null = null;
    speakers.map((speaker) => {
        const style = speaker.styles.find((style) => style.id === id);
        if (style) {
            voiceName = `${speaker.name}/${style.name}`;
        }
    });
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
