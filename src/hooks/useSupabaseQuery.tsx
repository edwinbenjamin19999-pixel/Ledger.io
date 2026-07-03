import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { safeSupabaseQuery, withRetry, handleApiError } from '@/lib/error-handler';
import { toast } from 'sonner';

interface SupabaseQueryOptions<T> extends Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'> { queryKey: string[];
  queryFn: () => Promise<{ data: T | null; error: any }>;
  context?: string;
}

interface SupabaseMutationOptions<T, V> extends Omit<UseMutationOptions<T, Error, V>, 'mutationFn'> { mutationFn: (variables: V) => Promise<{ data: T | null; error: any }>;
  context?: string;
  successMessage?: string;
}

/**
 * Enhanced useQuery hook with automatic retry and error handling för Supabase
 */
export function useSupabaseQuery<T>({ queryKey,
  queryFn,
  context,
  ...options
}: SupabaseQueryOptions<T>) { return useQuery<T | null>({ queryKey,
    queryFn: () => safeSupabaseQuery(queryFn, { context }),
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    staleTime: 30000, // 30 seconds
    ...options,
  });
}

/**
 * Enhanced useMutation hook with automatic retry and error handling för Supabase
 */
export function useSupabaseMutation<T, V = void>({ mutationFn,
  context,
  successMessage,
  ...options
}: SupabaseMutationOptions<T, V>) { const queryClient = useQueryClient();

  return useMutation<T | null, Error, V>({ mutationFn: async (variables) => { try { const result = await withRetry(async () => { const { data, error } = await mutationFn(variables);
          
          if (error) { throw error;
          }
          
          return data;
        });

        if (successMessage) { toast.success(successMessage);
        }

        return result;
      } catch (error) { handleApiError(error, context);
        throw error;
      }
    },
    onSuccess: (data, variables, context) => { // Invalidate relevant queries on success
      queryClient.invalidateQueries();
      options.onSuccess?.(data, variables, context);
    },
    ...options,
  });
}

/**
 * Hook för handling optimistic updates with automatic rollback on error
 */
export function useOptimisticMutation<T, V = void>(
  options: SupabaseMutationOptions<T, V> & { updateQueryKey: string[];
    optimisticUpdate: (oldData: any, variables: V) => any;
  }
) { const queryClient = useQueryClient();

  return useSupabaseMutation({ ...options,
    onMutate: async (variables) => { // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.updateQueryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(options.updateQueryKey);

      // Optimistically update
      queryClient.setQueryData(
        options.updateQueryKey,
        (old: any) => options.optimisticUpdate(old, variables)
      );

      return { previousData };
    },
    onError: (err, variables, context: any) => { // Rollback on error
      if (context?.previousData) { queryClient.setQueryData(options.updateQueryKey, context.previousData);
      }
      options.onError?.(err, variables, context);
    },
  });
}
