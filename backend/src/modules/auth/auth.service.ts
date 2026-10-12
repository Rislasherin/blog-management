import bcrypt from 'bcryptjs'
import type { IUserRepository } from './interfaces/user.repository.interface.js'
import AppError from '../../utils/appError.js'
import type { ITokenService } from './interfaces/token.service.interface.js'

class AuthService {
	constructor( 
		private readonly userRepository: IUserRepository,
		private readonly tokenService: ITokenService
	) {}


	async Register(name:string,email:string,password:string) {

		const existingUser = await this.userRepository.findByEmail(email);
		if(existingUser) {
			throw new AppError(409, "User already exists with this email");
		}

		const hashedPassword = await bcrypt.hash(password,12);
		const user = await this.userRepository.create({
			name,
			email,
			password: hashedPassword
		})

		return {
			_id: user._id,
			name: user.name,
			email: user.email,

		}

	}

	async Login(email:string,password:string) {
		const user = await this.userRepository.findByEmail(email);
		if(!user || !user._id) {
			throw new AppError(401, "Invalid email or password");
		}

		const isPasswordValid = await bcrypt.compare(password, user.password);
		if(!isPasswordValid) {
			throw new AppError(401, "Invalid email or password");
		}

		const accessToken = this.tokenService.generateAccessToken({
			sub: user._id.toString(),
			email: user.email
		});

		return {
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
			},
			accessToken
		};
	}
}

export default AuthService