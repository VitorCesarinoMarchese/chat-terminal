import type { Response } from "express";

type ApiData = Record<string, unknown>;

export function sendSuccess<T extends ApiData>(
  res: Response,
  status: number,
  message: string,
  data: T
) {
  res.status(status).json({
    success: true,
    message,
    data,
    ...data,
  });
}

export function sendError(res: Response, status: number, error: string) {
  res.status(status).json({
    success: false,
    error,
  });
}

