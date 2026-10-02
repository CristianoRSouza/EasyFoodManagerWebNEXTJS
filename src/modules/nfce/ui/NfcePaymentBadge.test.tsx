import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NfcePaymentBadge } from "./NfcePaymentBadge";

describe("NfcePaymentBadge", () => {
  it("mostra o rótulo do PIX com a cor conhecida", () => {
    render(<NfcePaymentBadge code="17" />);
    const badge = screen.getByText("PIX");
    expect(badge.className).toContain("emerald");
  });

  it("código desconhecido mostra o próprio código, cor padrão", () => {
    render(<NfcePaymentBadge code="XX" />);
    const badge = screen.getByText("XX");
    expect(badge.className).toContain("gray");
  });
});
