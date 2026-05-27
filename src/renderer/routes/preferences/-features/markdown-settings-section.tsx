import { Trans } from "@lingui/react/macro";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { Switch } from "@renderer/ui/components/switch";
import { ListOrderedIcon } from "lucide-react";

export function MarkdownSettingsSection() {
  const { codeBlock, patchCodeBlock } = useMarkdownCodeBlockPreference();

  return (
    <SettingsSection title={<Trans id="preferences.markdown.title">Markdown</Trans>}>
      <SettingsGroup>
        <SettingsRow
          control={
            <Switch
              checked={codeBlock.showLineNumbers}
              onCheckedChange={(checked) => {
                patchCodeBlock({ showLineNumbers: checked });
              }}
            />
          }
          icon={<ListOrderedIcon />}
          label={
            <Trans id="preferences.markdown.code-block.line-numbers.label">Show line numbers</Trans>
          }
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
