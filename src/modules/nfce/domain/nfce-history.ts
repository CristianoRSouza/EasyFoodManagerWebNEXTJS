/** Um registro técnico da nota (mudança de status, erro, ação manual) — `.../logs`. */
export interface NfceLogEntry {
  id: string;
  createdAt: string;
  type: string | null;
  level: string;
  message: string;
  details: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  returnCode: string | null;
  protocol: string | null;
  userName: string | null;
}

/** Um evento fiscal da nota (cancelamento, carta de correção…) — `.../events`. */
export interface NfceEvent {
  id: string;
  eventType: string;
  description: string | null;
  sequence: number;
  eventAt: string;
  justification: string | null;
  correction: string | null;
  protocol: string | null;
  sefazStatusCode: string | null;
  sefazStatusReason: string | null;
  registeredAt: string | null;
  situation: string | null;
  createdAt: string;
}
