import 'dayjs/locale/ja';
import {
  ChannelType,
  Message,
  REST,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  Routes,
  SlashCommandBuilder,
  VoiceBasedChannel,
} from 'discord.js';
import express from 'express';
import { fs } from 'mz';
import { commandSelector, interactionSelector } from './bot/commands.js';
import * as DotBotFunctions from './bot/dot_function';
import { joinVoiceChannel, leftVoiceChannel } from './bot/dot_function/room.js';
import * as SpeakService from './bot/service/speakService.js';
import { initializeCoeiroSpeakerIds } from './common/common.js';
import { Logger } from './common/logger.js';
import { CONFIG, CommandConfig } from './config/config.js';
import { DISCORD_CLIENT } from './constant/constants.js';
import { initJob } from './job/job.js';
import { SpeakerRepository } from './model/repository/speakerRepository.js';
import { TypeOrm } from './model/typeorm/typeorm.js';
import { routers } from './routers.js';
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
CONFIG.NAME = data.NAME;
CONFIG.COMMAND = data.COMMAND;
CONFIG.PORT = data.PORT;

const app = express();
app.use(express.json());

app.use('/', routers);

app.listen(CONFIG.PORT, () => {
  console.log(`Server is running on port ${CONFIG.PORT}`);
});

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
      message: ['success'],
    });
  })
  .catch(async (e) => {
    await Logger.put({
      guild_id: undefined,
      channel_id: undefined,
      user_id: undefined,
      level: LogLevel.SYSTEM,
      event: 'db-init',
      message: [e.message],
    });
    return;
  });

/**
 * =======================
 * Bot Process
 * =======================
 */

let commands: RESTPostAPIChatInputApplicationCommandsJSONBody[];

const serverCommands = [
  new SlashCommandBuilder().setName(CONFIG.COMMAND.SPEAK.COMMAND_NAME).setDescription('読み上げを呼び出す'),
].map((command) => command.toJSON());

const dmCommands = [
  new SlashCommandBuilder()
    .setName('erase')
    .setDescription('ChatGPTとのチャット履歴を削除します')
    .addBooleanOption((option) => option.setName('last').setDescription('直前のみ削除します').setRequired(false)),
  new SlashCommandBuilder()
    .setName(CONFIG.COMMAND.SPEAKER_CONFIG.COMMAND_NAME_SHORT)
    .setDescription('スピーカーの設定を行う')
    .addNumberOption((option) => option.setName('voice_id').setDescription('使用する声のID').setRequired(true))
    .addNumberOption((option) => option.setName('speed').setDescription('話す速度 1が標準 (0.5 - 2.0)'))
    .addNumberOption((option) =>
      option.setName('pitch').setDescription('声のピッチ 高さ変更, 0が標準 (-0.1 - 0.1くらい目安)')
    )
    .addNumberOption((option) =>
      option.setName('intonation').setDescription('声の抑揚 下げるほど棒読み 1が標準 (0.0 - 1.0)')
    ),
  new SlashCommandBuilder().setName('model-list').setDescription('モデル一覧を表示します'),
  new SlashCommandBuilder()
    .setName('model-set')
    .setDescription('モデルを設定します')
    .addStringOption((option) => option.setName('model').setDescription('使用するモデル').setRequired(true)),
].map((command) => command.toJSON());

const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
DISCORD_CLIENT.login(CONFIG.TOKEN);

/**
 * bot初回読み込み
 */
DISCORD_CLIENT.once('ready', async () => {
  await initJob();
  await initializeCoeiroSpeakerIds();

  const guilds = await DISCORD_CLIENT.guilds.fetch();
  guilds.forEach(async (guild) => {
    rest
      .put(Routes.applicationGuildCommands(CONFIG.APP_ID, guild.id), { body: serverCommands })
      .then(
        async () =>
          await Logger.put({
            guild_id: guild.id,
            channel_id: undefined,
            user_id: undefined,
            level: LogLevel.SYSTEM,
            event: 'reg-command|add',
            message: [`successfully add command to guild: ${guild.name}.`],
          })
      )
      .catch(console.error);
  });

  // スラッシュコマンドの登録
  rest.put(Routes.applicationCommands(CONFIG.APP_ID), { body: dmCommands }).then(async () => {
    await Logger.put({
      guild_id: undefined,
      channel_id: undefined,
      user_id: undefined,
      level: LogLevel.SYSTEM,
      event: 'reg-command|add',
      message: ['successfully add command to DM.'],
    });
  });

  await Logger.put({
    guild_id: undefined,
    channel_id: undefined,
    user_id: undefined,
    level: LogLevel.SYSTEM,
    event: 'ready',
    message: [`discord bot logged in: ${DISCORD_CLIENT.user?.displayName}`],
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
        `cid: ${message.channel.id}, cname: ${message.channel.type !== ChannelType.DM ? message.channel.name : 'DM'}`,
        `author : ${message.author.displayName}`,
        `content: ${message.content}`,
      ],
    });
    await commandSelector(message);
    return;
  }

  if (
    message.content.includes(`<@${DISCORD_CLIENT.user?.id}>`) &&
    message.content.trimEnd() !== `<@${DISCORD_CLIENT.user?.id}>`
  ) {
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
        message: [`author: ${message.author.tag}, content: ${message.content}`],
      });
      await SpeakService.addQueue(message.channel as VoiceBasedChannel, message.content, message.author.id);
    }
  }
});

/**
 * コマンドの受信イベント
 */
DISCORD_CLIENT.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  await Logger.put({
    guild_id: interaction.guild ? interaction.guild.id : undefined,
    channel_id: interaction.channel?.id,
    user_id: interaction.user.id,
    level: LogLevel.INFO,
    event: 'interaction-received',
    message: [`cid: ${interaction.channel?.id}`, `author: ${interaction.user.displayName}`, `content: ${interaction}`],
  });
  await interactionSelector(interaction);
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
