import * as cron from 'node-cron';
import { UsersRepository } from '../model/repository/usersRepository.js';
import dayjs from 'dayjs';
import { Logger } from '../common/logger.js';
import { LogLevel } from '../type/types.js';

export async function initJob() {
    /**
     * 1秒毎に実行されるタスク
     */
    cron.schedule('* * * * * *', async () => {
        //await speak();
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
