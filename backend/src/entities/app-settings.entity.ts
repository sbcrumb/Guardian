import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_settings')
export class AppSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column()
  value: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ default: false })
  private: boolean;

  @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
