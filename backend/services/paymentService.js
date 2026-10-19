import dotenv from "dotenv";
import Razorpay from "razorpay";

dotenv.config();

let razorpay = null;

function getRazorpayClient() {
  if (razorpay) return razorpay;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay API credentials are missing from .env");
  }

  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpay;
}

export async function createPaymentLink({
  amount,
  customerName,
  customerPhone,
  description,
  serviceRequestId,
}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }

  if (!customerName || !customerPhone || !serviceRequestId) {
    throw new Error(
      "Customer name, phone, and service request ID are required"
    );
  }

  const client = getRazorpayClient();

  // Razorpay expects the amount in paise, not rupees.
  const amountInPaise = Math.round(amount * 100);

  const paymentLink = await client.paymentLink.create({
    amount: amountInPaise,
    currency: "INR",
    accept_partial: false,
    description: description || "ServiceFlow service payment",
    reference_id: String(serviceRequestId).slice(0, 40),
    customer: {
      name: customerName,
      contact: customerPhone,
    },
    notify: {
      sms: false,
      email: false,
    },
    reminder_enable: false,
    notes: {
      serviceRequestId: String(serviceRequestId),
    },
  });

  return {
    paymentLinkId: paymentLink.id,
    paymentUrl: paymentLink.short_url,
    amount: paymentLink.amount / 100,
    currency: paymentLink.currency,
    status: paymentLink.status,
  };
}
