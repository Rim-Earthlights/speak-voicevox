import { ChannelType, Message, REST, Routes, SlashCommandBuilder, VoiceBasedChannel } from 'discord.js';
import { commandSelector } from './bot/commands';
import 'dayjs/locale/ja';
import { DISCORD_CLIENT } from './constant/constants';
import { CONFIG } from './config/config';
import * as logger from './common/logger';
import { TypeOrm } from './model/typeorm/typeorm';
import { speak, Speaker } from './bot/function/speak';

/**
 * =======================
 * Bot Process
 * =======================
 */

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('replies with pong'),
    new SlashCommandBuilder()
        .setName('debug')
        .setDescription('debug command. usually not use.')
        .addStringOption((option) => option.setName('url').setDescription('youtube url'))
    // new SlashCommandBuilder().setName('tenki').setDescription('天気予報を表示します'),
    // new SlashCommandBuilder().setName('luck').setDescription('今日の運勢を表示します'),
    // new SlashCommandBuilder().setName('info').setDescription('ユーザ情報を表示します'),
    // new SlashCommandBuilder()
    //     .setName('pl')
    //     .setDescription('音楽を再生します')
    //     .addStringOption((option) => option.setName('url').setDescription('youtube url').setRequired(true))
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);

DISCORD_CLIENT.login(CONFIG.TOKEN);

/**
 * bot初回読み込み
 */
DISCORD_CLIENT.once('ready', async () => {
    TypeOrm.dataSource
        .initialize()
        .then(async () => {
            logger.info('system', 'db-init', 'success');
        })
        .catch((e) => {
            logger.error('system', 'db-init', e);
        });
    console.log('==================================================');
    logger.info(undefined, 'ready', `discord bot logged in: ${DISCORD_CLIENT.user?.tag}`);
});

/**
 * メッセージの受信イベント
 */
DISCORD_CLIENT.on('messageCreate', async (message: Message) => {
    // 発言者がbotの場合は落とす
    if (message.author.bot) {
        return;
    }

    logger.info(
        message.guild ? message.guild.id : 'dm',
        'message-received',
        `author: ${message.author.tag}, content: ${message.content}`
    );

    // command
    if (message.content.startsWith('.')) {
        await commandSelector(message);
        return;
    }
    const state = Speaker.player.find((s) => s.id === message.guild?.id);
    if (!state) {
        return;
    }
    if (!state.player) {
        return;
    }

    if (message.channel.type === ChannelType.GuildVoice) {
        await speak(message.channel as VoiceBasedChannel, message.content);
    }
});
