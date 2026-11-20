// NOTE: the shape a value takes on the wire after JSON.stringify — Date becomes an ISO string and a key
// whose value may be undefined may be absent. Response DTOs implement JsonSerialized<ResultInterface>,
// so a field dropped from the swagger schema or typed differently from the result interface is a compile error.
export type JsonSerialized<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? JsonSerialized<Item>[]
    : T extends object
      ? {
          [
            Key in keyof T as undefined extends T[Key] ? never : Key
          ]: JsonSerialized<T[Key]>;
        } & {
          [
            Key in keyof T as undefined extends T[Key] ? Key : never
          ]?: JsonSerialized<T[Key]>;
        }
      : T;
