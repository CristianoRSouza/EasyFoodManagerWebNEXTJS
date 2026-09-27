import { shouldRetry } from "./query-client";
import { ApiError } from "./api-error";

describe("shouldRetry (mesma regra do legado)", () => {
  it("não repete erro 4xx, exceto 408", () => {
    expect(shouldRetry(0, new ApiError(404, "x", "x"))).toBe(false);
    expect(shouldRetry(0, new ApiError(408, "x", "x"))).toBe(true);
  });

  it("repete falhas de servidor até 2 vezes", () => {
    expect(shouldRetry(0, new ApiError(503, "x", "x"))).toBe(true);
    expect(shouldRetry(1, new ApiError(503, "x", "x"))).toBe(true);
    expect(shouldRetry(2, new ApiError(503, "x", "x"))).toBe(false);
  });
});
