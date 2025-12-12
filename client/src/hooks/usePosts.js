import { useInfiniteQuery } from '@tanstack/react-query';
import { useFetchWithAuth } from '../utils/fetchWithAuth';

export const usePosts = () => {
  const fetchWithAuth = useFetchWithAuth();

  return useInfiniteQuery({
    queryKey: ['posts', 'friends'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetchWithAuth(
        "GET", 
        `/api/posts/friends?limit=10&skip=${pageParam}`
      );
      return res.data;
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.length < 10) return undefined;
      return pages.length * 10;
    },
  });
};