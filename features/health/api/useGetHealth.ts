import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

export const useGetHealth = () => {
  const params = useSearchParams();
  const from = params.get('from') || '';
  const to = params.get('to') || '';

  const query = useQuery({
    queryKey: ['health', { from, to }],
    queryFn: async () => {
      const response = await client.api.health.$get({ query: { from, to } });

      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }

      const { data } = await response.json();

      return data;
    }
  });

  return query;
}
