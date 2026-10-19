
import { sendWhatsAppMessage } from "./services/whatsappService.js";

try {
  const result = await sendWhatsAppMessage(
    "919876543210",
    "Hello! This is a test appointment reminder from ServiceFlow."
  );

  console.log("Request accepted:", result);
} catch (error) {
  console.error("Message failed:", error.message);
}