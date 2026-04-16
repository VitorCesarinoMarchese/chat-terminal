import { jest } from "@jest/globals";

export function mockRejectedOnce<T extends object>(
  target: T,
  method: keyof T,
  message = "Forced test failure"
) {
  return jest
    .spyOn(target as Record<string, unknown>, method as string)
    .mockRejectedValueOnce(new Error(message));
}
