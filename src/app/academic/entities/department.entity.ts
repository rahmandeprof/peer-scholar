import { Course } from './course.entity';
import { Faculty } from './faculty.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';

@Entity()
export class Department extends IDAndTimestamp {
  @Column()
  name: string;

  @ManyToOne(() => Faculty, (faculty) => faculty.departments)
  faculty: Faculty;

  @OneToMany(() => Course, (course) => course.department)
  courses: Course[];
}
