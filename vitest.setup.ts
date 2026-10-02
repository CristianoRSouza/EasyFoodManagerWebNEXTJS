import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom não implementa IntersectionObserver nem ResizeObserver. Telas com rolagem infinita
// (Produtos, NFC-e, transações) e cards com `LazyFiscalCard`/recharts só precisam deles para
// montar sem lançar `ReferenceError` — o disparo por rolagem/resize real não é testado por este
// stub (cada teste que exercita esse comportamento simula a intersecção chamando o callback
// guardado, ou usa `eager`). Antes desta unificação, três telas (`NfceListPage.test.tsx`,
// `RevenuePage.test.tsx`, `TaxReformFiscalPage.test.tsx`) repetiam a mesma classe local.
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.IntersectionObserver === "undefined") {
  globalThis.IntersectionObserver = ObserverStub as unknown as typeof IntersectionObserver;
}
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
}

// jsdom não implementa `Element.scrollIntoView` — a aba "Correção" da NFC-e usa isto para levar o
// operador até o item/pagamento com erro (Menor 11 da revisão da Fase 3, paridade com o legado).
// Sem o stub, qualquer teste que dispare a validação com erro lançaria `TypeError`.
if (typeof Element !== "undefined" && typeof Element.prototype.scrollIntoView !== "function") {
  Element.prototype.scrollIntoView = () => {};
}
