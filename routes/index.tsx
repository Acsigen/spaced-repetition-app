import { PageFrame } from "@/components/PageFrame.tsx";
import StudyApp from "@/islands/StudyApp.tsx";
import { define } from "@/utils.ts";

export default define.page(() => {
  return (
    <PageFrame active="study" title="Repetiții">
      <StudyApp />
    </PageFrame>
  );
});
