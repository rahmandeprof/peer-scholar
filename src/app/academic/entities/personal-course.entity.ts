import { Material } from './material.entity';
import { User } from '@/app/users/entities/user.entity';
import { IDAndTimestamp } from '@/database/entities/id-and-timestamp.entity';

import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';

@Entity()
export class PersonalCourse extends IDAndTimestamp {
  @Column()
  title: string;

  @Column({ nullable: true })
  code: string; // Optional short code like "MTH 101"

  @Column({ default: '#4F46E5' }) // Default indigo-600
  color: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @ManyToMany(() => Material, material => material.personalCourses)
  @JoinTable({
    name: 'personal_course_materials_material', // join table name
    joinColumn: {
      name: 'personal_course_id',               // column in DB
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'material_id',                      // column in DB
      referencedColumnName: 'id',
    },
  })
  materials: Material[];
}
