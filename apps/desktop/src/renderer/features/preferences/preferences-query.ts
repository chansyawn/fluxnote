import { toast } from "@fluxnotes/ui/components/sonner";
import {
  onPreferencesChanged,
  patchUserPreferences,
  readUserPreferences,
  resetUserPreferences,
  toAppInvokeError,
} from "@renderer/clients";
import {
  DEFAULT_USER_PREFERENCES,
  type AppUpdatePreferences,
  type AutoArchivePreferences,
  type FontSize,
  type ExternalEditPreferences,
  type LocaleCode,
  type MarkdownCodeBlockPreferences,
  type UserPreferences,
  type UserPreferencesPatch,
  type ShortcutAction,
  type TelemetryPreferences,
  type ThemePreference,
} from "@shared/features/preferences/user-preferences";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";

import { normalizeShortcutPreferences, type ShortcutBinding } from "../shortcut/shortcut-utils";

export const USER_PREFERENCES_QUERY_KEY = ["preferences", "preferences"] as const;

export function PreferencesSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return onPreferencesChanged((preferences) => {
      queryClient.setQueryData<UserPreferences>(USER_PREFERENCES_QUERY_KEY, preferences);
    });
  }, [queryClient]);

  return null;
}

export function useUserPreferencesQuery() {
  return useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEY,
    queryFn: readUserPreferences,
    placeholderData: DEFAULT_USER_PREFERENCES,
  });
}

function showUserPreferencesError(error: unknown): void {
  toast.error(toAppInvokeError(error).message);
}

export function usePatchUserPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: patchUserPreferences,
    onError: showUserPreferencesError,
    onSuccess: (preferences) => {
      queryClient.setQueryData<UserPreferences>(USER_PREFERENCES_QUERY_KEY, preferences);
    },
  });
}

export function useResetUserPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetUserPreferences,
    onError: showUserPreferencesError,
    onSuccess: (preferences) => {
      queryClient.setQueryData<UserPreferences>(USER_PREFERENCES_QUERY_KEY, preferences);
    },
  });
}

function useUserPreferencesValue(): UserPreferences {
  return useUserPreferencesQuery().data ?? DEFAULT_USER_PREFERENCES;
}

export function useLocalePreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const setLocale = useCallback(
    (locale: LocaleCode) => {
      mutation.mutate({ appearance: { locale } });
    },
    [mutation],
  );

  return {
    locale: preferences.appearance.locale,
    setLocale,
  };
}

export function useAutoArchivePreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const patchAutoArchive = useCallback(
    (patch: Partial<AutoArchivePreferences>) => {
      return mutation.mutateAsync({ autoArchive: patch });
    },
    [mutation.mutateAsync],
  );

  return {
    autoArchive: preferences.autoArchive,
    patchAutoArchive,
  };
}

export function useShortcutPreferences() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const shortcuts = normalizeShortcutPreferences(preferences.shortcuts);

  const patchShortcuts = useCallback(
    (patch: NonNullable<UserPreferencesPatch["shortcuts"]>) => {
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
      patchShortcuts({ [action]: DEFAULT_USER_PREFERENCES.shortcuts[action] });
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
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const setFontSize = useCallback(
    (fontSize: FontSize) => {
      mutation.mutate({ appearance: { fontSize } });
    },
    [mutation],
  );

  return {
    fontSize: preferences.appearance.fontSize,
    setFontSize,
  };
}

export function useThemePreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const setTheme = useCallback(
    (theme: ThemePreference) => {
      mutation.mutate({ appearance: { theme } });
    },
    [mutation],
  );

  return {
    theme: preferences.appearance.theme,
    setTheme,
  };
}

export function useMarkdownCodeBlockPreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const patchCodeBlock = useCallback(
    (patch: Partial<MarkdownCodeBlockPreferences>) => {
      mutation.mutate({ markdown: { codeBlock: patch } });
    },
    [mutation],
  );

  return {
    codeBlock: preferences.markdown.codeBlock,
    patchCodeBlock,
  };
}

export function useTelemetryPreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const patchTelemetry = useCallback(
    (patch: Partial<TelemetryPreferences>) => {
      mutation.mutate({ telemetry: patch });
    },
    [mutation],
  );

  return {
    patchTelemetry,
    telemetry: preferences.telemetry,
  };
}

export function useAppUpdatePreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const patchAppUpdate = useCallback(
    (patch: Partial<AppUpdatePreferences>) => {
      mutation.mutate({ appUpdate: patch });
    },
    [mutation],
  );

  return {
    appUpdate: preferences.appUpdate,
    patchAppUpdate,
  };
}

export function useExternalEditPreference() {
  const preferences = useUserPreferencesValue();
  const mutation = usePatchUserPreferencesMutation();
  const patchExternalEdit = useCallback(
    (patch: Partial<ExternalEditPreferences>) => {
      mutation.mutate({ externalEdit: patch });
    },
    [mutation],
  );

  return {
    externalEdit: preferences.externalEdit,
    patchExternalEdit,
  };
}
