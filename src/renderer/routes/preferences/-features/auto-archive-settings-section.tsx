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
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/ui/components/select";
import { Switch } from "@renderer/ui/components/switch";
import { ArchiveIcon, ClockIcon } from "lucide-react";

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
    <SettingsSection title={<Trans id="preferences.auto-archive.title">Auto archive</Trans>}>
      <SettingsGroup>
        <SettingsRow
          control={
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(checked) => {
                savePreferences((currentPreferences) => ({
                  ...currentPreferences,
                  enabled: checked,
                }));
              }}
            />
          }
          icon={ArchiveIcon}
          label={<Trans id="preferences.auto-archive.enable.label">Enable auto-archive</Trans>}
        />
        <SettingsRow
          control={
            <Select
              items={AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS.map((minutes) => ({
                value: String(minutes),
                label: durationLabels[minutes],
              }))}
              value={String(preferences.idleMinutes)}
              onValueChange={(value) => {
                const nextIdleMinutes = Number(value);

                if (
                  !AUTO_ARCHIVE_IDLE_MINUTE_OPTIONS.includes(
                    nextIdleMinutes as AutoArchiveIdleMinute,
                  )
                ) {
                  return;
                }

                savePreferences((currentPreferences) => ({
                  ...currentPreferences,
                  idleMinutes: nextIdleMinutes as AutoArchiveIdleMinute,
                }));
              }}
            >
              <SelectTrigger disabled={!preferences.enabled}>
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
          }
          icon={ClockIcon}
          label={<Trans id="preferences.auto-archive.threshold.label">Archive after</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
