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

  // Notification settings - these are handled as key-value pairs
  // notificationsEnabled -> stored as key: 'notificationsEnabled'
  // notificationUrls -> stored as key: 'notificationUrls' 
  // notificationTitle -> stored as key: 'notificationTitle'
}
