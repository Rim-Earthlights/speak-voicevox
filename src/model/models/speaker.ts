import { BaseEntity, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class Speaker extends BaseEntity {
  @PrimaryColumn({ type: 'bigint', width: 20 })
  guild_id!: string;

  @PrimaryColumn({ type: 'bigint', width: 20 })
  user_id!: string;

  @Column({ type: 'tinyint', width: 1, nullable: false, default: 0 })
  is_used!: number;
}
