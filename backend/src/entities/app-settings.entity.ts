import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('app_settings')
export class AppSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 'string' })
  type: 'string' | 'number' | 'boolean' | 'json';

  @Column({ default: false })
  private: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ name: 'plex_token', nullable: true })
  plexToken?: string;

  // Notification settings
  @Column({ name: 'notifications_enabled', default: false })
  notificationsEnabled: boolean;

  @Column({ name: 'notification_urls', nullable: true, type: 'text' })
  notificationUrls?: string; // JSON string of Apprise URLs

  @Column({ name: 'notification_title', default: 'Guardian - Device Authorization Required' })
  notificationTitle: string;
}
