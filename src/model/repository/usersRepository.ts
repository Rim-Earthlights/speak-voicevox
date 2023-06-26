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
     * @param uid user.id
     * @returns Promise<Users | null>
     */
    public async get(uid: string): Promise<Models.Users | null> {
        const user = await this.repository.findOne({ where: { id: uid } });
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
     * ガチャ回数をpickLeft回に再セットする
     * @param uid user id
     * @param pickLeft 再セットするピック数
     */
    public async resetGacha(uid: string, pickLeft: number): Promise<void> {
        await this.repository.save({ id: uid, pick_left: pickLeft });
    }

    /**
     * ユーザの残りピック数を10増やす
     */
    public async addPickLeft(): Promise<void> {
        const users = await this.repository.find();
        const saveUsers = users.map((u) => {
            if (u.pick_left < 70) {
                return { ...u, pick_left: u.pick_left + 10 };
            } else {
                return { ...u };
            }
        });
        await this.repository.save(saveUsers);
    }
}
