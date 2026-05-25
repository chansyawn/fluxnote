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

function isSameLastCheck(left: AppUpdateStatus | undefined, right: AppUpdateStatus): boolean {
  if (!("lastCheck" in right) || !right.lastCheck) {
    return true;
  }

  if (!left || !("lastCheck" in left) || !left.lastCheck) {
    return false;
  }

  return (
    left.lastCheck.checkedAt === right.lastCheck.checkedAt &&
    left.lastCheck.outcome === right.lastCheck.outcome &&
    left.lastCheck.source === right.lastCheck.source
  );
}

export function AppUpdateSync() {
  const { i18n } = useLingui();
  const queryClient = useQueryClient();

  useEffect(() => {
    return onAppUpdateChanged((status) => {
      const previousStatus = queryClient.getQueryData<AppUpdateStatus>(APP_UPDATE_QUERY_KEY);
      queryClient.setQueryData<AppUpdateStatus>(APP_UPDATE_QUERY_KEY, status);
      if (
        isSameLastCheck(previousStatus, status) ||
        !("lastCheck" in status) ||
        !status.lastCheck
      ) {
        return;
      }

      if (status.lastCheck.outcome === "failed" && status.lastCheck.source === "manual") {
        toast.error(
          status.lastCheck.errorMessage ??
            i18n._({
              id: "app-update.check.error",
              message: "Failed to check for updates.",
            }),
        );
      }
      if (status.lastCheck.outcome === "up-to-date" && status.lastCheck.source === "manual") {
        toast.info(
          i18n._({
            id: "app-update.check.up-to-date",
            message: "Fluxnotes is up to date.",
          }),
        );
      }
      if (status.lastCheck.outcome === "ready-latest" && status.lastCheck.source === "manual") {
        toast.info(
          i18n._({
            id: "app-update.check.ready-latest",
            message: "The downloaded update is the latest available version.",
          }),
        );
      }
      if (status.lastCheck.outcome === "newer-update") {
        toast.info(
          i18n._({
            id: "app-update.check.newer-update",
            message: "A newer update was found and is downloading.",
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
