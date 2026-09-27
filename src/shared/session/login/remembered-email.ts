const KEY = "ecp_admin_last_email";

/** Conveniência por navegador (nunca senha): pré-preenche o e-mail do último login. */
export const rememberedEmail = {
  read(): string {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  save(email: string): void {
    try {
      localStorage.setItem(KEY, email);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  },
  clear(): void {
    this.save("");
  },
};
