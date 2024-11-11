import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    OneToMany,
    PrimaryColumn,
    Relation,
    UpdateDateColumn
} from 'typeorm';
import { Gacha } from './gacha.js';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class Users extends BaseEntity {
    @PrimaryColumn({ type: 'bigint', width: 20 })
    id!: string;

    @Column({ type: 'varchar', width: 255, nullable: true })
    user_name: string | null = null;

    @Column({ type: 'varchar', width: 255, nullable: true })
    nickname: string | null = null;

    @Column({ type: 'varchar', nullable: false, default: 'member' })
    type!: UsersType;

    @Column({ type: 'varchar', width: 255, nullable: true })
    pref: string | null = null;

    @Column({ type: 'datetime', nullable: true })
    birth_date: Date | null = null;

    @Column({ type: 'datetime', nullable: true })
    last_pick_date: Date | null = null;

    @Column({ type: 'int', nullable: false, default: 0 })
    pick_left!: number;

    @Column({ type: 'int', nullable: false, default: 3 })
    voice_id!: number;

    @Column({ type: 'float', nullable: false, default: 1.0 })
    voice_speed!: number;

    @Column({ type: 'float', nullable: false, default: 0.0 })
    voice_pitch!: number;

    @Column({ type: 'float', nullable: false, default: 1.0 })
    voice_intonation!: number;

    @Column({ type: 'json', nullable: true })
    voice_channel_data: VoiceChannelData[] | null = null;

    @DeleteDateColumn({ type: 'datetime', nullable: true })
    deleted_at: Date | null = null;

    @UpdateDateColumn({ type: 'datetime', nullable: true })
    updated_at: Date | null = null;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    created_at!: Date;

    @OneToMany(() => Gacha, (g) => g.user_id)
    gacha?: Relation<Gacha>[];
}

export enum UsersType {
    MEMBER = 'member',
    BOT = 'bot',
    ADMIN = 'admin',
    OWNER = 'owner'
}

export type VoiceChannelData = {
    gid: string;
    date: Date;
};
