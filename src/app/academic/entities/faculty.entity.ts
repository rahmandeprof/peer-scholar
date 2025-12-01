import { Department } from './department.entity';
import { School } from './school.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Faculty extends IDAndTimestamp {
  @Column()
  name: string;

  @ManyToOne(() => School, (school) => school.faculties)
  school: School;

  @OneToMany(() => Department, (department) => department.faculty)
  departments: Department[];
}
