import { Faculty } from './faculty.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, OneToMany } from 'typeorm';

@Entity('school')
export class School extends IDAndTimestamp {
  @Column({ name: 'name', unique: true })
  name: string;

  @Column({ name: 'country', nullable: true })
  country: string;

  @OneToMany(() => Faculty, (faculty) => faculty.school)
  faculties: Faculty[];
}
