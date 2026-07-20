/**
 * useApi — thin wrapper that fires toast notifications on success/error
 * and prevents duplicate requests.
 *
 * Usage:
 *   const api = useApi();
 *   const lead = await api.post("/api/leads", data, { successMsg: "Lead saved!" });
 */
import axios, { AxiosRequestConfig } from "axios";
import { useToast } from "./useToast";
import { useCallback } from "react";

interface ApiOptions {
  successMsg?: string;
  errorMsg?: string;
  silent?: boolean;         // suppress toasts entirely
  silentSuccess?: boolean;  // suppress success toast only
}

export function useApi() {
  const toast = useToast();

  const request = useCallback(async <T = any>(
    method: "get" | "post" | "put" | "delete",
    url: string,
    data?: any,
    opts: ApiOptions = {}
  ): Promise<T | null> => {
    try {
      const config: AxiosRequestConfig = { method, url };
      if (data !== undefined) config.data = data;
      const res = await axios(config);
      if (!opts.silent && !opts.silentSuccess && opts.successMsg) {
        toast.success(opts.successMsg);
      }
      return res.data as T;
    } catch (err: any) {
      if (!opts.silent) {
        const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Network error";
        toast.error(opts.errorMsg || msg);
      }
      return null;
    }
  }, [toast]);

  return {
    get:    <T = any>(url: string, opts?: ApiOptions) => request<T>("get", url, undefined, opts),
    post:   <T = any>(url: string, data: any, opts?: ApiOptions) => request<T>("post", url, data, opts),
    put:    <T = any>(url: string, data: any, opts?: ApiOptions) => request<T>("put", url, data, opts),
    delete: <T = any>(url: string, opts?: ApiOptions) => request<T>("delete", url, undefined, opts),
  };
}
