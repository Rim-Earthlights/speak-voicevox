import { SlashCommandBuilder } from "discord.js";
import { CONFIG } from "../config/config";

export const SLASH_COMMANDS = [
  new SlashCommandBuilder()
    .setName(CONFIG.COMMAND.SPEAK.SLASH_COMMAND_NAME)
    .setDescription('読み上げを呼び出す')
];
