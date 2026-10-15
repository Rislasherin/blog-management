export type OtpPurpose = 'signup' | 'reset' | 'change';

import { Types } from 'mongoose';

export interface IOtp {
  _id?: Types.ObjectId;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  used: boolean;
  attempts: number;
  createdAt: Date;
}
