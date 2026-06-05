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
} from "@fluxnotes/ui/components/alert-dialog";
import { Button } from "@fluxnotes/ui/components/button";
import { ButtonGroup } from "@fluxnotes/ui/components/button-group";
import { InputGroup, InputGroupInput } from "@fluxnotes/ui/components/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fluxnotes/ui/components/select";
import { toast } from "@fluxnotes/ui/components/sonner";
import { Switch } from "@fluxnotes/ui/components/switch";
import {
  ArchiveIcon,
  ClockIcon,
  DatabaseZapIcon,
  LoaderCircleIcon,
} from "@fluxnotes/ui/icons/lucide";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { deleteArchivedBlocks } from "@renderer/clients";
import { refreshBlocks } from "@renderer/features/blocks/block-query";
import { useAutoArchivePreference } from "@renderer/features/preferences/preferences-query";
import {
  PreferencesGroup,
  PreferencesRow,
  PreferencesSection,
} from "@renderer/routes/preferences/-features/preferences-list";
import {
  AUTO_ARCHIVE_DURATION_UNITS,
  AUTO_ARCHIVE_MAX_IDLE_MINUTES,
  toAutoArchiveDurationViewModel,
  toAutoArchiveIdleMinutes,
  type AutoArchiveDurationUnit,
} from "@shared/features/preferences/auto-archive";
import { DEFAULT_AUTO_ARCHIVE_PREFERENCES } from "@shared/features/preferences/user-preferences";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

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

function normalizeAmountEditText(value: string): string | null {
  return /^\d*$/.test(value) ? value : null;
}

function clampAmount(amount: number, unit: AutoArchiveDurationUnit): number {
  return Math.min(Math.max(amount, 1), MAX_DURATION_BY_UNIT[unit]);
}

export function AutoArchivePreferencesSection() {
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
  const preferences = autoArchive ?? DEFAULT_AUTO_ARCHIVE_PREFERENCES;
  const duration = toAutoArchiveDurationViewModel(preferences.idleMinutes);
  const [amountText, setAmountTextState] = useState(String(duration.amount));
  const [unit, setUnitState] = useState<AutoArchiveDurationUnit>(duration.unit);
  const amountTextRef = useRef(String(duration.amount));
  const unitRef = useRef<AutoArchiveDurationUnit>(duration.unit);
  const isAmountFocusedRef = useRef(false);
  const unitLabels: Record<AutoArchiveDurationUnit, string> = {
    days: i18n._({ id: "preferences.auto-archive.unit.days", message: "days" }),
    hours: i18n._({ id: "preferences.auto-archive.unit.hours", message: "hours" }),
    minutes: i18n._({ id: "preferences.auto-archive.unit.minutes", message: "minutes" }),
  };
  const unitItems = AUTO_ARCHIVE_DURATION_UNITS.map((durationUnit) => ({
    label: unitLabels[durationUnit],
    value: durationUnit,
  }));
  const thresholdAmountLabel = i18n._({
    id: "preferences.auto-archive.threshold.amount.label",
    message: "Auto archive duration amount",
  });
  const thresholdUnitLabel = i18n._({
    id: "preferences.auto-archive.threshold.unit.label",
    message: "Auto archive duration unit",
  });
  const enableAutoArchiveLabel = i18n._({
    id: "preferences.auto-archive.enable.label",
    message: "Enable auto-archive",
  });

  const setAmountText = (value: string) => {
    amountTextRef.current = value;
    setAmountTextState(value);
  };

  const setUnit = (value: AutoArchiveDurationUnit) => {
    unitRef.current = value;
    setUnitState(value);
  };

  useEffect(() => {
    if (isAmountFocusedRef.current) {
      return;
    }

    const nextDuration = toAutoArchiveDurationViewModel(preferences.idleMinutes, unitRef.current);
    amountTextRef.current = String(nextDuration.amount);
    setAmountTextState(String(nextDuration.amount));
    unitRef.current = nextDuration.unit;
    setUnitState(nextDuration.unit);
  }, [preferences.idleMinutes]);

  const savePreferences = (
    updater: (currentPreferences: typeof preferences) => typeof preferences,
  ) => {
    const nextPreferences = updater(preferences);
    return patchAutoArchive(nextPreferences);
  };

  const saveIdleMinutes = (idleMinutes: number) => {
    return savePreferences((currentPreferences) => ({
      ...currentPreferences,
      idleMinutes,
    }));
  };

  const handleAmountChange = (value: string): boolean => {
    const nextAmountText = normalizeAmountEditText(value);
    if (nextAmountText === null) {
      return false;
    }

    setAmountText(nextAmountText);
    return true;
  };

  const restoreAmountFromPreferences = () => {
    const nextDuration = toAutoArchiveDurationViewModel(preferences.idleMinutes, unitRef.current);
    setAmountText(String(nextDuration.amount));
    setUnit(nextDuration.unit);
  };

  const handleAmountBlur = () => {
    isAmountFocusedRef.current = false;

    const nextAmount = parseAmountText(amountTextRef.current) ?? 1;
    const clampedAmount = clampAmount(nextAmount, unitRef.current);
    const nextIdleMinutes = toAutoArchiveIdleMinutes({
      amount: clampedAmount,
      unit: unitRef.current,
    });
    if (nextIdleMinutes === null) {
      restoreAmountFromPreferences();
      return;
    }

    setAmountText(String(clampedAmount));
    void saveIdleMinutes(nextIdleMinutes).catch(() => {
      restoreAmountFromPreferences();
    });
  };

  const handleUnitChange = (value: AutoArchiveDurationUnit | null) => {
    if (!value) {
      return;
    }

    const currentAmount = parseAmountText(amountTextRef.current);
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
    void saveIdleMinutes(nextIdleMinutes).catch(() => {
      restoreAmountFromPreferences();
    });
  };

  return (
    <PreferencesSection title={<Trans id="preferences.archive.title">Archive</Trans>}>
      <PreferencesGroup>
        <PreferencesRow
          control={
            <Switch
              aria-label={enableAutoArchiveLabel}
              checked={preferences.enabled}
              onCheckedChange={(checked) => {
                void savePreferences((currentPreferences) => ({
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
          icon={<ArchiveIcon />}
          label={<Trans id="preferences.auto-archive.enable.label">Enable auto-archive</Trans>}
        />
        <PreferencesRow
          control={
            <div className="flex items-center gap-2">
              <ButtonGroup>
                <InputGroup>
                  <InputGroupInput
                    aria-label={thresholdAmountLabel}
                    className="w-16"
                    disabled={!preferences.enabled}
                    inputMode="numeric"
                    max={MAX_DURATION_BY_UNIT[unit]}
                    min={1}
                    onBlur={handleAmountBlur}
                    onChange={(event) => {
                      if (!handleAmountChange(event.target.value)) {
                        event.target.value = amountTextRef.current;
                      }
                    }}
                    onFocus={() => {
                      isAmountFocusedRef.current = true;
                    }}
                    step={1}
                    type="text"
                    value={amountText}
                  />
                </InputGroup>
                <Select items={unitItems} value={unit} onValueChange={handleUnitChange}>
                  <SelectTrigger aria-label={thresholdUnitLabel} disabled={!preferences.enabled}>
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
          icon={<ClockIcon />}
          label={<Trans id="preferences.auto-archive.threshold.label">Auto archive after</Trans>}
        />
        <PreferencesRow
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
          icon={<DatabaseZapIcon />}
          label={<Trans id="preferences.archive.clear.label">Clear archived data</Trans>}
        />
      </PreferencesGroup>
    </PreferencesSection>
  );
}
