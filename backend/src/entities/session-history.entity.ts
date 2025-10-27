import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserDevice } from './user-device.entity';
import { UserPreference } from './user-preference.entity';

@Entity('session_history')
@Index(['userId', 'startedAt'])
export class SessionHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_key' })
  sessionKey: string;

  @Column({ name: 'user_id' })
  userId: string;

  // Foreign key to UserPreference to get user info (username, etc.)
  @ManyToOne(() => UserPreference, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  userPreference?: UserPreference;

  // Foreign key to UserDevice
  @Column({ name: 'user_device_id', nullable: true })
  userDeviceId: number;

  @ManyToOne(() => UserDevice, { eager: false })
  @JoinColumn({ name: 'user_device_id' })
  userDevice: UserDevice;

  @Column({ name: 'device_address', nullable: true })
  deviceAddress: string;

  @Column({ name: 'content_title', nullable: true })
  contentTitle: string;

  @Column({ name: 'content_type', nullable: true })
  contentType: string;

  @Column({ name: 'grandparent_title', nullable: true })
  grandparentTitle: string;

  @Column({ name: 'parent_title', nullable: true })
  parentTitle: string;

  @Column({ name: 'year', nullable: true })
  year: number;

  @Column({ name: 'duration', nullable: true })
  duration: number;

  @Column({ name: 'view_offset', nullable: true })
  viewOffset: number;

  @Column({ name: 'thumb', nullable: true })
  thumb: string;

  @Column({ name: 'art', nullable: true })
  art: string;

  @Column({ name: 'video_resolution', nullable: true })
  videoResolution: string;

  @Column({ name: 'bitrate', nullable: true })
  bitrate: number;

  @Column({ name: 'container', nullable: true })
  container: string;

  @Column({ name: 'video_codec', nullable: true })
  videoCodec: string;

  @Column({ name: 'audio_codec', nullable: true })
  audioCodec: string;

  @Column({ name: 'session_location', nullable: true })
  sessionLocation: string;

  @Column({ name: 'bandwidth', nullable: true })
  bandwidth: number;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({
    name: 'ended_at',
    type: 'datetime',
    nullable: true,
  })
  endedAt?: Date;

  @Column({ name: 'terminated', default: false })
  terminated: boolean;

  @Column({ name: 'player_state', nullable: true })
  playerState: string;

  @Column({ name: 'product', nullable: true })
  product: string;

  @Column({ name: 'rating_key', nullable: true })
  ratingKey: string;

  @Column({ name: 'parent_rating_key', nullable: true })
  parentRatingKey: string;

  @Column({ name: 'server_type', default: 'plex' })
  serverType: 'plex' | 'jellyfin' | 'emby';
}
