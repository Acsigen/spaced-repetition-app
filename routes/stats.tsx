import { PageFrame } from "@/components/PageFrame.tsx";
import StatsApp from "@/islands/StatsApp.tsx";
import { define } from "@/utils.ts";

export default define.page(() => {
  return (
    <PageFrame active="stats" title="Statistici">
      <StatsApp />
    </PageFrame>
  );
});
