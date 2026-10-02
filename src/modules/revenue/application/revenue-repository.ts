import type { RevenueReport } from "../domain/revenue";

export interface RevenueReportParams {
  from: string;
  to: string;
  recentOffset: number;
  recentLimit: number;
}

/** Sem React, Next ou HTTP aqui — só o contrato que a UI do módulo depende. */
export interface RevenueRepository {
  report(params: RevenueReportParams): Promise<RevenueReport>;
}
