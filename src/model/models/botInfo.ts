import { BaseEntity, Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { ChatHistory } from './chatHistory.js';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class BotInfo extends BaseEntity {
  @PrimaryColumn({ type: 'bigint', width: 20 })
  bot_id!: number;

  @Column({ type: 'varchar', width: 255 })
  name!: string | null;

  @CreateDateColumn({ type: 'datetime', nullable: false })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime', nullable: false })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'datetime', nullable: true })
  deleted_at: Date | null = null;

  @OneToMany(() => ChatHistory, (chatHistory) => chatHistory.bot_id)
  chat_histories!: ChatHistory[];
}