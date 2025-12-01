import { Faculty } from './faculty.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, OneToMany } from 'typeorm';

@Entity()
export class School extends IDAndTimestamp {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  country: string;

  @OneToMany(() => Faculty, (faculty) => faculty.school)
  faculties: Faculty[];
}
