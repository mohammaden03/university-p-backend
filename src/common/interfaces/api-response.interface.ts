/**
 * Standard API Response Interfaces
 */

export interface ApiResponse<T = any> {
  data: T;
  meta?: PaginationMeta | Record<string, any>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'RESEARCHER';
  fullName: string;
  iat?: number;
  exp?: number;
}
