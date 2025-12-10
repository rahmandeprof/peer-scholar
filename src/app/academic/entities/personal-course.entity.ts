import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne } from 'typeorm';

@Entity('personal_course')
export class PersonalCourse extends IDAndTimestamp {
  @Column({ name: 'title' })
  title: string;

  @Column({ name: 'code', nullable: true }) // Optional short code like "MTH 101"
  code: string;

  @Column({ name: 'color', default: '#4F46E5' }) // Default indigo-600
  color: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Material, (material: Material) => material.personalCourses)
  @JoinTable({
    name: 'personal_course_materials',
    joinColumn: {
      name: 'personal_course_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'material_id',
      referencedColumnName: 'id',
    },
  })
  materials: Material[];
}
