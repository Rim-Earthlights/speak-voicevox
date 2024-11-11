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
  supported_features: {
    permitted_synthesis_morphing: 'ALL' | 'SELF_ONLY';
  };
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

export interface CoeiroSpeakersResponse {
  speakerName: string;
  speakerUuid: string;
  styles: [
    {
      styleName: string;
      styleId: number;
      base64Icon: string;
      base64Portrait: string;
    }
  ];
  version: string;
  base64Portrait: string;
}
