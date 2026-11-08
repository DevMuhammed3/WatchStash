export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  /** Optional response headers the error handler must set (e.g. Retry-After). */
  public readonly headers?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number,
    isOperational = true,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.headers = headers;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
