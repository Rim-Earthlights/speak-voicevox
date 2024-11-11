import { Repository } from 'typeorm';
import { TypeOrm } from '../typeorm/typeorm';
import * as Models from '../models/index.js';

export class GuildRepository {
  private repository: Repository<Models.Guild>;

  constructor() {
    this.repository = TypeOrm.dataSource.getRepository(Models.Guild);
  }

  /**
   * GIDからGuildを取得する
   * @param gid guild.id
   * @returns Promise<Models.Guild | null>
   */
  public async get(gid: string): Promise<Models.Guild | null> {
    const guild = await this.repository.findOne({ where: { id: gid } });
    return guild;
  }

  /**
   * 全てのサーバを取得する
   * @returns サーバのリスト
   */
  public async getAll(): Promise<Models.Guild[]> {
    return await this.repository.find();
  }
}
