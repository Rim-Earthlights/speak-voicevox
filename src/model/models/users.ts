import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  Relation,
  UpdateDateColumn
} from 'typeorm';
import { Gacha } from './gacha.js';
import { Guild } from './guild.js';
import { UserSetting } from './userSetting.js';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class Users extends BaseEntity {
  @PrimaryColumn({ type: 'bigint', width: 20 })
  id!: string;

  @PrimaryColumn({ type: 'bigint', width: 20 })
  guild_id!: string;

  @Column({ type: 'varchar', width: 255, nullable: true })
  user_name: string | null = null;

  @Column({ type: 'varchar', nullable: false, default: 'member' })
  type!: UsersType;

  @Column({ type: 'datetime', nullable: true })
  last_pick_date: Date | null = null;

  @Column({ type: 'int', nullable: false, default: 0 })
  pick_left!: number;

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

  @ManyToOne(() => Guild, (guild) => guild.id)
  @JoinColumn({ name: 'guild_id', referencedColumnName: 'id' })
  guild!: Relation<Guild>;

  @OneToOne(() => UserSetting, (userSetting) => userSetting.user_id)
  @JoinColumn({ name: 'id', referencedColumnName: 'user_id' })
  userSetting!: Relation<UserSetting>;
}

export enum UsersType {
  MEMBER = 'member',
  BOT = 'bot',
  ADMIN = 'admin',
  OWNER = 'owner',
}

export type VoiceChannelData = {
  gid: string;
  date: Date;
};
