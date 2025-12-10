import { Department } from './department.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('course')
export class Course extends IDAndTimestamp {
  @Column({ name: 'code' })
  code: string; // e.g. CSC 101

  @Column({ name: 'title' })
  title: string; // e.g. Introduction to Computer Science

  @Column({ name: 'level', type: 'int' })
  level: number; // e.g. 100, 200

  @Column({ name: 'semester', nullable: true })
  semester: number; // 1 or 2

  @ManyToOne(() => Department, (department) => department.courses)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany('Material', 'course')
  materials: any[];
}
