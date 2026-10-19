import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middleware/authMiddleware.js";
import Invoice from "../models/Invoice.js";
import Customer from "../models/Customer.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { createPaymentLink } from "../services/paymentService.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can view invoices",
      });
    }

    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    const invoices = await Invoice.find({ businessId })
      .populate("customerId", "name phone")
      .populate("serviceRequestId", "serviceType status scheduledAt")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error("GET INVOICES ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to fetch invoices",
    });
  }
});

router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can update invoice status",
      });
    }

    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    if (!["pending", "paid", "cancelled"].includes(paymentStatus)) {
      return res.status(400).json({
        message: "paymentStatus must be pending, paid, or cancelled",
      });
    }

    const updates = {
      paymentStatus,
      paidAt: paymentStatus === "paid" ? new Date() : null,
    };

    const invoice = await Invoice.findOneAndUpdate(
      { _id: id, businessId: req.user.businessId },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("customerId", "name phone")
      .populate("serviceRequestId", "serviceType status scheduledAt");

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    return res.status(200).json({
      message: "Invoice status updated successfully",
      invoice,
    });
  } catch (error) {
    console.error("UPDATE INVOICE STATUS ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to update invoice status",
    });
  }
});

router.post("/:id/resend-whatsapp", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can resend invoice notices",
      });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    const customer = await Customer.findOne({
      _id: invoice.customerId,
      businessId: req.user.businessId,
    });

    if (!customer?.phone) {
      return res.status(400).json({
        message: "Customer phone number is missing",
      });
    }

    if (!invoice.paymentUrl && invoice.paymentStatus === "pending") {
      try {
        const paymentLink = await createPaymentLink({
          amount: invoice.amount,
          customerName: customer.name,
          customerPhone: customer.phone,
          description: `Invoice ${invoice.invoiceNumber}`,
          serviceRequestId: invoice.serviceRequestId,
        });
        invoice.paymentLinkId = paymentLink.paymentLinkId;
        invoice.paymentUrl = paymentLink.paymentUrl;
        await invoice.save();
      } catch (linkError) {
        console.error("PAYMENT LINK ERROR:", linkError.message);
      }
    }

    const payLine = invoice.paymentUrl
      ? `Pay online: ${invoice.paymentUrl}`
      : "Please pay your technician or business owner.";

    const message = [
      `Hello ${customer.name}, here is your invoice reminder.`,
      "",
      `Invoice: ${invoice.invoiceNumber}`,
      `Amount due: ₹${invoice.amount.toFixed(2)}`,
      `Status: ${invoice.paymentStatus}`,
      payLine,
      "",
      "Thank you for choosing our service!",
    ].join("\n");

    await sendWhatsAppMessage(customer.phone, message);
    invoice.whatsappSentAt = new Date();
    await invoice.save();

    return res.status(200).json({
      message: "Invoice notice sent on WhatsApp",
      invoice,
    });
  } catch (error) {
    console.error("RESEND INVOICE WHATSAPP ERROR:", error.message);

    return res.status(500).json({
      message: error.message || "Failed to resend invoice notice",
    });
  }
});

router.post("/:id/regenerate-payment-link", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can regenerate payment links",
      });
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid invoice ID",
      });
    }

    const invoice = await Invoice.findOne({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!invoice) {
      return res.status(404).json({
        message: "Invoice not found",
      });
    }

    if (invoice.paymentStatus !== "pending") {
      return res.status(400).json({
        message: "Can only regenerate payment links for pending invoices",
      });
    }

    const customer = await Customer.findOne({
      _id: invoice.customerId,
      businessId: req.user.businessId,
    });

    if (!customer?.phone) {
      return res.status(400).json({
        message: "Customer phone number is missing",
      });
    }

    const paymentLink = await createPaymentLink({
      amount: invoice.amount,
      customerName: customer.name,
      customerPhone: customer.phone,
      description: `Invoice ${invoice.invoiceNumber}`,
      serviceRequestId: invoice.serviceRequestId,
    });

    invoice.paymentLinkId = paymentLink.paymentLinkId;
    invoice.paymentUrl = paymentLink.paymentUrl;
    await invoice.save();

    return res.status(200).json({
      message: "Payment link regenerated successfully",
      invoice,
    });
  } catch (error) {
    console.error("REGENERATE PAYMENT LINK ERROR:", error.message);

    return res.status(500).json({
      message: error.message || "Failed to regenerate payment link",
    });
  }
});

export default router;
