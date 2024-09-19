import { ChannelType, Message, REST, SlashCommandBuilder, VoiceBasedChannel } from 'discord.js';
import { CallSpeaker, commandSelector } from './bot/commands.js';
import 'dayjs/locale/ja';
import { DISCORD_CLIENT } from './constant/constants.js';
import { CONFIG, CommandConfig } from './config/config.js';
import * as logger from './common/logger.js';
import { TypeOrm } from './model/typeorm/typeorm.js';
import { addQueue, speak, Speaker } from './bot/function/speak.js';
import { initJob } from './job/job.js';
import { joinVoiceChannel, leftVoiceChannel } from './bot/function/room.js';
import { fs } from 'mz';
import { SpeakerRepository } from './model/repository/speakerRepository.js';
import { initializeCoeiroSpeakerIds } from './common/common.js';

// read config file
const json = process.argv[2];
if (!json) {
    logger.error('system', 'app', 'config file not found');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(json, 'utf8')) as CommandConfig;

if (!data.COMMAND.SPEAK) {
    logger.error('system', 'app', 'config file not found');
    process.exit(1);
}

CONFIG.TOKEN = data.TOKEN;
CONFIG.COMMAND = data.COMMAND;

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
    console.log('==================================================');
    TypeOrm.dataSource
        .initialize()
        .then(async () => {
            logger.info('system', 'db-init', 'success');
        })
        .catch((e) => {
            logger.error('system', 'db-init', e);
        });
    await initJob();
    await initializeCoeiroSpeakerIds();
    logger.info(undefined, 'ready', `discord bot logged in: ${DISCORD_CLIENT.user?.tag}`);
    const repository = new SpeakerRepository();
    DISCORD_CLIENT.guilds.fetch().then((guilds) => {
        guilds.forEach(async (guild) => {
            await repository.registerSpeaker(guild.id, DISCORD_CLIENT.user!.id);
        });
    });
    setInterval(() => {
        speak();
    }, 100);
});

/**
 * メッセージの受信イベント
 */
DISCORD_CLIENT.on('messageCreate', async (message: Message) => {
    // 発言者がbotの場合は落とす
    if (message.author.bot) {
        return;
    }

    // command
    if (message.content.startsWith('.')) {
        await logger.info(
            message.guild ? message.guild.id : 'dm',
            'command-received',
            `author: ${message.author.displayName}, content: ${message.content}`
        );
        await commandSelector(message);
        return;
    }
    const state = Speaker.player.find((s) => s.guild_id === message.guild?.id);
    if (!state) {
        if (message.mentions.users.find((x) => x.id === DISCORD_CLIENT.user?.id)) {
            await CallSpeaker(message, true);
        }
        return;
    }
    if (!state.channel.player) {
        return;
    }

    if (message.channel.type === ChannelType.GuildVoice) {
        if (message.mentions.users.size === 0 && message.mentions.roles.size === 0) {
            await logger.info(
                message.guild ? message.guild.id : 'dm',
                'message-received',
                `author: ${message.author.tag}, content: ${message.content}`
            );
            await addQueue(message.channel as VoiceBasedChannel, message.content, message.author.id);
        }
    }
});

DISCORD_CLIENT.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.channelId === newState.channelId) {
        return;
    }

    if (newState.channelId === null) {
        await leftVoiceChannel(oldState);
    } else if (oldState.channelId === null) {
        await joinVoiceChannel(newState);
    } else {
        await leftVoiceChannel(oldState, newState);
        await joinVoiceChannel(newState);
    }
});
