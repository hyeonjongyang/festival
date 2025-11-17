"use client";

import useSWR from "swr";
import { jsonFetch } from "@/lib/client/http";
import type { StudentDashboardData } from "@/types/api";

type StudentResponse = {
  student: StudentDashboardData;
};

type Options = {
  refreshInterval?: number;
  enabled?: boolean;
};

export function useStudentDashboard(
  initial?: StudentDashboardData | null,
  options: Options = {},
) {
  const { data, error, isValidating, mutate } = useSWR<StudentResponse>(
    options.enabled === false ? null : "/api/students/me",
    (url: string) => jsonFetch<StudentResponse>(url),
    {
      refreshInterval: options.refreshInterval ?? 20000,
      fallbackData: initial ? { student: initial } : undefined,
    },
  );

  return {
    student: data?.student ?? initial ?? null,
    error,
    isLoading: !data && !initial && !error,
    isValidating,
    mutate,
  };
}
