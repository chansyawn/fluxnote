import {
  onPreferencesChanged,
  patchSettings,
  readSettings,
  resetSettings,
  toAppInvokeError,
} from "@renderer/clients";
import {
  DEFAULT_SETTINGS,
  type AppUpdateSettings,
  type AutoArchiveSettings,
  type FontSize,
  type LocaleCode,
  type MarkdownCodeBlockSettings,
  type Settings,
  type SettingsPatch,
  type ShortcutAction,
  type TelemetrySettings,
  type ThemePreference,
} from "@shared/features/preferences/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { normalizeShortcutPreferences, type ShortcutBinding } from "../shortcut/shortcut-utils";

export const SETTINGS_QUERY_KEY = ["preferences", "settings"] as const;

export function PreferencesSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onPreferencesChanged((settings) => {
      queryClient.setQueryData<Settings>(SETTINGS_QUERY_KEY, settings);
    });
  }, [queryClient]);

  return null;
}

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
      return mutation.mutateAsync({ autoArchive: patch });
    },
    [mutation.mutateAsync],
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

export function useThemePreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const setTheme = useCallback(
    (theme: ThemePreference) => {
      mutation.mutate({ appearance: { theme } });
    },
    [mutation],
  );

  return {
    theme: settings.appearance.theme,
    setTheme,
  };
}

export function useMarkdownCodeBlockPreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const patchCodeBlock = useCallback(
    (patch: Partial<MarkdownCodeBlockSettings>) => {
      mutation.mutate({ markdown: { codeBlock: patch } });
    },
    [mutation],
  );

  return {
    codeBlock: settings.markdown.codeBlock,
    patchCodeBlock,
  };
}

export function useTelemetryPreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const patchTelemetry = useCallback(
    (patch: Partial<TelemetrySettings>) => {
      mutation.mutate({ telemetry: patch });
    },
    [mutation],
  );

  return {
    patchTelemetry,
    telemetry: settings.telemetry,
  };
}

export function useAppUpdatePreference() {
  const settings = useSettingsValue();
  const mutation = usePatchSettingsMutation();
  const patchAppUpdate = useCallback(
    (patch: Partial<AppUpdateSettings>) => {
      mutation.mutate({ appUpdate: patch });
    },
    [mutation],
  );

  return {
    appUpdate: settings.appUpdate,
    patchAppUpdate,
  };
}
