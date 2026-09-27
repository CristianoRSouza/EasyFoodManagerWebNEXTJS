import { buildSsoUrl } from "./external-access";

describe("buildSsoUrl", () => {
  it("monta o /sso do EasyBilling preservando o destino, como o legado", () => {
    expect(buildSsoUrl("https://billing.easysoftcloud.com.br/modules/easycommandpay", "abc")).toBe(
      "https://billing.easysoftcloud.com.br/sso?sso_token=abc&sso_type=magiclink&next=%2Fmodules%2Feasycommandpay",
    );
  });
});
