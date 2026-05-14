import { Trans } from "@lingui/react/macro";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { Switch } from "@renderer/ui/components/switch";
import { ListOrderedIcon, WrapTextIcon } from "lucide-react";

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
          icon={ListOrderedIcon}
          label={
            <Trans id="preferences.markdown.code-block.line-numbers.label">Show line numbers</Trans>
          }
        />
        <SettingsRow
          control={
            <Switch
              checked={codeBlock.wordWrap}
              onCheckedChange={(checked) => {
                patchCodeBlock({ wordWrap: checked });
              }}
            />
          }
          icon={WrapTextIcon}
          label={<Trans id="preferences.markdown.code-block.word-wrap.label">Word wrap</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
