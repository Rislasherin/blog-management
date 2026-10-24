export interface IPasswordHasher {
  hash(plain: string, saltRounds?: number): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

export default IPasswordHasher;
