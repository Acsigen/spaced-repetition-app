import { PageFrame } from "@/components/PageFrame.tsx";
import WordsApp from "@/islands/WordsApp.tsx";
import { define } from "@/utils.ts";

export default define.page(() => {
  return (
    <PageFrame active="words" title="Cuvinte">
      <WordsApp />
    </PageFrame>
  );
});
