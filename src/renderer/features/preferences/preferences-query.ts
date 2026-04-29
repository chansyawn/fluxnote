import { toAppInvokeError } from "@renderer/app/invoke";
import { patchSettings, readSettings, resetSettings } from "@renderer/clients/preferences-client";
import {
  DEFAULT_SETTINGS,
  type AutoArchiveSettings,
  type FontSize,
  type LocaleCode,
  type Settings,
  type SettingsPatch,
  type ShortcutAction,
} from "@shared/features/preferences";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

import { normalizeShortcutPreferences, type ShortcutBinding } from "../shortcut/shortcut-utils";

export const SETTINGS_QUERY_KEY = ["preferences", "settings"] as const;

export function useSettingsQuery() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: readSettings,
    placeholderData: DEFAULT_SETTINGS,
  });
}

function showSettingsError(error: unknown): void {
  toast.error(toAppInvokeError(error).message);
}

export function usePatchSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchSettings,
    onError: showSettingsError,
    onSuccess: (settings) => {
      queryClient.setQueryData<Settings>(SETTINGS_QUERY_KEY, settings);
    },
  });
}

export function useResetSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetSettings,
    onError: showSettingsError,
    onSuccess: (settings) => {
      queryClient.setQueryData<Settings>(SETTINGS_QUERY_KEY, settings);
    },
  });
}

function useSettingsValue(): Settings {
  return useSettingsQuery().data ?? DEFAULT_SETTINGS;
}

export function useLocalePreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const setLocale = useCallback(
    (locale: LocaleCode) => {
      mutation.mutate({ appearance: { locale } });
    },
    [mutation],
  );

  return {
    locale: settings.appearance.locale,
    setLocale,
  };
}

export function useAutoArchivePreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const patchAutoArchive = useCallback(
    (patch: Partial<AutoArchiveSettings>) => {
      mutation.mutate({ autoArchive: patch });
    },
    [mutation],
  );

  return {
    autoArchive: settings.autoArchive,
    patchAutoArchive,
  };
}

export function useShortcutPreferences() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const shortcuts = normalizeShortcutPreferences(settings.shortcuts);

  const patchShortcuts = useCallback(
    (patch: NonNullable<SettingsPatch["shortcuts"]>) => {
      mutation.mutate({ shortcuts: patch });
    },
    [mutation],
  );
  const setShortcut = useCallback(
    (action: ShortcutAction, shortcut: ShortcutBinding) => {
      patchShortcuts({ [action]: shortcut });
    },
    [patchShortcuts],
  );
  const clearShortcut = useCallback(
    (action: ShortcutAction) => {
      patchShortcuts({ [action]: null });
    },
    [patchShortcuts],
  );
  const resetShortcut = useCallback(
    (action: ShortcutAction) => {
      patchShortcuts({ [action]: DEFAULT_SETTINGS.shortcuts[action] });
    },
    [patchShortcuts],
  );

  return {
    shortcuts,
    setShortcut,
    clearShortcut,
    resetShortcut,
  };
}

export function useFontSizePreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const setFontSize = useCallback(
    (fontSize: FontSize) => {
      mutation.mutate({ appearance: { fontSize } });
    },
    [mutation],
  );

  return {
    fontSize: settings.appearance.fontSize,
    setFontSize,
  };
}
