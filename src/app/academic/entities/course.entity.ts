import { Department } from './department.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, ManyToOne } from 'typeorm';

@Entity()
export class Course extends IDAndTimestamp {
  @Column()
  code: string; // e.g. CSC 101

  @Column()
  title: string; // e.g. Introduction to Computer Science

  @Column({ type: 'int' })
  level: number; // e.g. 100, 200

  @Column({ nullable: true })
  semester: number; // 1 or 2

  @ManyToOne(() => Department, (department) => department.courses)
  department: Department;
}
