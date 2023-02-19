export interface AudioResponse {
    accent_phrases: [
        {
            moras: [
                {
                    text: string;
                    consonant: string;
                    consonant_length: number;
                    vowel: string;
                    vowel_length: number;
                    pitch: number;
                }
            ];
            accent: number;
            pause_mora: string | null;
            is_interrogative: boolean;
        }
    ];
    speedScale: number;
    pitchScale: number;
    intonationScale: number;
    volumeScale: number;
    prePhonemeLength: number;
    postPhonemeLength: number;
    outputSamplingRate: number;
    outputStereo: boolean;
    kana: string;
}
export interface SpeakersResponse {
    name: string;
    speaker_uuid: string;
    styles: [
        {
            name: string;
            id: number;
        }
    ];
    version: string;
}
