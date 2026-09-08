/**
 * V18 — useApiQuery smoke tests
 *
 * Verifies the hook family is wired correctly to TanStack Query
 * v5. The convertor pattern itself is tested per-service (see
 * V18.2.2 for the weather example); this file only proves the
 * hook layer is a thin, correct pass-through.
 *
 * Pattern note: @testing-library/react-native v14 binds the global
 * `screen` to the most recent `render()` call. We use `screen` +
 * `waitFor` for assertions (this matches the existing AppButton /
 * AppText test style). For async TanStack state changes, the
 * `getByText` inside `waitFor` polls until the text appears or
 * the timeout fires.
 */
import React from 'react';
import {Text} from 'react-native';
import {render, screen, waitFor, fireEvent} from '@testing-library/react-native';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {
  useApiQuery,
  useInfiniteApiQuery,
  useApiMutation,
  useApiQueries,
} from '../src/hooks/useApiQuery';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {retry: false, gcTime: 0},
      mutations: {retry: false},
    },
  });
  return ({children}: {children: React.ReactNode}) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useApiQuery', () => {
  it('calls the fetcher on mount and exposes the returned data', async () => {
    const fetcher = jest.fn().mockResolvedValue({id: '1', title: 'A'});
    function Probe() {
      const {data, isLoading} = useApiQuery<{id: string; title: string}>({
        queryKey: ['test', 'single'],
        queryFn: fetcher,
      });
      if (isLoading) return <Text>loading</Text>;
      return <Text>title={data?.title}</Text>;
    }
    render(<Probe />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('title=A')).toBeTruthy();
    });
    // Note: we don't assert `toHaveBeenCalledTimes(1)` — TanStack may
    // refetch on focus / mount-replay, and the exact count is not
    // the contract this test is verifying. Just confirm the fetcher
    // fired and the data made it to the screen.
    expect(fetcher).toHaveBeenCalled();
  });

  it('surfaces the error when the fetcher rejects', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    function Probe() {
      const {isError, error} = useApiQuery<unknown>({
        queryKey: ['test', 'error'],
        queryFn: fetcher,
      });
      if (isError) {
        const msg = (error as Error)?.message ?? 'unknown';
        return <Text>err={msg}</Text>;
      }
      return <Text>loading</Text>;
    }
    render(<Probe />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('err=boom')).toBeTruthy();
    });
  });

  it('treats different queryKeys as independent caches', async () => {
    const fetcherA = jest.fn().mockResolvedValue('A');
    const fetcherB = jest.fn().mockResolvedValue('B');
    function Probe() {
      const a = useApiQuery<string>({queryKey: ['t', 'a'], queryFn: fetcherA});
      const b = useApiQuery<string>({queryKey: ['t', 'b'], queryFn: fetcherB});
      return <Text>{`${a.data ?? '?'}/${b.data ?? '?'}`}</Text>;
    }
    render(<Probe />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('A/B')).toBeTruthy();
    });
    expect(fetcherA).toHaveBeenCalled();
    expect(fetcherB).toHaveBeenCalled();
  });
});

describe('useApiMutation', () => {
  it('calls the mutation function and exposes the result', async () => {
    const mutator = jest.fn().mockResolvedValue({ok: true});
    function Trigger() {
      const m = useApiMutation<{ok: boolean}, void>({mutationFn: mutator});
      if (m.isPending) return <Text>pending</Text>;
      if (m.isError) return <Text>err</Text>;
      if (m.data) return <Text>ok={String(m.data.ok)}</Text>;
      return <Text onPress={() => m.mutate()}>tap-to-mutate</Text>;
    }
    render(<Trigger />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('tap-to-mutate')).toBeTruthy();
    });
    fireEvent.press(screen.getByText('tap-to-mutate'));
    await waitFor(() => {
      expect(screen.getByText('ok=true')).toBeTruthy();
    });
    expect(mutator).toHaveBeenCalled();
  });
});

describe('useInfiniteApiQuery', () => {
  it('fetches the first page and exposes page params', async () => {
    const pageFetcher = jest.fn().mockResolvedValue(['p1-item-1', 'p1-item-2']);
    function Probe() {
      const q = useInfiniteApiQuery<string[]>({
        queryKey: ['test', 'infinite'],
        queryFn: pageFetcher,
        initialPageParam: 1,
        getNextPageParam: (_lastPage, _pages, lastPageParam) => {
          // TanStack v5 types lastPageParam as `unknown`; guard before
          // treating it as a number.
          if (typeof lastPageParam !== 'number') return undefined;
          if (lastPageParam >= 2) return undefined;
          return lastPageParam + 1;
        },
      });
      if (q.isLoading) return <Text>loading</Text>;
      const items = (q.data?.pages ?? []).flat();
      return (
        <Text>{`items=${items.length} nextParam=${String(
          q.data?.pageParams.at(-1),
        )}`}</Text>
      );
    }
    render(<Probe />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('items=2 nextParam=1')).toBeTruthy();
    });
    expect(pageFetcher).toHaveBeenCalled();
  });
});

describe('useApiQueries (V18.6 — parallel queries)', () => {
  it('calls all fetchers in parallel and combines the results', async () => {
    const fetcherA = jest.fn().mockResolvedValue('a-data');
    const fetcherB = jest.fn().mockResolvedValue('b-data');
    type SourceResult = {data: string | undefined};
    function Probe() {
      const result = useApiQueries({
        queries: [
          {queryKey: ['parallel', 'a'], queryFn: fetcherA},
          {queryKey: ['parallel', 'b'], queryFn: fetcherB},
        ],
        combine: results => {
          const [a, b] = results as ReadonlyArray<SourceResult>;
          return {
            raw: [a.data ?? 'a-empty', b.data ?? 'b-empty'],
            joined: `${a.data ?? 'a-empty'}|${b.data ?? 'b-empty'}`,
          };
        },
      });
      return <Text>joined={result.joined}</Text>;
    }
    render(<Probe />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('joined=a-data|b-data')).toBeTruthy();
    });
    expect(fetcherA).toHaveBeenCalled();
    expect(fetcherB).toHaveBeenCalled();
  });

  it('isolates per-source errors (a failed source returns undefined data; the other still renders)', async () => {
    const fetcherA = jest.fn().mockResolvedValue('a-data');
    const fetcherB = jest.fn().mockRejectedValue(new Error('b-boom'));
    type SourceResult = {data: string | undefined};
    function Probe() {
      const result = useApiQueries({
        queries: [
          {queryKey: ['iso', 'a'], queryFn: fetcherA},
          {queryKey: ['iso', 'b'], queryFn: fetcherB},
        ],
        combine: results => {
          const [a, b] = results as ReadonlyArray<SourceResult>;
          return `a=${a.data ?? 'undefined'} b=${b.data ?? 'undefined'}`;
        },
      });
      return <Text>{result}</Text>;
    }
    render(<Probe />, {wrapper: makeWrapper()});
    await waitFor(() => {
      expect(screen.getByText('a=a-data b=undefined')).toBeTruthy();
    });
  });
});
