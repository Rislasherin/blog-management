import type { IUser } from "../types/user.types.js"

export interface IUserRepository {
	findByEmail(email: string): Promise<IUser | null>;

	create(userData: {
		name: string;
		email: string;
		password: string;
	}): Promise<IUser>;
}