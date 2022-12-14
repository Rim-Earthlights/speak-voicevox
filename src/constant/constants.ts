import { Client, GatewayIntentBits, Partials } from 'discord.js';

// Client
export const DISCORD_CLIENT = new Client({
    partials: [Partials.Channel],
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

export const EXCLUDE_ROOM = ['ロビー', '墓'];
