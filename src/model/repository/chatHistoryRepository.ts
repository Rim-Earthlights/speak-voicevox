import { DeepPartial, Repository } from 'typeorm';
import { DISCORD_CLIENT } from '../../constant/constants.js';
import * as Models from '../models/index.js';
import { TypeOrm } from '../typeorm/typeorm.js';

export class ChatHistoryRepository {
  private repository: Repository<Models.ChatHistory>;

  constructor() {
    this.repository = TypeOrm.dataSource.getRepository(Models.ChatHistory);
  }

  /**
   * UUIDからチャット履歴を取得する
   * @param uuid チャット履歴のUUID
   * @returns Promise<ChatHistory | null>
   */
  public async get(uuid: string): Promise<Models.ChatHistory | null> {
    const chatHistory = await this.repository.findOne({ where: { uuid } });
    return chatHistory;
  }

  /**
   * チャンネルIDからチャット履歴を取得する
   * @param channelId チャンネルID
   * @returns Promise<ChatHistory[]>
   */
  public async getLatestByChannelId(channelId: string): Promise<Models.ChatHistory | null> {
    const botId = DISCORD_CLIENT.user?.id;
    if (!botId) {
      return null;
    }

    const chatHistory = await this.repository.findOne({
      where: { bot_id: botId, channel_id: channelId },
      order: { created_at: 'DESC' },
    });
    return chatHistory;
  }

  /**
   * ユーザーIDに関連するチャット履歴を取得する
   * @param userId ユーザーID
   * @param limit 取得件数（デフォルト: 50）
   * @param offset オフセット（デフォルト: 0）
   * @returns Promise<ChatHistory[]>
   */
  public async getByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Models.ChatHistory[]> {
    // DMチャンネルの履歴を取得
    // 注意: 実際のDiscord DMチャンネルIDの形式に応じて、より具体的なフィルタリングロジックが必要になる場合があります
    const chatHistories = await this.repository
      .createQueryBuilder('chat_history')
      .where('chat_history.channel_type = :channelType', { channelType: 'DM' })
      .andWhere('JSON_EXTRACT(chat_history.content, "$[*].role") LIKE :userId', { userId: `%${userId}%` })
      .orderBy('chat_history.updated_at', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();

    return chatHistories;
  }

  /**
   * すべてのチャット履歴を取得する（ページネーション対応）
   * @param limit 取得件数（デフォルト: 50）
   * @param offset オフセット（デフォルト: 0）
   * @param channelId チャンネルID（オプション）
   * @returns Promise<ChatHistory[]>
   */
  public async getAll(limit: number = 50, offset: number = 0, channelId?: string): Promise<Models.ChatHistory[]> {
    const whereCondition: any = {};

    if (channelId && channelId.trim() !== '' && channelId !== 'all') {
      whereCondition.channel_id = channelId;
    }

    const chatHistories = await this.repository.find({
      where: whereCondition,
      order: { created_at: 'DESC' },
      take: limit,
      skip: offset,
    });
    return chatHistories;
  }

  /**
   * チャット履歴を保存・更新する（upsert）
   * @param chatHistory チャット履歴データ
   * @returns Promise<void>
   */
  public async save(chatHistory: DeepPartial<Models.ChatHistory>): Promise<void> {
    await this.repository.save(chatHistory);
  }

  /**
   * UUIDをキーにしてcontentを上書き保存する
   * @param uuid チャット履歴のUUID
   * @param content 新しいコンテンツ
   * @returns Promise<void>
   */
  public async upsertByUuid(uuid: string, content: Models.ChatHistory['content']): Promise<void> {
    const existingChatHistory = await this.get(uuid);

    if (existingChatHistory) {
      // 既存のレコードがある場合は content を更新
      await this.repository.save({
        uuid,
        content,
      });
    } else {
      // 既存のレコードがない場合はエラーを投げる（UUIDが存在しない）
      throw new Error(`ChatHistory with UUID ${uuid} not found`);
    }
  }

  /**
   * チャット履歴を削除する（ソフトデリート）
   * @param uuid チャット履歴のUUID
   * @returns Promise<void>
   */
  public async delete(uuid: string): Promise<void> {
    await this.repository.softDelete({ uuid });
  }

  /**
   * チャット履歴を完全に削除する
   * @param uuid チャット履歴のUUID
   * @returns Promise<void>
   */
  public async hardDelete(uuid: string): Promise<void> {
    await this.repository.delete({ uuid });
  }
}
