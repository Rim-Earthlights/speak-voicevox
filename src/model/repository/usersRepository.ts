import { DeepPartial, Repository } from 'typeorm';
import * as Models from '../models/index.js';
import { TypeOrm } from '../typeorm/typeorm.js';

export class UsersRepository {
  private repository: Repository<Models.Users>;

  constructor() {
    this.repository = TypeOrm.dataSource.getRepository(Models.Users);
  }

  /**
   * UIDからユーザを取得する.
   * @param gid guild.id
   * @param uid user.id
   * @returns Promise<Users | null>
   */
  public async get(gid: string, uid: string): Promise<Models.Users | null> {
    const user = await this.repository.findOne({ relations: { guild: true, userSetting: true }, where: { id: uid, guild_id: gid } });
    return user;
  }

  /**
   * UIDからユーザを取得する.
   * @param uid user.id
   * @returns Promise<Users | null>
   */
  public async getByUid(uid: string): Promise<Models.Users | null> {
    const user = await this.repository.findOne({ relations: { userSetting: true }, where: { id: uid } });
    return user;
  }

  /**
   * すべてのユーザを取得する.
   * @param gid guild.id
   * @returns Promise<Users[]>
   */
  public async getAll(gid: string): Promise<Models.Users[]> {
    const user = await this.repository.find({ relations: { guild: true, userSetting: true }, where: { guild_id: gid } });
    return user;
  }

  /**
   * ユーザを登録・更新する
   * @param user
   * @returns
   */
  public async save(user: DeepPartial<Models.Users>): Promise<void> {
    await this.repository.save(user);
  }

  /**
   * ユーザを削除する
   * @param gid guild.id
   * @param uid user.id
   */
  public async delete(gid: string, uid: string): Promise<void> {
    await this.repository.softDelete({ id: uid, guild_id: gid });
  }

  /**
   * ユーザを完全に削除する
   * @param gid guild.id
   * @param uid user.id
   */
  public async hardDelete(gid: string, uid: string): Promise<void> {
    await this.repository.delete({ id: uid, guild_id: gid });
  }
}