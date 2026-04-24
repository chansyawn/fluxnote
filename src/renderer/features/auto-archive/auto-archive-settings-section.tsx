import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS,
  DEFAULT_AUTO_ARCHIVE_SETTINGS,
  type AutoArchiveIdleMinute,
} from "@renderer/app/preferences/preferences-schema";
import { useAutoArchivePreference } from "@renderer/app/preferences/preferences-store";
import { queryClient } from "@renderer/app/query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/ui/components/select";
import { Switch } from "@renderer/ui/components/switch";

export function AutoArchiveSettingsSection() {
  const { i18n } = useLingui();
  const { autoArchive, patchAutoArchive } = useAutoArchivePreference();
  const preferences = autoArchive ?? DEFAULT_AUTO_ARCHIVE_SETTINGS;

  const savePreferences = (
    updater: (currentPreferences: typeof preferences) => typeof preferences,
  ) => {
    const nextPreferences = updater(preferences);
    patchAutoArchive(nextPreferences);
    void queryClient.invalidateQueries({ queryKey: ["blocks"] });
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
    <section className="flex flex-col gap-4">
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
          checked={preferences.enabled}
          onCheckedChange={(checked) => {
            savePreferences((currentPreferences) => ({
              ...currentPreferences,
              enabled: checked,
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
          value={String(preferences.idleMinutes)}
          onValueChange={(value) => {
            const nextIdleMinutes = Number(value);

            if (
              !AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS.includes(nextIdleMinutes as AutoArchiveIdleMinute)
            ) {
              return;
            }

            savePreferences((currentPreferences) => ({
              ...currentPreferences,
              idleMinutes: nextIdleMinutes as AutoArchiveIdleMinute,
            }));
          }}
        >
          <SelectTrigger className="w-full" disabled={!preferences.enabled}>
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
