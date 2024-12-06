import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToOne,
  PrimaryColumn,
  Relation,
  UpdateDateColumn
} from 'typeorm';
import { Users } from './users.js';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class UserSetting extends BaseEntity {
  @PrimaryColumn({ type: 'bigint', width: 20 })
  user_id!: string;

  @Column({ type: 'varchar', width: 255, nullable: true })
  nickname: string | null = null;

  @Column({ type: 'varchar', width: 255, nullable: true })
  pref: string | null = null;

  @Column({ type: 'datetime', nullable: true })
  birth_date: Date | null = null;

  @Column({ type: 'int', nullable: false, default: 3 })
  voice_id!: number;

  @Column({ type: 'float', nullable: false, default: 1.0 })
  voice_speed!: number;

  @Column({ type: 'float', nullable: false, default: 0.0 })
  voice_pitch!: number;

  @Column({ type: 'float', nullable: false, default: 1.0 })
  voice_intonation!: number;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deleted_at: Date | null = null;

  @UpdateDateColumn({ type: 'datetime', nullable: true })
  updated_at: Date | null = null;

  @CreateDateColumn({ type: 'datetime', nullable: false })
  created_at!: Date;

  @OneToOne(() => Users, (user) => user.id)
  user!: Relation<Users>;
}
