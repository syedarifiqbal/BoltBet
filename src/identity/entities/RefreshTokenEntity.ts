import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

/**
 * Stores bcrypt-hashed refresh tokens.
 *
 * Cookie format: "{id}:{rawSecret}"
 *   - id allows O(1) DB lookup by primary key
 *   - rawSecret is bcrypt-compared against tokenHash
 *
 * familyId groups all tokens issued from the same login event.
 * On reuse detection (used=true token replayed), the entire family is revoked.
 */
@Entity('refreshTokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  familyId: string;

  @Column()
  tokenHash: string;

  @Index()
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;

  @Column({ nullable: true, type: 'varchar' })
  deviceFingerprint: string | null;

  @Column({ nullable: true, type: 'varchar', length: 45 })
  ipAddress: string | null;

  @Column({ nullable: true, type: 'text' })
  userAgent: string | null;

  @Column({ default: false })
  used: boolean;

  @Column({ default: false })
  revoked: boolean;

  @Column()
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
