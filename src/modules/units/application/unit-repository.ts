import type { Unit } from "../domain/unit";

/**
 * Unidades são poucas e não mudam: a lista inteira vem de uma vez, sem paginação nem busca no
 * servidor (nenhuma tela filtra por termo).
 *
 * Sem operação de escrita, de propósito — ver o comentário em `unit.ts`.
 */
export interface UnitRepository {
  list(): Promise<Unit[]>;
}
