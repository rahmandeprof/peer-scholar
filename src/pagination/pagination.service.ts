import {
  paginate as nestjsPaginate,
  PaginateConfig,
  PaginateQuery,
} from 'nestjs-paginate';
import { ObjectLiteral, Repository } from 'typeorm';

export class PaginationService {
  static paginate<T extends ObjectLiteral>(
    query: PaginateQuery,
    repository: Repository<T>,
    config?: Partial<PaginateConfig<T>>,
  ) {
    return nestjsPaginate(query, repository, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sortableColumns: ['createdAt' as any],
      nullSort: 'last',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      defaultSortBy: [['createdAt' as any, 'DESC']],
      select: ['*'],
      defaultLimit: 50,
      maxLimit: 100,
      ...config,
    });
  }
}
