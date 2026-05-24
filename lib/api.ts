import { isHttpError } from "@/lib/errors.ts";
import { openAppKv } from "@/lib/kv.ts";
import { SpanishSrsRepository } from "@/lib/repository.ts";
import {
  parseBackup,
  parseCreateWord,
  parseReviewRating,
  parseUpdateWord,
} from "@/lib/validation.ts";

type RepositoryProvider = () => Promise<SpanishSrsRepository>;

let repositoryPromise: Promise<SpanishSrsRepository> | undefined;

export function createApi(
  getRepository: RepositoryProvider = defaultRepositoryProvider,
): Api {
  return new Api(getRepository);
}

export class Api {
  constructor(private readonly getRepository: RepositoryProvider) {}

  listWords(req: Request): Promise<Response> {
    return this.handle(async () => {
      const url = new URL(req.url);
      const repo = await this.getRepository();
      const words = await repo.listWords({
        includeArchived: url.searchParams.get("includeArchived") === "1",
        q: url.searchParams.get("q") ?? undefined,
      });
      return json({ words });
    });
  }

  createWord(req: Request): Promise<Response> {
    return this.handle(async () => {
      const input = parseCreateWord(await req.json());
      const repo = await this.getRepository();
      const result = await repo.createWord(input);
      return json(result, 201);
    });
  }

  updateWord(req: Request, id: string): Promise<Response> {
    return this.handle(async () => {
      const input = parseUpdateWord(await req.json());
      const repo = await this.getRepository();
      const word = await repo.updateWord(id, input);
      return json({ word });
    });
  }

  archiveWord(id: string): Promise<Response> {
    return this.handle(async () => {
      const repo = await this.getRepository();
      const word = await repo.archiveWord(id);
      return json({ word });
    });
  }

  listDueReviews(req: Request): Promise<Response> {
    return this.handle(async () => {
      const url = new URL(req.url);
      const limit = clampLimit(url.searchParams.get("limit"));
      const repo = await this.getRepository();
      const due = await repo.listDueCards(new Date(), limit);
      return json({ due });
    });
  }

  submitReview(req: Request, cardId: string): Promise<Response> {
    return this.handle(async () => {
      const rating = parseReviewRating(await req.json());
      const repo = await this.getRepository();
      const result = await repo.submitReview(cardId, rating);
      return json(result);
    });
  }

  stats(): Promise<Response> {
    return this.handle(async () => {
      const repo = await this.getRepository();
      return json({ stats: await repo.stats() });
    });
  }

  exportBackup(): Promise<Response> {
    return this.handle(async () => {
      const repo = await this.getRepository();
      return json(await repo.exportBackup(), 200, {
        "Content-Disposition": `attachment; filename="spanish-srs-backup.json"`,
      });
    });
  }

  importBackup(req: Request): Promise<Response> {
    return this.handle(async () => {
      const backup = parseBackup(await req.json());
      const repo = await this.getRepository();
      const stats = await repo.replaceWithBackup(backup);
      return json({ stats });
    });
  }

  private async handle(fn: () => Promise<Response>): Promise<Response> {
    try {
      return await fn();
    } catch (error) {
      if (isHttpError(error)) {
        return json({ error: error.message }, error.status);
      }
      if (error instanceof SyntaxError) {
        return json({ error: "JSON invalid." }, 400);
      }
      console.error(error);
      return json({ error: "Eroare internă." }, 500);
    }
  }
}

function defaultRepositoryProvider(): Promise<SpanishSrsRepository> {
  repositoryPromise ??= openAppKv().then((kv) => new SpanishSrsRepository(kv));
  return repositoryPromise;
}

function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(data, {
    status,
    headers: {
      ...headers,
      "Cache-Control": "no-store",
    },
  });
}

function clampLimit(input: string | null): number {
  const parsed = input == null ? 20 : Number(input);
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}
