import { BaseEntity, Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class Music extends BaseEntity {
    @PrimaryColumn({ type: 'bigint', width: 20 })
    guild_id!: string;

    @PrimaryColumn({ type: 'smallint' })
    music_id!: number;

    @Column({ type: 'varchar', width: 255, nullable: false })
    title!: string;

    @Column({ type: 'varchar', width: 255, nullable: false })
    url!: string;

    @Column({ type: 'varchar', width: 255, nullable: false })
    thumbnail!: string;

    @Column({ type: 'tinyint', nullable: false, default: 0 })
    is_play!: number;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    created_at!: Date;
}
