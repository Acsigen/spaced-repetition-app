import { PageFrame } from "@/components/PageFrame.tsx";
import SettingsApp from "@/islands/SettingsApp.tsx";
import { define } from "@/utils.ts";

export default define.page(() => {
  return (
    <PageFrame active="settings" title="Setări">
      <SettingsApp />
    </PageFrame>
  );
});
