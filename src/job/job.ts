import * as cron from 'node-cron';
import * as logger from '../common/logger.js';
import { UsersRepository } from '../model/repository/usersRepository.js';
import dayjs from 'dayjs';
import { speak } from '../bot/function/speak.js';

export async function initJob() {
    /**
     * 1秒毎に実行されるタスク
     */
    cron.schedule('* * * * * *', async () => {
        //await speak();
    });

    logger.info('system', 'Cron job', 'Initialized');
}
