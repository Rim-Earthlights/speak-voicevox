import dayjs from 'dayjs';
import { LogRepository } from '../model/repository/logRepository';
import { LogData } from '../type/types';
import { GuildRepository } from '../model/repository/guildRepository';
import { CONFIG } from '../config/config';

export class Logger {
    static async put(logData: LogData) {
        const logRepository = new LogRepository();
        const guildRepository = new GuildRepository();

        try {
            await logRepository.save({
                ...logData,
                bot_id: CONFIG.APP_ID,
                message: logData.message ? logData.message.join('\n') : ''
            });
            if (logData.guild_id) {
                const guild = await guildRepository.get(logData.guild_id);
                console.log(
                    `[${dayjs().format('YYYY/MM/DD HH:mm:ss')}/${logData.level}]: ${guild?.name} | ${logData.event}`
                );
            } else {
                console.log(
                    `[${dayjs().format('YYYY/MM/DD HH:mm:ss')}/${logData.level}]: ${logData.guild_id} | ${logData.event
                    }`
                );
            }
            if (logData.message) {
                console.log(logData.message.join('\n'));
            }
            console.log('==================================================');
        } catch (e) {
            const err = e as Error;
            console.error(err.message);
        }
    }
}
