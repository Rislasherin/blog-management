import User from "../user.model.js";
import type { IUser } from "../types/user.types.js"
 
import type { IUserRepository } from "../interfaces/user.repository.interface.js";

class MongoUserRepository implements IUserRepository {
	async findByEmail(email: string): Promise<IUser | null> {
		return User.findOne({ email });
	}

	async create(userData: {
		name: string;
		email: string;
		password: string;
	}): Promise<IUser> {
		return User.create(userData);
	}
}

export default MongoUserRepository;