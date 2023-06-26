import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    JoinTable,
    OneToMany,
    PrimaryGeneratedColumn
} from 'typeorm';
import { Item } from './item.js';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class ItemRank extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id!: number;

    @Column({ type: 'varchar', length: 255, nullable: false, unique: true })
    rare!: RARE;

    @Column({ type: 'smallint', nullable: false })
    rank!: number;

    @DeleteDateColumn({ type: 'datetime', nullable: true })
    deleted_at: Date | null = null;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    created_at!: Date;

    @OneToMany(() => Item, (item) => item.rare)
    items!: Item[];
}

type RARE = 'UUR' | 'UR' | 'SSR' | 'SR' | 'R' | 'UC' | 'C' | 'P';
