import dayjs from 'dayjs';
import * as cron from 'node-cron';
import { llmList } from '../bot/service/chatService.js';
import { Logger } from '../common/logger.js';
import { LogLevel } from '../type/types.js';

export async function initJob() {
  /**
   * 1分毎に実行されるタスク
   */
  cron.schedule('* * * * *', async () => {
    llmList.llm.map(async (c) => {
      if (c.timestamp.isBefore(dayjs().subtract(30, 'minute'))) {
        llmList.llm = llmList.llm.filter((g) => g.id !== c.id);
        await Logger.put({
          guild_id: c.isGuild ? c.id : undefined,
          channel_id: c.isGuild ? undefined : c.id,
          user_id: undefined,
          level: LogLevel.INFO,
          event: 'Cron job: * * * * *',
          message: [`ChatGPT data deleted`],
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
    message: ['Initialized'],
  });
}
