"use client";

import useSWR from "swr";
import { jsonFetch } from "@/lib/client/http";

export type BoothProfile = {
  name: string;
  location: string | null;
  description: string | null;
};

type BoothProfileResponse = {
  booth: BoothProfile;
};

export function useBoothProfile(options?: { enabled?: boolean }) {
  const shouldFetch = options?.enabled ?? true;
  const { data, error, isValidating, mutate } = useSWR<BoothProfileResponse>(
    shouldFetch ? "/api/booth/profile" : null,
    (url: string) => jsonFetch<BoothProfileResponse>(url),
    {
      revalidateOnFocus: false,
    },
  );

  return {
    booth: data?.booth ?? null,
    error,
    isValidating,
    mutate,
  };
}
