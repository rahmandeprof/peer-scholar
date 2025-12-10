import { Department } from './department.entity';
import { School } from './school.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('faculty')
export class Faculty extends IDAndTimestamp {
  @Column({ name: 'name' })
  name: string;

  @ManyToOne(() => School, (school) => school.faculties)
  @JoinColumn({ name: 'school_id' })
  school: School;

  @OneToMany(() => Department, (department) => department.faculty)
  departments: Department[];
}
