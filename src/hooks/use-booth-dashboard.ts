"use client";

import useSWR from "swr";
import { jsonFetch } from "@/lib/client/http";
import type { BoothVisitsDashboard } from "@/types/api";

type BoothResponse = {
  dashboard: BoothVisitsDashboard;
};

export function useBoothDashboard(initial?: BoothVisitsDashboard | null, refreshInterval = 15000) {
  const { data, error, isValidating, mutate } = useSWR<BoothResponse>(
    "/api/visits/dashboard",
    (url: string) => jsonFetch<BoothResponse>(url),
    {
      refreshInterval,
      fallbackData: initial ? { dashboard: initial } : undefined,
    },
  );

  return {
    dashboard: data?.dashboard ?? initial ?? null,
    error,
    isValidating,
    mutate,
  };
}
