import { describe, it, expect, vi } from "vitest";
import { ApiUnitRepository } from "./api-unit-repository";
import * as apiClient from "@/shared/http/api-client";

vi.mock("@/shared/http/api-client");

describe("ApiUnitRepository", () => {
  it("should map API response to Unit domain model", async () => {
    const mockResponse = {
      data: [
        {
          id: "unit-1",
          legacy_code: 1,
          short_description: "UND",
          description: "Unidade",
          is_fractional: false,
          is_active: true,
          created_at: "2024-01-01T10:00:00Z",
        },
        {
          id: "unit-2",
          legacy_code: 2,
          short_description: "KG",
          description: "Quilograma",
          is_fractional: true,
          is_active: true,
          created_at: "2024-01-02T10:00:00Z",
        },
      ],
    };

    vi.mocked(apiClient.apiRequest).mockResolvedValue(mockResponse);

    const repository = new ApiUnitRepository({
      companyId: "company-1",
      storeId: "store-1",
    });

    const units = await repository.list();

    expect(units).toHaveLength(2);
    expect(units[0]).toEqual({
      id: "unit-1",
      legacyCode: 1,
      shortDescription: "UND",
      description: "Unidade",
      isFractional: false,
      isActive: true,
      createdAt: "2024-01-01T10:00:00Z",
    });
    expect(units[1]).toEqual({
      id: "unit-2",
      legacyCode: 2,
      shortDescription: "KG",
      description: "Quilograma",
      isFractional: true,
      isActive: true,
      createdAt: "2024-01-02T10:00:00Z",
    });
  });

  it("should handle empty response", async () => {
    vi.mocked(apiClient.apiRequest).mockResolvedValue({ data: [] });

    const repository = new ApiUnitRepository({
      companyId: "company-1",
      storeId: "store-1",
    });

    const units = await repository.list();

    expect(units).toEqual([]);
  });

  it("should handle missing or null fields in response", async () => {
    const mockResponse = {
      data: [
        {
          id: "unit-1",
          legacy_code: null,
          short_description: "UND",
          description: null,
          is_fractional: null,
          is_active: null,
          created_at: null,
        },
      ],
    };

    vi.mocked(apiClient.apiRequest).mockResolvedValue(mockResponse as { data: typeof mockResponse.data });

    const repository = new ApiUnitRepository({
      companyId: "company-1",
      storeId: "store-1",
    });

    const units = await repository.list();

    expect(units).toHaveLength(1);
    expect(units[0]?.id).toBe("unit-1");
    expect(units[0]?.legacyCode).toBe(0);
    expect(units[0]?.shortDescription).toBe("UND");
    expect(units[0]?.description).toBe("");
    expect(units[0]?.isFractional).toBe(false);
    expect(units[0]?.isActive).toBe(false);
    expect(units[0]?.createdAt).toBe(null);
  });

  it("is_fractional/is_active como texto 'false' não vira true (bug do Boolean nativo)", async () => {
    const mockResponse = {
      data: [
        {
          id: "unit-1",
          legacy_code: 1,
          short_description: "UND",
          description: "Unidade",
          is_fractional: "false",
          is_active: "false",
          created_at: null,
        },
      ],
    };

    vi.mocked(apiClient.apiRequest).mockResolvedValue(mockResponse);

    const repository = new ApiUnitRepository({
      companyId: "company-1",
      storeId: "store-1",
    });

    const [unit] = await repository.list();

    expect(unit?.isFractional).toBe(false);
    expect(unit?.isActive).toBe(false);
  });
});
