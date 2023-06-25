import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryGeneratedColumn
} from 'typeorm';
import { Gacha } from './gacha.js';
import { ItemRank } from './itemRank.js';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class Item extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id!: number;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    icon: string | null = null;

    @Column({ type: 'varchar', length: 255, nullable: false })
    rare!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description: string | null = null;

    @Column({ type: 'smallint', default: 1, nullable: false })
    weight!: number;

    @Column({ type: 'tinyint', default: 0, nullable: false })
    is_present!: number;

    @Column({ type: 'smallint', default: 0, nullable: false })
    reroll!: number;

    @Column({ type: 'int', default: 0, nullable: false })
    price!: number;

    @DeleteDateColumn({ type: 'datetime', nullable: true })
    deleted_at: Date | null = null;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    created_at!: Date;

    @OneToMany(() => Gacha, (g) => g.item_id)
    gacha?: Gacha[];

    @ManyToOne(() => ItemRank, (item) => item.rare)
    @JoinColumn({ name: 'rare', referencedColumnName: 'rare' })
    item_rank!: ItemRank;
}
