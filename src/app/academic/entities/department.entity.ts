import { Course } from './course.entity';
import { Faculty } from './faculty.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('department')
export class Department extends IDAndTimestamp {
  @Column({ name: 'name' })
  name: string;

  @ManyToOne(() => Faculty, (faculty) => faculty.departments)
  @JoinColumn({ name: 'faculty_id' })
  faculty: Faculty;

  @OneToMany(() => Course, (course) => course.department)
  courses: Course[];
}
