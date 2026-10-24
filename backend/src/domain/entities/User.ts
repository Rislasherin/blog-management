export interface AuthenticatedUser {
  id: string;
  userId?: string;
  email: string;
}

export interface UserProps {
  id?: string | undefined;
  _id?: string | undefined;
  name: string;
  email: string;
  password?: string | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
}

export interface IUser {
  id: string;
  _id?: string | undefined;
  name: string;
  email: string;
  password?: string | undefined;
  createdAt?: Date | undefined;
  updatedAt?: Date | undefined;
}

/**
 * Domain Entity: User
 * Encapsulates user business rules and domain invariants.
 */
export class User implements IUser {
  public readonly id: string;
  public readonly _id?: string | undefined;
  public readonly name: string;
  public readonly email: string;
  public readonly password?: string | undefined;
  public readonly createdAt?: Date | undefined;
  public readonly updatedAt?: Date | undefined;

  constructor(props: UserProps) {
    this.id = props.id ?? props._id ?? "";
    this._id = this.id;
    this.name = props.name.trim();
    this.email = props.email.toLowerCase().trim();
    this.password = props.password;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();

    this.validate();
  }

  private validate(): void {
    if (!this.email || !this.email.includes("@")) {
      throw new Error("Invalid user email address");
    }
    if (!this.name || this.name.length < 2) {
      throw new Error("User name must be at least 2 characters long");
    }
  }

  public toPlain(): IUser {
    return {
      id: this.id,
      _id: this.id,
      name: this.name,
      email: this.email,
      password: this.password,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  public toPublic(): Omit<IUser, "password"> {
    return {
      id: this.id,
      _id: this.id,
      name: this.name,
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export default User;
