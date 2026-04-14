import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/app/query";
import {
  AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS,
  DEFAULT_AUTO_ARCHIVE_PREFERENCES,
  readAutoArchivePreferences,
  writeAutoArchivePreferences,
  type AutoArchivePreferences,
} from "@/features/auto-archive/auto-archive-store";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Switch } from "@/ui/components/switch";

const AUTO_ARCHIVE_PREFERENCES_QUERY_KEY = ["preferences", "auto-archive"] as const;

export function AutoArchiveSettingsSection() {
  const { i18n } = useLingui();
  const preferencesQuery = useQuery({
    queryKey: AUTO_ARCHIVE_PREFERENCES_QUERY_KEY,
    queryFn: readAutoArchivePreferences,
    staleTime: Infinity,
  });

  const preferences = preferencesQuery.data ?? DEFAULT_AUTO_ARCHIVE_PREFERENCES;
  const updatePreferencesMutation = useMutation({
    mutationKey: ["preferences", "auto-archive", "update"],
    mutationFn: writeAutoArchivePreferences,
    onSuccess: (nextPreferences) => {
      queryClient.setQueryData(AUTO_ARCHIVE_PREFERENCES_QUERY_KEY, nextPreferences);
      void queryClient.invalidateQueries({ queryKey: ["blocks"] });
    },
  });

  const savePreferences = async (
    updater: (currentPreferences: AutoArchivePreferences) => AutoArchivePreferences,
  ) => {
    const nextPreferences = updater(preferences);
    await updatePreferencesMutation.mutateAsync(nextPreferences);
  };
  const durationLabels: Record<number, string> = {
    1440: i18n._({
      id: "preferences.auto-archive.threshold.option.1-day",
      message: "1 day",
    }),
    4320: i18n._({
      id: "preferences.auto-archive.threshold.option.3-days",
      message: "3 days",
    }),
    10080: i18n._({
      id: "preferences.auto-archive.threshold.option.7-days",
      message: "7 days",
    }),
    43200: i18n._({
      id: "preferences.auto-archive.threshold.option.30-days",
      message: "30 days",
    }),
  };

  return (
    <section className="border-border/70 flex flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">
          <Trans id="preferences.auto-archive.title">Auto archive</Trans>
        </h2>
        <p className="text-muted-foreground text-xs">
          <Trans id="preferences.auto-archive.description">
            Blocks are scanned in the background and archived after the app hides.
          </Trans>
        </p>
      </div>

      <div className="border-border/70 flex items-center justify-between rounded-md border p-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-medium">
            <Trans id="preferences.auto-archive.enable.label">Enable auto-archive</Trans>
          </p>
          <p className="text-muted-foreground text-xs">
            <Trans id="preferences.auto-archive.enable.description">
              Expired blocks stay dimmed until the window is hidden.
            </Trans>
          </p>
        </div>
        <Switch
          checked={preferences.autoArchiveEnabled}
          disabled={updatePreferencesMutation.isPending}
          onCheckedChange={(checked) => {
            void savePreferences((currentPreferences) => ({
              ...currentPreferences,
              autoArchiveEnabled: checked,
            }));
          }}
        />
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-xs font-medium">
          <Trans id="preferences.auto-archive.threshold.label">Archive after</Trans>
        </span>
        <Select
          items={AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS.map((minutes) => ({
            value: String(minutes),
            label: durationLabels[minutes],
          }))}
          value={String(preferences.autoArchiveIdleMinutes)}
          onValueChange={(value) => {
            const nextIdleMinutes = Number(value);

            if (!Number.isFinite(nextIdleMinutes)) {
              return;
            }

            void savePreferences((currentPreferences) => ({
              ...currentPreferences,
              autoArchiveIdleMinutes: nextIdleMinutes,
            }));
          }}
        >
          <SelectTrigger className="w-full" disabled={!preferences.autoArchiveEnabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            <SelectGroup>
              {AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS.map((minutes) => (
                <SelectItem key={minutes} value={String(minutes)}>
                  {durationLabels[minutes]}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </label>
    </section>
  );
}
