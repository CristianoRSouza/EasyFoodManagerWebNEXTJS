import { describe, expect, it } from "vitest";
import { paymentMethodColor, statusColor } from "./nfce-badge-colors";

describe("statusColor", () => {
  it("aplica classes tailwind conhecidas ou cinza padrão", () => {
    expect(statusColor("authorized")).toContain("green");
    expect(statusColor("denied")).toContain("red");
    expect(statusColor("sending")).toContain("blue");
    expect(statusColor("unknown")).toContain("gray");
  });

  it("normaliza o alias inutilizada antes de resolver a cor", () => {
    expect(statusColor("inutilizada")).toContain("slate");
    expect(statusColor("inutilized")).toContain("slate");
  });
});

describe("paymentMethodColor", () => {
  it("aplica classes tailwind conhecidas ou padrão", () => {
    expect(paymentMethodColor("17")).toContain("emerald");
    expect(paymentMethodColor("99")).toContain("gray");
  });
});
