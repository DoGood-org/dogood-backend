export class ResponseWrapper<T> {
  data: T;

  constructor(data: T) {
    this.data = data;
  }
}
