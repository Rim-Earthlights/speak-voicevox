import { VoiceChannel, VoiceState } from 'discord.js';
import { Speaker, addQueue } from './speak';
import { getVoiceConnection } from '@discordjs/voice';
import * as logger from '../../common/logger';
import { SpeakerRepository } from '../../model/repository/speakerRepository';
import { DISCORD_CLIENT } from '../../constant/constants';

/**
 * ボイスチャンネルから切断した時の処理
 * @param voiceState VoiceState
 * @returns void
 */
export async function leftVoiceChannel(voiceState: VoiceState): Promise<void> {
    const vc = voiceState.channel as VoiceChannel;
    if (vc == null || vc.members.size === 0) {
        return;
    }
    const bot = vc.members.filter((m) => m.user.bot);
    if (bot.size === vc.members.size) {
        const connection = getVoiceConnection(voiceState.guild.id);
        try {
            const speaker = Speaker.player.find((p) => p.guild_id === voiceState.guild.id);
            if (speaker) {
                Speaker.player = Speaker.player.filter((p) => p.guild_id !== voiceState.guild.id);
            }
            if (connection) {
                connection.destroy();
            }
            const repository = new SpeakerRepository();
            await repository.updateUsedSpeaker(voiceState.guild.id, DISCORD_CLIENT.user!.id, false);
        } catch (e) {
            const error = e as Error;
            logger.error(voiceState.guild.id, 'voiceStateUpdate', error.message);
        }
    } else {
        const connection = getVoiceConnection(voiceState.guild.id);
        if (!connection) {
            return;
        }

        // const speaker = Speaker.player.find((p) => p.guild_id === voiceState.guild.id);
        // if (speaker) {
        //     if (voiceState.member) {
        //         await addQueue(
        //             voiceState.channel as VoiceChannel,
        //             `${voiceState.member.displayName}さんが退室しました`,
        //             DISCORD_CLIENT.user!.id
        //         );
        //     }
        // }
    }
}

/**
 * ボイスチャンネルに接続した時の処理
 * @param guild サーバ情報
 * @param voiceState VoiceState
 * @returns void
 */
export async function joinVoiceChannel(voiceState: VoiceState): Promise<void> {
    const connection = getVoiceConnection(voiceState.guild.id);

    if (voiceState.member?.user.bot) {
        return;
    }

    if (!connection) {
        return;
    }

    // const speaker = Speaker.player.find((p) => p.guild_id === voiceState.guild.id);
    // if (speaker) {
    //     if (voiceState.member) {
    //         await addQueue(
    //             voiceState.channel as VoiceChannel,
    //             `${voiceState.member.displayName}さんが入室しました`,
    //             DISCORD_CLIENT.user!.id
    //         );
    //     }
    // }
}
