import { App, staticFiles } from "fresh";
import { createApi } from "@/lib/api.ts";
import { sameOriginGuard } from "@/lib/security.ts";

const api = createApi();

export const app = new App()
  .use(staticFiles())
  .use(sameOriginGuard)
  .get("/api/words", (ctx) => api.listWords(ctx.req))
  .post("/api/words", (ctx) => api.createWord(ctx.req))
  .patch("/api/words/:id", (ctx) => api.updateWord(ctx.req, ctx.params.id))
  .delete("/api/words/:id", (ctx) => api.archiveWord(ctx.params.id))
  .get("/api/reviews/due", (ctx) => api.listDueReviews(ctx.req))
  .post(
    "/api/reviews/:cardId",
    (ctx) => api.submitReview(ctx.req, ctx.params.cardId),
  )
  .get("/api/stats", () => api.stats())
  .get("/api/backup", () => api.exportBackup())
  .post("/api/backup", (ctx) => api.importBackup(ctx.req))
  .fsRoutes();
