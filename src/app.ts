import { ChannelType, Message, REST, Routes, SlashCommandBuilder, VoiceBasedChannel } from 'discord.js';
import { commandSelector } from './bot/commands.js';
import 'dayjs/locale/ja';
import { DISCORD_CLIENT } from './constant/constants.js';
import { CONFIG, CommandConfig } from './config/config.js';
import { TypeOrm } from './model/typeorm/typeorm.js';
import * as BotFunctions from './bot/function';
import * as DotBotFunctions from './bot/dot_function';
import * as SpeakService from './bot/service/speakService.js';
import { initJob } from './job/job.js';
import { joinVoiceChannel, leftVoiceChannel } from './bot/dot_function/room.js';
import { fs } from 'mz';
import { SpeakerRepository } from './model/repository/speakerRepository.js';
import { initializeCoeiroSpeakerIds } from './common/common.js';
import { SLASH_COMMANDS } from './constant/slashCommands.js';
import { GuildRepository } from './model/repository/guildRepository.js';
import { Logger } from './common/logger.js';
import { GPTMode, LogLevel } from './type/types.js';

// read config file
const json = process.argv[2];
if (!json) {
    console.error('config file not found');
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(json, 'utf8')) as CommandConfig;

if (!data.COMMAND.SPEAK) {
    console.error('config file not found');
    process.exit(1);
}

CONFIG.TOKEN = data.TOKEN;
CONFIG.APP_ID = data.APP_ID;
CONFIG.COMMAND = data.COMMAND;

console.log('==================================================');

TypeOrm.dataSource
    .initialize()
    .then(async () => {
        await Logger.put({
            guild_id: undefined,
            channel_id: undefined,
            user_id: undefined,
            level: LogLevel.SYSTEM,
            event: 'db-init',
            message: ['success']
        })
    })
    .catch(async (e) => {
        await Logger.put({
            guild_id: undefined,
            channel_id: undefined,
            user_id: undefined,
            level: LogLevel.SYSTEM,
            event: 'db-init',
            message: [e.message]
        });
        return;
    });

/**
 * =======================
 * Bot Process
 * =======================
 */

const commands = SLASH_COMMANDS.map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
DISCORD_CLIENT.login(CONFIG.TOKEN);

/**
 * bot初回読み込み
 */
DISCORD_CLIENT.once('ready', async () => {
    await initJob();
    await initializeCoeiroSpeakerIds();

    // スラッシュコマンドの登録
    rest.put(Routes.applicationCommands(CONFIG.APP_ID), { body: commands }).then(async () => {
        await Logger.put({
            guild_id: undefined,
            channel_id: undefined,
            user_id: undefined,
            level: LogLevel.SYSTEM,
            event: 'reg-command|add',
            message: ['successfully add command to DM.']
        });
    });

    await Logger.put({
        guild_id: undefined,
        channel_id: undefined,
        user_id: undefined,
        level: LogLevel.SYSTEM,
        event: 'ready',
        message: [`discord bot logged in: ${DISCORD_CLIENT.user?.displayName}`]
    });

    const repository = new SpeakerRepository();
    DISCORD_CLIENT.guilds.fetch().then((guilds) => {
        guilds.forEach(async (guild) => {
            await repository.registerSpeaker(guild.id, DISCORD_CLIENT.user!.id);
        });
    });
    setInterval(() => {
        SpeakService.speak();
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
        await Logger.put({
            guild_id: message.guild?.id,
            channel_id: message.channel.id,
            user_id: message.author.id,
            level: LogLevel.SYSTEM,
            event: 'command-received',
            message: [
                `gid: ${message.guild?.id}, gname: ${message.guild?.name}`,
                `cid: ${message.channel.id}, cname: ${message.channel.type !== ChannelType.DM ? message.channel.name : 'DM'
                }`,
                `author : ${message.author.displayName}`,
                `content: ${message.content}`,
            ]
        });
        await commandSelector(message);
        return;
    }

    if (message.content.startsWith(`<@${DISCORD_CLIENT.user?.id}>`) && message.content.trimEnd() !== `<@${DISCORD_CLIENT.user?.id}>`) {
        await DotBotFunctions.Chat.talk(message, message.content, CONFIG.OPENAI.DEFAULT_MODEL, GPTMode.DEFAULT);
        return;
    }

    if (message.channel.type === ChannelType.DM) {
        await DotBotFunctions.Chat.talk(message, message.content, CONFIG.OPENAI.DEFAULT_MODEL, GPTMode.DEFAULT);
        return;
    }

    const state = SpeakService.Speaker.player.find((s) => s.guild_id === message.guild?.id);
    if (!state) {
        if (message.mentions.users.find((x) => x.id === DISCORD_CLIENT.user?.id)) {
            await DotBotFunctions.Speak.CallSpeaker(message, true);
        }
        return;
    }
    if (!state.channel.player) {
        return;
    }

    if (message.channel.type === ChannelType.GuildVoice) {
        if (message.mentions.users.size === 0 && message.mentions.roles.size === 0) {
            await Logger.put({
                guild_id: message.guild?.id,
                channel_id: message.channel.id,
                user_id: message.author.id,
                level: LogLevel.SYSTEM,
                event: 'message-received',
                message: [`author: ${message.author.tag}, content: ${message.content}`]
            });
            await SpeakService.addQueue(message.channel as VoiceBasedChannel, message.content, message.author.id);
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
