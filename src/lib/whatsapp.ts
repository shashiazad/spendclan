import fs from "fs";
import path from "path";

/**
 * Sends a WhatsApp OTP verification code.
 * - In production (or when env variables are configured): Uses Meta's WhatsApp Cloud API
 *   with your approved message template (e.g. `spendclan_otp`).
 * - In development (or when env variables are missing): Falls back to a mock logger
 *   that prints to the console and logs to `whatsapp-otp.log`.
 */
export async function sendWhatsAppOTP(
  mobileNumber: string,
  name: string,
  token: string,
): Promise<boolean> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const tokenMeta = process.env.WHATSAPP_ACCESS_TOKEN;

  // Fallback to local dev logger if Meta Cloud API keys are missing
  if (!phoneId || !tokenMeta) {
    const message = `Hello ${name}, your SpendClan verification code is: ${token}. This code is valid for 1 hour.`;

    console.log(`\n==================================================`);
    console.log(`[WHATSAPP MOCK MESSAGE SENT]`);
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

  // Live Meta WhatsApp API logic
  // Normalize number (Meta requires phone numbers with country code but no '+' or formatting)
  const formattedNumber = mobileNumber.replace(/\D/g, "");

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenMeta}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formattedNumber,
          type: "template",
          template: {
            name: "spendclan_otp", // Your Meta template identifier
            language: { code: "en" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: name },
                  { type: "text", text: token },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      console.error("Meta WhatsApp Cloud API Error Response:", errData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to make request to Meta WhatsApp API:", error);
    return false;
  }
}
