import { env } from "../config/env.js";
import { EmailService } from "../modules/auth/email.service.js";

async function runDiagnostic() {
  console.log("\n==========================================");
  console.log("   SMTP Configuration & Diagnostic Tool   ");
  console.log("==========================================\n");

  const host = env.SMTP_HOST || "(not set)";
  const port = env.SMTP_PORT;
  const isSecure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : env.SMTP_PORT === 465;
  const user = env.SMTP_USER ? `${env.SMTP_USER.slice(0, 2)}***@${env.SMTP_USER.split("@")[1] || "..."}` : "(not set)";
  const passConfigured = Boolean(env.SMTP_PASS);
  const passLength = env.SMTP_PASS ? env.SMTP_PASS.replace(/\s+/g, "").length : 0;
  const from = env.EMAIL_FROM;

  console.log("Loaded Configuration:");
  console.log(`- SMTP_HOST:   ${host}`);
  console.log(`- SMTP_PORT:   ${port}`);
  console.log(`- SMTP_SECURE: ${isSecure}`);
  console.log(`- SMTP_USER:   ${user}`);
  console.log(`- SMTP_PASS:   ${passConfigured ? `[Configured: ${passLength} characters]` : "(not set)"}`);
  console.log(`- EMAIL_FROM:  ${from}\n`);

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    console.error("❌ ERROR: Missing required SMTP environment variables in backend/.env.");
    console.error("Please ensure the following variables are set in backend/.env:");
    console.error("  SMTP_HOST=smtp.gmail.com");
    console.error("  SMTP_PORT=465");
    console.error("  SMTP_SECURE=true");
    console.error("  SMTP_USER=your_email@gmail.com");
    console.error("  SMTP_PASS=your_16_digit_app_password");
    console.error("  EMAIL_FROM=your_email@gmail.com\n");
    process.exit(1);
  }

  const emailService = new EmailService();

  console.log("⏳ Verifying SMTP server connection and credentials...");
  const result = await emailService.verifyConnection();

  if (!result.success) {
    console.error(`\n❌ SMTP Verification FAILED:`);
    console.error(`   ${result.message}\n`);
    console.log("Troubleshooting Tips:");
    console.log("1. For Gmail: Verify you are using a 16-character App Password (from https://myaccount.google.com/apppasswords), NOT your normal Google account password.");
    console.log("2. 2-Step Verification must be ENABLED on your Google Account to create an App Password.");
    console.log("3. Ensure your local firewall or network allows outbound connections on port 465 or 587.");
    process.exit(1);
  }

  console.log(`\n✅ ${result.message}\n`);

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
    console.log(`⏳ Sending test OTP email to: ${testRecipient}...`);
    try {
      const testCode = Math.floor(100000 + Math.random() * 900000).toString();
      await emailService.sendOtp(testRecipient, testCode);
      console.log(`✅ Test OTP email sent successfully to ${testRecipient}!`);
      console.log("Please check your inbox (and spam folder) for the test message.\n");
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
