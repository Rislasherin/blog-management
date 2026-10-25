import { env } from "../infrastructure/config/env.js";
import { NodemailerEmailService as EmailService } from "../infrastructure/email/NodemailerEmailService.js";

async function runDiagnostic() {
  console.log("\n==========================================");
  console.log("   Gmail SMTP Email Delivery Diagnostic   ");
  console.log("==========================================\n");

  const hasHost = Boolean(env.SMTP_HOST);
  const hasUser = Boolean(env.SMTP_USER);
  const hasPass = Boolean(env.SMTP_PASS);
  const passLength = env.SMTP_PASS ? env.SMTP_PASS.replace(/\s+/g, "").length : 0;
  const userPreview = env.SMTP_USER
    ? `${env.SMTP_USER.slice(0, 3)}***@${env.SMTP_USER.split("@")[1] || "gmail.com"}`
    : "(not set)";

  const effectivePort = env.SMTP_PORT || 587;
  const isSecure = env.SMTP_SECURE !== undefined ? env.SMTP_SECURE : effectivePort === 465;
  const from = env.EMAIL_FROM || (env.SMTP_USER ? `BlogPlatform <${env.SMTP_USER}>` : "(default)");

  console.log("1. Loaded SMTP Configuration from backend environment:");
  console.log(`- SMTP_HOST:   ${env.SMTP_HOST || "smtp.gmail.com"}`);
  console.log(`- SMTP_PORT:   ${effectivePort}`);
  console.log(`- SMTP_SECURE: ${isSecure} (${isSecure ? "SSL/TLS" : "STARTTLS"})`);
  console.log(`- SMTP_USER:   ${hasUser ? `[Configured: ${userPreview}]` : "❌ (not set)"}`);
  console.log(`- SMTP_PASS:   ${hasPass ? `[Configured: ${passLength} characters]` : "❌ (not set)"}`);
  console.log(`- EMAIL_FROM:  ${from}\n`);

  if (!hasUser || !hasPass) {
    console.error("❌ ERROR: Missing required SMTP credentials in environment variables.");
    console.error("Please add SMTP_USER and SMTP_PASS in backend/.env or your hosting environment dashboard.\n");
    process.exit(1);
  }

  const emailService = new EmailService();

  console.log(`2. Verifying SMTP connection to ${env.SMTP_HOST || "smtp.gmail.com"}:${effectivePort}...`);
  const result = await emailService.verifyConnection();

  if (result.success) {
    console.log(`\n✅ ${result.message}\n`);
  } else {
    console.error(`\n❌ SMTP Connection Verification FAILED:`);
    console.error(`   ${result.message}\n`);
    if (result.details?.code === "ETIMEDOUT" || result.details?.code === "ECONNREFUSED" || result.details?.code === "ESOCKET") {
      console.warn("⚠️  NOTE ON HOSTING RESTRICTIONS:");
      console.warn("   Render Free plans block outbound SMTP connections on ports 25, 465, and 587.");
      console.warn("   If this backend is running on Render Free, connection timeouts are expected.");
      console.warn("   A paid compute plan or an SMTP-permissive host is required for live delivery.\n");
    }
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
