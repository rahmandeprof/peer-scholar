import { DefaultNamingStrategy, NamingStrategyInterface } from 'typeorm';

/**
 * Snake case naming strategy for TypeORM
 * Automatically converts camelCase entity/column names to snake_case in PostgreSQL
 * 
 * Example:
 * - Entity: UserBadge → table: user_badge
 * - Column: firstName → column: first_name
 * - Relation: userId → column: user_id
 */
export class SnakeCaseNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
    /**
     * Convert string to snake_case
     */
    private toSnakeCase(str: string): string {
        return str
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .replace(/^_/, ''); // Remove leading underscore
    }

    /**
     * Table name: UserBadge → user_badge
     */
    tableName(className: string, customName: string | undefined): string {
        return customName || this.toSnakeCase(className);
    }

    /**
     * Column name: firstName → first_name
     */
    columnName(propertyName: string, customName: string | undefined, embeddedPrefixes: string[]): string {
        const name = customName || this.toSnakeCase(propertyName);
        return embeddedPrefixes.length
            ? this.toSnakeCase(embeddedPrefixes.join('_')) + '_' + name
            : name;
    }

    /**
     * Relation column: user → user_id
     */
    relationName(propertyName: string): string {
        return this.toSnakeCase(propertyName);
    }

    /**
     * Join column: userId → user_id
     */
    joinColumnName(relationName: string, referencedColumnName: string): string {
        return this.toSnakeCase(relationName) + '_' + referencedColumnName;
    }

    /**
     * Join table: user_badges_badge → user_badges_badge (already snake_case)
     */
    joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
        return `${firstTableName}_${this.toSnakeCase(firstPropertyName)}`;
    }

    /**
     * Join table column for owner side
     */
    joinTableColumnName(tableName: string, propertyName: string, columnName?: string): string {
        return `${tableName}_${columnName || propertyName}`;
    }

    /**
     * Primary key constraint: PK_user_badge_id
     */
    primaryKeyName(tableOrName: string, columnNames: string[]): string {
        const table = typeof tableOrName === 'string' ? tableOrName : tableOrName;
        return `PK_${table}_${columnNames.join('_')}`;
    }

    /**
     * Foreign key constraint: FK_user_badge_user_id
     */
    foreignKeyName(tableOrName: string, columnNames: string[]): string {
        const table = typeof tableOrName === 'string' ? tableOrName : tableOrName;
        return `FK_${table}_${columnNames.join('_')}`;
    }

    /**
     * Index name: IDX_user_badge_user_id
     */
    indexName(tableOrName: string, columnNames: string[]): string {
        const table = typeof tableOrName === 'string' ? tableOrName : tableOrName;
        return `IDX_${table}_${columnNames.join('_')}`;
    }

    /**
     * Unique constraint: UQ_user_email
     */
    uniqueConstraintName(tableOrName: string, columnNames: string[]): string {
        const table = typeof tableOrName === 'string' ? tableOrName : tableOrName;
        return `UQ_${table}_${columnNames.join('_')}`;
    }
}
