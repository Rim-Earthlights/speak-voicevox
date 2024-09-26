import * as cron from 'node-cron';
import { UsersRepository } from '../model/repository/usersRepository.js';
import dayjs from 'dayjs';
import { Logger } from '../common/logger.js';
import { LogLevel } from '../type/types.js';
import { gptList } from '../bot/service/chatService.js';

export async function initJob() {
    /**
     * 1分毎に実行されるタスク
     */
    cron.schedule('* * * * *', async () => {
        gptList.gpt.map(async (c) => {
            if (c.timestamp.isBefore(dayjs().subtract(30, 'minute'))) {
                gptList.gpt = gptList.gpt.filter((g) => g.id !== c.id);
                await Logger.put({
                    guild_id: c.isGuild ? c.id : undefined,
                    channel_id: c.isGuild ? undefined : c.id,
                    user_id: undefined,
                    level: LogLevel.INFO,
                    event: 'Cron job: * * * * *',
                    message: [`ChatGPT data deleted`]
                });
            }
        });
    });

    Logger.put({
        guild_id: undefined,
        channel_id: undefined,
        user_id: undefined,
        level: LogLevel.SYSTEM,
        event: 'Cron job',
        message: ['Initialized']
    });
}
