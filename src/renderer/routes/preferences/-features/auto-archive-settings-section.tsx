import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { deleteArchivedBlocks } from "@renderer/clients";
import { refreshBlocks } from "@renderer/features/blocks/block-query";
import { useAutoArchivePreference } from "@renderer/features/preferences/preferences-query";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@renderer/ui/components/alert-dialog";
import { Button } from "@renderer/ui/components/button";
import { ButtonGroup } from "@renderer/ui/components/button-group";
import { InputGroup, InputGroupInput } from "@renderer/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/ui/components/select";
import { Switch } from "@renderer/ui/components/switch";
import {
  AUTO_ARCHIVE_DURATION_UNITS,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  toAutoArchiveDurationViewModel,
  toAutoArchiveIdleMinutes,
  type AutoArchiveDurationUnit,
} from "@shared/features/preferences/auto-archive";
import { DEFAULT_AUTO_ARCHIVE_SETTINGS } from "@shared/features/preferences/settings";
import { useMutation } from "@tanstack/react-query";
import { ArchiveIcon, ClockIcon, DatabaseZapIcon, LoaderCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const MAX_DURATION_BY_UNIT: Record<AutoArchiveDurationUnit, number> = {
  days: Math.floor(AUTO_ARCHIVE_MAX_IDLE_MINUTES / (24 * 60)),
  hours: Math.floor(AUTO_ARCHIVE_MAX_IDLE_MINUTES / 60),
  minutes: AUTO_ARCHIVE_MAX_IDLE_MINUTES,
};

function parseAmountText(value: string): number | null {
  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  return Number(trimmedValue);
}

function clampAmount(amount: number, unit: AutoArchiveDurationUnit): number {
  return Math.min(Math.max(amount, 1), MAX_DURATION_BY_UNIT[unit]);
}

export function AutoArchiveSettingsSection() {
  const { i18n } = useLingui();
  const { autoArchive, patchAutoArchive } = useAutoArchivePreference();
  const deleteArchivedBlocksMutation = useMutation({
    mutationKey: ["blocks", "delete-archived"],
    mutationFn: deleteArchivedBlocks,
    onSuccess: () => {
      refreshBlocks();
      toast.success(
        i18n._({
          id: "preferences.archive.clear.success",
          message: "Archived data cleared.",
        }),
      );
    },
    onError: (error) => {
      console.error("Failed to clear archived data.", error);
      toast.error(
        i18n._({
          id: "preferences.archive.clear.error",
          message: "Failed to clear archived data.",
        }),
      );
    },
  });
  const preferences = autoArchive ?? DEFAULT_AUTO_ARCHIVE_SETTINGS;
  const duration = toAutoArchiveDurationViewModel(preferences.idleMinutes);
  const [amountText, setAmountText] = useState(String(duration.amount));
  const [unit, setUnit] = useState<AutoArchiveDurationUnit>(duration.unit);
  const unitLabels: Record<AutoArchiveDurationUnit, string> = {
    days: i18n._({ id: "preferences.auto-archive.unit.days", message: "days" }),
    hours: i18n._({ id: "preferences.auto-archive.unit.hours", message: "hours" }),
    minutes: i18n._({ id: "preferences.auto-archive.unit.minutes", message: "minutes" }),
  };
  const unitItems = AUTO_ARCHIVE_DURATION_UNITS.map((durationUnit) => ({
    label: unitLabels[durationUnit],
    value: durationUnit,
  }));

  useEffect(() => {
    const nextDuration = toAutoArchiveDurationViewModel(preferences.idleMinutes);
    setAmountText(String(nextDuration.amount));
    setUnit(nextDuration.unit);
  }, [preferences.idleMinutes]);

  const savePreferences = (
    updater: (currentPreferences: typeof preferences) => typeof preferences,
  ) => {
    const nextPreferences = updater(preferences);
    patchAutoArchive(nextPreferences);
    refreshBlocks();
  };

  const saveIdleMinutes = (idleMinutes: number) => {
    savePreferences((currentPreferences) => ({
      ...currentPreferences,
      idleMinutes,
    }));
  };

  const handleAmountChange = (value: string) => {
    const nextAmount = parseAmountText(value);
    if (nextAmount === null) {
      return;
    }

    const clampedAmount = clampAmount(nextAmount, unit);
    const nextIdleMinutes = toAutoArchiveIdleMinutes({ amount: clampedAmount, unit });
    if (nextIdleMinutes === null) {
      return;
    }

    setAmountText(String(clampedAmount));
    saveIdleMinutes(nextIdleMinutes);
  };

  const handleUnitChange = (value: AutoArchiveDurationUnit | null) => {
    if (!value) {
      return;
    }

    const currentAmount = parseAmountText(amountText);
    if (currentAmount === null) {
      return;
    }

    const clampedAmount = clampAmount(currentAmount, value);
    const nextIdleMinutes = toAutoArchiveIdleMinutes({
      amount: clampedAmount,
      unit: value,
    });
    if (nextIdleMinutes === null) {
      return;
    }

    setAmountText(String(clampedAmount));
    setUnit(value);
    saveIdleMinutes(nextIdleMinutes);
  };

  return (
    <SettingsSection title={<Trans id="preferences.archive.title">Archive</Trans>}>
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
          description={
            <Trans id="preferences.auto-archive.enable.description">
              When enabled, blocks with no content changes for the configured duration enter a
              pending state. Actual archiving runs when the window is hidden, and pending blocks
              appear dimmed.
            </Trans>
          }
          icon={ArchiveIcon}
          label={<Trans id="preferences.auto-archive.enable.label">Enable auto-archive</Trans>}
        />
        <SettingsRow
          control={
            <div className="flex items-center gap-2">
              <ButtonGroup>
                <InputGroup>
                  <InputGroupInput
                    className="w-fit"
                    disabled={!preferences.enabled}
                    inputMode="numeric"
                    max={MAX_DURATION_BY_UNIT[unit]}
                    min={1}
                    onChange={(event) => {
                      handleAmountChange(event.target.value);
                    }}
                    step={1}
                    type="number"
                    value={amountText}
                  />
                </InputGroup>
                <Select items={unitItems} value={unit} onValueChange={handleUnitChange}>
                  <SelectTrigger disabled={!preferences.enabled}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false}>
                    <SelectGroup>
                      {AUTO_ARCHIVE_DURATION_UNITS.map((durationUnit) => (
                        <SelectItem key={durationUnit} value={durationUnit}>
                          {unitLabels[durationUnit]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </ButtonGroup>
            </div>
          }
          controlClassName="min-w-0"
          description={
            <Trans id="preferences.auto-archive.threshold.range-tooltip">
              Range: 1-20160 minutes, 1-336 hours, or 1-14 days.
            </Trans>
          }
          icon={ClockIcon}
          label={<Trans id="preferences.auto-archive.threshold.label">Auto archive after</Trans>}
        />
        <SettingsRow
          control={
            <AlertDialog>
              <AlertDialogTrigger
                disabled={deleteArchivedBlocksMutation.isPending}
                render={
                  <Button size="sm" variant="destructive">
                    {deleteArchivedBlocksMutation.isPending ? (
                      <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                    ) : null}
                    <Trans id="preferences.archive.clear.action">Clear</Trans>
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <Trans id="preferences.archive.clear.dialog.title">Clear archived data?</Trans>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <Trans id="preferences.archive.clear.dialog.description">
                      This permanently deletes all archived blocks. Active blocks and tags are kept.
                    </Trans>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteArchivedBlocksMutation.isPending}>
                    <Trans id="preferences.archive.clear.dialog.cancel">Cancel</Trans>
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteArchivedBlocksMutation.isPending}
                    variant="destructive"
                    onClick={() => {
                      deleteArchivedBlocksMutation.mutate();
                    }}
                  >
                    {deleteArchivedBlocksMutation.isPending ? (
                      <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                    ) : null}
                    <Trans id="preferences.archive.clear.dialog.confirm">Clear archive</Trans>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
          description={
            <Trans id="preferences.archive.clear.description">
              Permanently delete every archived block. Active blocks and tags are not affected.
            </Trans>
          }
          icon={DatabaseZapIcon}
          label={<Trans id="preferences.archive.clear.label">Clear archived data</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
