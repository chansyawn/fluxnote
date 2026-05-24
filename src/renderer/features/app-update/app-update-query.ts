import { useLingui } from "@lingui/react";
import {
  checkForAppUpdate,
  getAppUpdateStatus,
  onAppUpdateChanged,
  toAppInvokeError,
  type AppUpdateStatus,
} from "@renderer/clients";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

export const APP_UPDATE_QUERY_KEY = ["app-update", "status"] as const;

export function AppUpdateSync() {
  const { i18n } = useLingui();
  const queryClient = useQueryClient();

  useEffect(() => {
    return onAppUpdateChanged((status) => {
      const previousStatus = queryClient.getQueryData<AppUpdateStatus>(APP_UPDATE_QUERY_KEY);
      queryClient.setQueryData<AppUpdateStatus>(APP_UPDATE_QUERY_KEY, status);
      if (status.state === "error" && status.lastCheckSource === "manual") {
        toast.error(
          status.errorMessage ??
            i18n._({
              id: "app-update.check.error",
              message: "Failed to check for updates.",
            }),
        );
      }
      if (status.state === "unavailable" && status.lastCheckSource === "manual") {
        toast.info(
          i18n._({
            id: "app-update.check.up-to-date",
            message: "Fluxnotes is up to date.",
          }),
        );
      }
      if (
        status.state === "ready" &&
        status.lastCheckSource === "manual" &&
        previousStatus?.state === "checking" &&
        previousStatus.availableVersion &&
        previousStatus.availableVersion === status.availableVersion
      ) {
        toast.info(
          i18n._({
            id: "app-update.check.ready-latest",
            message: "The downloaded update is the latest available version.",
          }),
        );
      }
    });
  }, [i18n, queryClient]);

  return null;
}

export function useAppUpdateStatusQuery() {
  return useQuery({
    queryKey: APP_UPDATE_QUERY_KEY,
    queryFn: getAppUpdateStatus,
  });
}

export function useManualAppUpdateCheckMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => checkForAppUpdate({ source: "manual" }),
    onError: (error) => {
      toast.error(toAppInvokeError(error).message);
    },
    onSuccess: (status) => {
      queryClient.setQueryData<AppUpdateStatus>(APP_UPDATE_QUERY_KEY, status);
    },
  });
}
