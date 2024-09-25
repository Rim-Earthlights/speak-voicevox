import { DataSource } from 'typeorm';
import { CONFIG } from '../../config/config';
import * as Models from '../models';

export class TypeOrm {
    static dataSource = new DataSource({
        type: 'mariadb', // これに応じて設定項目が変わる(TypeScriptの型が変わる)
        host: CONFIG.DB.HOSTNAME,
        username: CONFIG.DB.USERNAME,
        password: CONFIG.DB.PASSWORD, // 環境変数より取得
        port: CONFIG.DB.PORT,
        logging: false, // SQLログ
        database: CONFIG.DB.DATABASE,
        synchronize: false, // DBとのスキーマ同期(開発用)
        dropSchema: false, // スキーマ削除(開発用)
        charset: 'utf8mb4',
        entities: [
            Models.Users,
            Models.Gacha,
            Models.Music,
            Models.MusicInfo,
            Models.Playlist,
            Models.Item,
            Models.Guild,
            Models.ItemRank,
            Models.Speaker,
            Models.Log
        ] // 利用するエンティティ。パスでの指定も可能
    });
}
