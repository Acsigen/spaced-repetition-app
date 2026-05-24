export class HttpError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "HttpError";
  }
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

export function badRequest(message: string): never {
  throw new HttpError(message, 400);
}

export function notFound(message = "Resursa nu a fost găsită."): never {
  throw new HttpError(message, 404);
}

export function conflict(message: string): never {
  throw new HttpError(message, 409);
}
