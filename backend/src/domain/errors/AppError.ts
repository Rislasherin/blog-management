import { DomainError } from "./DomainError.js";
import { HttpStatus } from "../enums/HttpStatus.enum.js";

export class AppError extends DomainError {
  public readonly isOperational: boolean;

  constructor(statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR, message: string, isOperational: boolean = true) {
    super(statusCode, message);
    this.name = "AppError";
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export default AppError;
