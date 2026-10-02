/**
 * Tipo e regras de transação — fonte única em `src/shared/domain/transaction.ts` (também usada
 * por Comandas, via `Pick<>`). Este arquivo continua existindo para não mexer nos vários
 * `import ... from "./transaction"` / `"../domain/transaction"` já espalhados pelo módulo.
 */
export * from "@/shared/domain/transaction";
