import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class MusicInfo extends BaseEntity {
    @PrimaryColumn({ type: 'bigint', width: 20 })
    guild_id!: string;

    @Column({ type: 'tinyint', nullable: false, default: 0 })
    is_shuffle!: number;

    @Column({ type: 'tinyint', nullable: false, default: 0 })
    is_loop!: number;

    @Column({ type: 'varchar', width: 255, nullable: true })
    title: string | null = null;

    @Column({ type: 'varchar', width: 255, nullable: true })
    url: string | null = null;

    @Column({ type: 'varchar', width: 255, nullable: true })
    thumbnail: string | null = null;

    @Column({ type: 'tinyint', nullable: false, default: 0 })
    silent!: number;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    created_at!: Date;
}
