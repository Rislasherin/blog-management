import { env } from "../infrastructure/config/env.js";
import { Email59EmailService as EmailService } from "../infrastructure/email/Email59EmailService.js";

async function runDiagnostic() {
  console.log("\n==========================================");
  console.log("   email59 HTTPS Email Delivery Diagnostic ");
  console.log("==========================================\n");

  const hasKey = Boolean(env.EMAIL59_KEY);
  const keyLength = env.EMAIL59_KEY ? env.EMAIL59_KEY.length : 0;
  const keyPrefix = env.EMAIL59_KEY ? `${env.EMAIL59_KEY.slice(0, 8)}...` : "(not set)";

  const emailService = new EmailService();
  const sender = emailService.getEffectiveSender();

  console.log("1. Loaded Configuration from backend environment:");
  console.log(`- EMAIL59_KEY:  ${hasKey ? `[Configured: ${keyPrefix} (${keyLength} chars)]` : "❌ (not set)"}`);
  console.log(`- SENDER:       ${sender}\n`);

  if (!hasKey) {
    console.error("❌ ERROR: Missing required EMAIL59_KEY in environment variables.");
    console.error("Please add EMAIL59_KEY=e59_live_... in backend/.env or your Render Dashboard.\n");
    process.exit(1);
  }

  console.log("2. Verifying email59 API connection and account status...");
  const result = await emailService.verifyConnection();

  if (result.success) {
    console.log(`\n✅ ${result.message}\n`);
  } else {
    console.error(`\n❌ email59 Verification FAILED:`);
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
      console.log(`✅ Test OTP email dispatched successfully to ${testRecipient}!`);
      console.log(`Sent from: ${sender}`);
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
