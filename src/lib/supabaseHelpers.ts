/**
 * Supabase Query Helpers - DRY pattern pentru toate query-urile
 * Elimină cele 92 de duplicate din cod
 */

import { supabase } from '@/integrations/supabase/client';
import type { ApiError } from '@/types/shared';
import { logger } from './logger';

/**
 * Generic query helper cu error handling inclus
 */
export async function querySupabase<T>(
  builder: Promise<{ data: T | null; error: unknown }>
): Promise<T> {
  const { data, error } = await builder;
  
  if (error) {
    logger.error('Supabase query error:', error);
    throw createApiError(error);
  }
  
  if (!data) {
    throw createApiError('No data returned from query');
  }
  
  return data;
}

/**
 * Query cu rezultat optional (poate fi null)
 */
export async function querySupabaseOptional<T>(
  builder: Promise<{ data: T | null; error: unknown }>
): Promise<T | null> {
  const { data, error } = await builder;
  
  if (error) {
    logger.error('Supabase query error:', error);
    throw createApiError(error);
  }
  
  return data;
}

/**
 * Insert single record - wrapper pentru insert
 */
export function insertRecord(table: string, record: Record<string, unknown>) {
  return (supabase as any).from(table).insert(record).select().single();
}

/**
 * Insert multiple records - wrapper pentru insert  
 */
export function insertRecords(table: string, records: Record<string, unknown>[]) {
  return (supabase as any).from(table).insert(records).select();
}

/**
 * Update record by ID - wrapper pentru update
 */
export function updateRecord(table: string, id: string, updates: Record<string, unknown>) {
  return (supabase as any).from(table).update(updates).eq('id', id).select().single();
}

/**
 * Delete record by ID - wrapper pentru delete
 */
export function deleteRecord(table: string, id: string) {
  return (supabase as any).from(table).delete().eq('id', id);
}

/**
 * Fetch single record by ID - wrapper pentru select single
 */
export function fetchRecordById(table: string, id: string) {
  return (supabase as any).from(table).select('*').eq('id', id).single();
}

/**
 * Fetch records cu filtru - wrapper pentru select
 */
export function fetchRecords(table: string, filter?: { column: string; value: unknown }) {
  let query = (supabase as any).from(table).select('*');
  
  if (filter) {
    query = query.eq(filter.column, filter.value);
  }
  
  return query;
}

/**
 * Invoke edge function cu error handling
 */
export async function invokeEdgeFunction<TInput, TOutput>(
  functionName: string,
  payload: TInput
): Promise<TOutput> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    logger.error(`Edge function ${functionName} error:`, error);
    throw createApiError(error);
  }

  if (data?.error) {
    logger.error(`Edge function ${functionName} returned error:`, data.error);
    throw createApiError(data.error);
  }

  return data as TOutput;
}

/**
 * Fetch current user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    logger.error('Get user error:', error);
    throw createApiError(error);
  }
  
  if (!user) {
    throw createApiError('User not authenticated');
  }
  
  return user;
}

/**
 * Storage upload helper
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ path: string; url: string }> {
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file);

  if (uploadError) {
    logger.error('Upload error:', uploadError);
    throw createApiError(uploadError);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return { path, url: publicUrl };
}

/**
 * Storage download helper
 */
export async function downloadFile(
  bucket: string,
  path: string
): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(path);

  if (error) {
    logger.error('Download error:', error);
    throw createApiError(error);
  }

  if (!data) {
    throw createApiError('No file data returned');
  }

  return data;
}

/**
 * Creează ApiError din orice tip de eroare
 */
function createApiError(error: unknown): ApiError {
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'UNKNOWN_ERROR',
    };
  }

  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    return {
      message: (err.message as string) || (err.error as string) || 'Unknown error',
      code: (err.code as string) || 'UNKNOWN_ERROR',
      details: err.details as Record<string, unknown> | undefined,
      statusCode: err.statusCode as number | undefined,
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}
