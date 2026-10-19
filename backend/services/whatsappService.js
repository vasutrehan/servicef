
import dotenv from "dotenv";

dotenv.config();

export async function sendWhatsAppMessage(phone, messageText) {
  const apiUrl = process.env.GREEN_API_URL?.replace(/\/$/, "");
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;

  if (!apiUrl || !instanceId || !token) {
    throw new Error("Green-API credentials are missing from .env");
  }

  // Green-API expects the recipient in chatId format.
  const digits = phone.replace(/\D/g, "");
  const chatId = `${digits}@c.us`;

  const response = await fetch(
    `${apiUrl}/waInstance${instanceId}/sendMessage/${token}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        message: messageText,
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      `Green-API error (${response.status}): ${JSON.stringify(result)}`
    );
  }

  console.log("WhatsApp API response:", result);
  return result;
}