
import express from "express";
import crypto from "crypto";
import Invoice from "../models/Invoice.js";

const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];

      if (!webhookSecret || !signature || !Buffer.isBuffer(req.body)) {
        return res.status(400).json({
          message: "Missing webhook configuration or raw body",
        });
      }

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest("hex");

      const expected = Buffer.from(expectedSignature, "hex");
      const received = Buffer.from(signature, "hex");

      if (
        expected.length !== received.length ||
        !crypto.timingSafeEqual(expected, received)
      ) {
        return res.status(400).json({
          message: "Invalid webhook signature",
        });
      }

      const event = JSON.parse(req.body.toString("utf8"));

      if (event.event !== "payment_link.paid") {
        return res.status(200).json({
          message: "Event received; no invoice update required",
        });
      }

      const paymentLink = event.payload?.payment_link?.entity;

      if (
        !paymentLink?.id ||
        paymentLink.status !== "paid"
      ) {
        return res.status(400).json({
          message: "Invalid payment-link payload",
        });
      }

      const invoice = await Invoice.findOne({
        paymentLinkId: paymentLink.id,
      });

      if (!invoice) {
        console.error(
          "No invoice found for payment link:",
          paymentLink.id
        );

        // Acknowledge so Razorpay does not retry forever for orphan events.
        return res.status(200).json({
          message: "Payment link not linked to an invoice",
        });
      }

      // A duplicate webhook must not change a paid invoice again.
      if (invoice.paymentStatus !== "paid") {
        const amountPaid = paymentLink.amount_paid;
        const expectedAmount = Math.round(invoice.amount * 100);

        if (
          !Number.isFinite(amountPaid) ||
          amountPaid < expectedAmount
        ) {
          return res.status(400).json({
            message: "Paid amount does not match invoice amount",
          });
        }

        invoice.paymentStatus = "paid";
        invoice.paidAt = new Date();
        await invoice.save();
      }

      return res.status(200).json({
        message: "Invoice payment confirmed",
      });
    } catch (error) {
      console.error("RAZORPAY WEBHOOK ERROR:", error.message);

      return res.status(500).json({
        message: "Webhook processing failed",
      });
    }
  }
);

export default router;
