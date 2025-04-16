import express from 'express';
import { initAudioPlayer } from '../bot/service/speakService';
import { DISCORD_CLIENT } from '../constant/constants';
import { SpeakerRepository } from '../model/repository/speakerRepository';

export const speakerController = express.Router();

interface SpeakerInitRequest {
  guildId: string;
  channelId: string;
}

/**
 * 読み上げbotの使用状況を取得する
 * @param req
 * @param res
 * @returns 利用されていればtrue, 利用されていない場合はfalse
 */
speakerController.get('/speaker/status/:guildId', async (req, res) => {
  const { guildId } = req.params;
  if (!guildId) {
    res.status(400).send('Guild ID is required');
  }

  const repository = new SpeakerRepository();
  const speaker = await repository.getStatus(guildId);
  res.send({
    guildId,
    used: speaker ? 'true' : 'false',
  });
});

/**
 * 読み上げbotを呼び出す
 * @param req
 * @param res
 */
speakerController.post('/speaker/call', async (req, res) => {
  const { guildId, channelId } = req.body;
  if (!guildId || !channelId) {
    res.status(400).send('Guild ID and Channel ID are required');
    return;
  }

  const repository = new SpeakerRepository();
  const speaker = await repository.getStatus(guildId);
  if (speaker) {
    res.status(409).send('Speaker is already used');
    return;
  }

  const channel = await DISCORD_CLIENT.channels.fetch(channelId);
  if (!channel) {
    res.status(404).send('Channel not found');
    return;
  }

  const voiceChannel = channel.isVoiceBased() ? channel : null;
  if (!voiceChannel) {
    res.status(400).send('Channel is not a voice channel');
    return;
  }

  const player = await initAudioPlayer(guildId, voiceChannel);
  if (!player) {
    res.status(500).send('Failed to initialize audio player');
    return;
  }

  await repository.updateUsedSpeaker(guildId, DISCORD_CLIENT.user!.id, true);

  res.status(201).send({
    status: 'success',
  });
});
