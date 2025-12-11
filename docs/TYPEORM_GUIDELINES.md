# TypeORM Entity & Query Guidelines

This document outlines best practices for writing TypeORM entities and queries to prevent runtime SQL errors.

## 1. Foreign Key Column Pattern

When defining `@ManyToOne` relations that you need to query by ID, **always add an explicit FK column property**.

### ✅ Correct Pattern

```typescript
@Entity('study_session')
export class StudySession extends IDAndTimestamp {
  // Explicit FK column - allows `session.userId` in query builders
  @Column({ name: 'user_id' })
  userId: string;

  // Relation for eager loading
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

### ❌ Incorrect Pattern

```typescript
@Entity('material_rating')
export class MaterialRating extends IDAndTimestamp {
  // Missing explicit materialId property!
  // Query `.where('rating.materialId = :id')` will FAIL

  @ManyToOne(() => Material)
  @JoinColumn({ name: 'material_id' })
  material: Material;  // Only relation, no FK column
}
```

## 2. Column Naming Convention

All database columns use **snake_case**. Entity properties use **camelCase**.

```typescript
@Column({ name: 'first_name' })  // DB: first_name
firstName: string;                // TS: firstName

@Column({ name: 'created_at' })  // DB: created_at
createdAt: Date;                  // TS: createdAt
```

## 3. Query Builder Best Practices

### Use Explicit Columns, Not Relations

```typescript
// ✅ Good - uses explicit FK column
.where('session.userId = :userId', { userId })

// ❌ Bad - references relation, not column
.where('session.user.id = :userId', { userId })
```

### For Relations Without Explicit FK, Use Joins

```typescript
// When you only have the relation (no explicit FK column):
const query = this.repo
  .createQueryBuilder('material')
  .leftJoinAndSelect('material.uploader', 'uploader')
  .where('uploader.id = :userId', { userId });  // ✅ Uses alias.id
```

## 4. Entity Checklist

When creating or modifying an entity:

- [ ] All `@Column` decorators have explicit `{ name: 'snake_case' }` mapping
- [ ] All `@ManyToOne` relations have corresponding `@JoinColumn({ name: 'fk_column' })`
- [ ] If querying by FK in query builders, add explicit `@Column({ name: 'fk_column' }) propertyId: string`
- [ ] Run `npm run build` to verify no TypeScript errors

## 5. Testing Queries

Before deploying, test key queries:

```bash
npm run test:e2e -- --grep "query"
```

## 6. Common Errors

### Error: `column entity.propertyId does not exist`

**Cause**: Using `entity.propertyId` in query builder but entity only has `property` relation.

**Fix**: Add explicit FK column:
```typescript
@Column({ name: 'property_id' })
propertyId: string;
```

### Error: `column entity.propertyname does not exist` (lowercase)

**Cause**: TypeORM is generating lowercase column name instead of snake_case.

**Fix**: Ensure SnakeCaseNamingStrategy is configured in `ormconfig.ts`.
