import { env } from "../infrastructure/config/env.js";
import { ResendEmailService as EmailService } from "../infrastructure/email/ResendEmailService.js";

async function runDiagnostic() {
  console.log("\n==========================================");
  console.log("   Resend Email Delivery Diagnostic Tool  ");
  console.log("==========================================\n");

  const hasKey = Boolean(env.RESEND_API_KEY);
  const keyLen = env.RESEND_API_KEY ? env.RESEND_API_KEY.length : 0;
  const keyPrefix = env.RESEND_API_KEY ? `${env.RESEND_API_KEY.slice(0, 5)}...` : "(not set)";
  const from = env.EMAIL_FROM || "BlogPlatform <onboarding@resend.dev>";

  console.log("1. Loaded Configuration from backend environment:");
  console.log(`- RESEND_API_KEY: ${hasKey ? `[Configured: ${keyPrefix} (${keyLen} chars)]` : "❌ (not set)"}`);
  console.log(`- EMAIL_FROM:     ${from}\n`);

  if (!env.RESEND_API_KEY) {
    console.error("❌ ERROR: Missing required RESEND_API_KEY in environment variables.");
    console.error("Please add RESEND_API_KEY=re_your_api_key in backend/.env or your Render Dashboard.\n");
    process.exit(1);
  }

  const emailService = new EmailService();

  console.log("2. Verifying Resend API connection and credentials via HTTPS...");
  const result = await emailService.verifyConnection();

  if (result.success) {
    console.log(`\n✅ ${result.message}\n`);
  } else {
    console.error(`\n❌ Resend Verification FAILED:`);
    console.error(`   ${result.message}\n`);
    process.exit(1);
  }

  // Check if a test send was requested via --send=<email>
  const sendArg = process.argv.find((arg) => arg.startsWith("--send=") || arg === "--send");
  let testRecipient = "";
  if (sendArg) {
    if (sendArg.startsWith("--send=")) {
      testRecipient = sendArg.split("=")[1]?.trim() || "";
    } else {
      const idx = process.argv.indexOf("--send");
      testRecipient = process.argv[idx + 1]?.trim() || "";
    }
  }

  if (testRecipient) {
    console.log(`3. Sending live test OTP email to: ${testRecipient}...`);
    try {
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      await emailService.sendOtp(testRecipient, testCode);
      console.log(`✅ Test OTP email sent successfully to ${testRecipient}!`);
      console.log("Please check your inbox (and spam folder) for the verification message.\n");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`❌ Failed to send test email: ${errorMessage}\n`);
      process.exit(1);
    }
  } else {
    console.log("Tip: You can test sending a real verification email by running:");
    console.log(`  npm run email:verify -- --send=your_email@example.com\n`);
  }

  console.log("==========================================\n");
}

runDiagnostic().catch((err) => {
  console.error("Diagnostic error:", err);
  process.exit(1);
});
