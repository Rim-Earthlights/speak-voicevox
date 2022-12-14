import {
    BaseEntity,
    Column,
    CreateDateColumn,
    DeleteDateColumn,
    Entity,
    PrimaryColumn,
    UpdateDateColumn
} from 'typeorm';

@Entity({ engine: 'InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' })
export class Users extends BaseEntity {
    @PrimaryColumn({ type: 'bigint', width: 20 })
    id!: string;

    @Column({ type: 'varchar', width: 255, nullable: true })
    userName!: string | null;

    @Column({ type: 'varchar', width: 255, nullable: true })
    pref!: string | null;

    @Column({ type: 'datetime', nullable: true })
    gachaDate!: Date | null;

    @DeleteDateColumn({ type: 'datetime', nullable: true })
    deletedAt!: Date | null;

    @UpdateDateColumn({ type: 'datetime', nullable: true })
    updatedAt!: Date | null;

    @CreateDateColumn({ type: 'datetime', nullable: false })
    createdAt!: Date;
}
