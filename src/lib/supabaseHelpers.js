// Generic database CRUD operations with error handling
import { supabase } from './supabaseClient';

/**
 * Generic GET operation
 * @param {string} table - Table name
 * @param {object} filters - Key-value pairs for filtering (eq)
 * @param {object} options - Additional options (select, order, limit)
 * @returns {Promise<{data, error}>}
 */
export const dbGet = async (table, filters = {}, options = {}) => {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    let query = supabase.from(table).select(options.select || '*');

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    // Apply ordering
    if (options.order) {
      query = query.order(options.order.column, {
        ascending: options.order.ascending !== false,
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error fetching from ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Generic INSERT operation
 * @param {string} table - Table name
 * @param {object|array} records - Record(s) to insert
 * @param {boolean} returnSingle - Return single record (default: true for single record)
 * @returns {Promise<{data, error}>}
 */
export const dbInsert = async (table, records, returnSingle = true) => {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    let query = supabase.from(table).insert(records).select();

    if (returnSingle && !Array.isArray(records)) {
      query = query.single();
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error inserting into ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Generic UPDATE operation
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @param {object} updates - Fields to update
 * @returns {Promise<{data, error}>}
 */
export const dbUpdate = async (table, id, updates) => {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error updating ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Generic DELETE operation
 * @param {string} table - Table name
 * @param {string} id - Record ID
 * @returns {Promise<{error}>}
 */
export const dbDelete = async (table, id) => {
  if (!supabase) {
    return { error: { message: 'Supabase not configured' } };
  }

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error(`Error deleting from ${table}:`, error);
    return { error };
  }
};

/**
 * Generic UPSERT operation
 * @param {string} table - Table name
 * @param {object|array} records - Record(s) to upsert
 * @param {string} onConflict - Conflict columns (comma-separated)
 * @returns {Promise<{data, error}>}
 */
export const dbUpsert = async (table, records, onConflict) => {
  if (!supabase) {
    return { data: null, error: { message: 'Supabase not configured' } };
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(records, { onConflict })
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error(`Error upserting ${table}:`, error);
    return { data: null, error };
  }
};

/**
 * Optimistic update utility
 * Applies update immediately to local state, then syncs with database
 * Rolls back on error
 *
 * @param {function} localUpdate - Function that updates local state (returns new state)
 * @param {function} dbUpdate - Async function that updates database
 * @param {function} rollback - Function to rollback local state on error
 * @returns {Promise<{success, error}>}
 */
export const optimisticUpdate = async (localUpdate, dbUpdateFn, rollback) => {
  // Apply local update immediately
  const newState = localUpdate();

  try {
    // Attempt database update
    const { error } = await dbUpdateFn();

    if (error) {
      // Rollback on error
      rollback(newState);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    // Rollback on exception
    rollback(newState);
    return { success: false, error };
  }
};

/**
 * Batch operation helper
 * Executes multiple database operations and returns combined results
 *
 * @param {Array<Promise>} operations - Array of database operations
 * @returns {Promise<{successes, errors}>}
 */
export const batchOperation = async (operations) => {
  const results = await Promise.allSettled(operations);

  const successes = results
    .filter((r) => r.status === 'fulfilled' && !r.value.error)
    .map((r) => r.value.data);

  const errors = results
    .filter((r) => r.status === 'rejected' || r.value?.error)
    .map((r) => r.reason || r.value.error);

  return { successes, errors };
};

/**
 * Wait for database operation with timeout
 *
 * @param {Promise} operation - Database operation
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise<{data, error, timedOut}>}
 */
export const dbWithTimeout = async (operation, timeoutMs = 10000) => {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Database operation timed out')), timeoutMs)
  );

  try {
    const result = await Promise.race([operation, timeout]);
    return { ...result, timedOut: false };
  } catch (error) {
    if (error.message === 'Database operation timed out') {
      return { data: null, error, timedOut: true };
    }
    return { data: null, error, timedOut: false };
  }
};
