export const renderOtpEmailHtml = (code: string): string => `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
    <h2 style="color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 12px;">BlogPlatform Verification</h2>
    <p style="color: #4b5563; font-size: 15px; line-height: 24px; margin-bottom: 24px;">Please use the following 6-digit verification code to complete your request:</p>
    <div style="background-color: #f3f4f6; padding: 18px; text-align: center; border-radius: 8px; letter-spacing: 6px; font-size: 32px; font-weight: 700; color: #1f2937; font-family: monospace; margin-bottom: 24px;">
      ${code}
    </div>
    <p style="color: #6b7280; font-size: 13px; line-height: 20px;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">If you didn't request this code, you can safely ignore this email.</p>
  </div>
`;

export const renderOtpEmailText = (code: string): string =>
  `Hello,\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this verification code, please ignore this email.\n\nBest regards,\nBlogPlatform Team`;
