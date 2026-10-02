/** Envelope `{ data: ... }` comum às respostas da easyfoodmanagerAPI/EasyFoodAPI. */
export interface Envelope<T> {
  data: T;
}
