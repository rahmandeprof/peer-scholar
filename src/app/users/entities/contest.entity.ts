import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity } from 'typeorm';

@Entity('contest')
export class Contest extends IDAndTimestamp {
  @Column({ name: 'name', type: 'varchar' })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'start_date', type: 'timestamp' })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'timestamp' })
  endDate!: Date;

  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  @Column({ name: 'prize_config', type: 'jsonb', nullable: true })
  prizeConfig?: Record<string, string>;

  @Column({ name: 'rules', type: 'text', nullable: true })
  rules?: string;
}
