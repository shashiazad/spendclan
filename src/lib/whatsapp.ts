import fs from "fs";
import path from "path";

/**
 * Simulates sending a WhatsApp message by logging it to the Next.js server console
 * and appending it to a local log file `whatsapp-otp.log` in the project root.
 */
export async function sendWhatsAppOTP(
  mobileNumber: string,
  name: string,
  token: string,
): Promise<boolean> {
  const message = `Hello ${name}, your SpendClan verification code is: ${token}. This code is valid for 1 hour.`;

  console.log(`\n==================================================`);
  console.log(`[WHATSAPP MESSAGE SENT]`);
  console.log(`To: ${mobileNumber}`);
  console.log(`Body: ${message}`);
  console.log(`==================================================\n`);

  try {
    const logPath = path.join(process.cwd(), "whatsapp-otp.log");
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] To: ${mobileNumber} | Token: ${token} | Message: ${message}\n`;
    fs.appendFileSync(logPath, logEntry, "utf-8");
  } catch (error) {
    console.error("Failed to write WhatsApp OTP log:", error);
  }

  return true;
}
