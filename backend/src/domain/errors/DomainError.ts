import { HttpStatus } from "../enums/HttpStatus.enum.js";

export class DomainError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number = HttpStatus.BAD_REQUEST, message: string) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default DomainError;
