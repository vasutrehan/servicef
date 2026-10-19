import express from "express";
import mongoose from "mongoose";
import { randomBytes } from "crypto";
import User from "../models/users.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Customer from "../models/Customer.js";
import Service from "../models/Service.js";
import authMiddleware from "../middleware/authMiddleware.js";

import Invoice from "../models/Invoice.js";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { createPaymentLink } from "../services/paymentService.js";

function makeInvoiceNumber() {
  return `INV-${Date.now()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

const router = express.Router();


router.post("/", authMiddleware, async (req, res) => {
  try {
    const {
      customerId,
      serviceType,
      description,
      address,
      scheduledAt,
      estimatedAmount,
    } = req.body;

    const businessId = req.user.businessId;

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can perform this action",
      });
    }

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!customerId || !serviceType || !address || !scheduledAt) {
      return res.status(400).json({
        message:
          "Customer ID, service type, address, and scheduled date are required",
      });
    }

    if (
      typeof serviceType !== "string" ||
      !serviceType.trim() ||
      typeof address !== "string" ||
      !address.trim()
    ) {
      return res.status(400).json({
        message: "Service type and address must be non-empty strings",
      });
    }

    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findOne({
      _id: customerId,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found for this business",
      });
    }

    const appointmentDate = new Date(scheduledAt);

    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        message: "Invalid scheduled date",
      });
    }

    // If serviceType is a valid ObjectId, fetch service details
    let finalServiceType = serviceType.trim();
    let finalEstimatedAmount = estimatedAmount ? Number(estimatedAmount) : null;

    if (mongoose.isValidObjectId(serviceType)) {
      const service = await Service.findOne({
        _id: serviceType,
        businessId,
        isActive: true,
      });

      if (service) {
        finalServiceType = service.name;
        if (!finalEstimatedAmount) {
          finalEstimatedAmount = service.basePrice;
        }
      }
    }

    const serviceRequest = await ServiceRequest.create({
      customerId,
      businessId,
      serviceType: finalServiceType,
      description:
        typeof description === "string" ? description.trim() : "",
      address: address.trim(),
      scheduledAt: appointmentDate,
      estimatedAmount: finalEstimatedAmount,
    });

    return res.status(201).json({
      message: "Service request created successfully",
      serviceRequest,
    });
  } catch (err) {
    console.error("CREATE SERVICE REQUEST ERROR:", err);

    return res.status(500).json({
      message: "Failed to create service request",
    });
  }
});

 
// GET: Fetch all service requests for this business
router.get("/", authMiddleware, async (req, res) => {
  try {
    const businessId = req.user.businessId;
    if (req.user.role !== "owner") {
  return res.status(403).json({
    message: "Only business owners can perform this action",
  });
}

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    const serviceRequests = await ServiceRequest.find({
      businessId,
    })
      .populate("customerId", "name phone")
     .populate("assignedTo", "name email staffId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: serviceRequests.length,
      serviceRequests,
    });
  } catch (err) {
    console.error("GET SERVICE REQUESTS ERROR:", err);

    return res.status(500).json({
      message: "Failed to fetch service requests",
    });
  }
});

router.get("/my-tasks", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({
        message: "Only staff members can access their assigned tasks",
      });
    }

    const tasks = await ServiceRequest.find({
      businessId: req.user.businessId,
      assignedTo: req.user.userId,
    })
      .populate("customerId", "name phone")
      .populate("assignedTo", "name email staffId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("GET STAFF TASKS ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to fetch assigned tasks",
    });
  }
});
router.get("/unassigned", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can view unassigned requests",
      });
    }

    const requests = await ServiceRequest.find({
      businessId: req.user.businessId,
      assignedTo: null,
      status: { $nin: ["completed", "cancelled"] },
    })
      .populate("customerId", "name phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET UNASSIGNED REQUESTS ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to fetch unassigned requests",
    });
  }
});

 
// GET: Fetch one service request by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    if (req.user.role !== "owner") {
  return res.status(403).json({
    message: "Only business owners can perform this action",
  });
}

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service request ID",
      });
    }

    const serviceRequest = await ServiceRequest.findOne({
      _id: id,
      businessId,
    }).populate("customerId", "name phone") 
      .populate("assignedTo", "name email staffId");

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found",
      });
    }

    return res.status(200).json({
      serviceRequest,
    });
  } catch (err) {
    console.error("GET SERVICE REQUEST BY ID ERROR:", err);

    return res.status(500).json({
      message: "Failed to fetch service request",
    });
  }
});


 
// PUT: Update a service request


router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;

    const {
      serviceType,
      description,
      status,
      address,
      scheduledAt,
      estimatedAmount,
    } = req.body;

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can perform this action",
      });
    }

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service request ID",
      });
    }

    const updates = {};

    if (serviceType !== undefined) {
      if (
        typeof serviceType !== "string" ||
        !serviceType.trim()
      ) {
        return res.status(400).json({
          message: "Service type cannot be empty",
        });
      }

      updates.serviceType = serviceType.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }

      updates.description = description.trim();
    }

    if (address !== undefined) {
      if (typeof address !== "string" || !address.trim()) {
        return res.status(400).json({
          message: "Address cannot be empty",
        });
      }

      updates.address = address.trim();
    }

    if (status !== undefined) {
      const allowedStatuses = ["pending", "in-progress", "cancelled"];

      if (status === "completed") {
        return res.status(400).json({
          message:
            "Jobs must be completed by assigned staff with a final amount so an invoice is created",
        });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
          allowedStatuses: [...allowedStatuses, "completed (staff only)"],
        });
      }

      updates.status = status;
    }

    if (scheduledAt !== undefined) {
      if (scheduledAt === null || scheduledAt === "") {
        return res.status(400).json({
          message: "Scheduled date and time cannot be empty",
        });
      }

      const appointmentDate = new Date(scheduledAt);

      if (Number.isNaN(appointmentDate.getTime())) {
        return res.status(400).json({
          message: "Invalid scheduled date",
        });
      }

      updates.scheduledAt = appointmentDate;
    }

    if (estimatedAmount !== undefined) {
      if (estimatedAmount === null || estimatedAmount === "") {
        updates.estimatedAmount = null;
      } else {
        const parsedAmount = Number(estimatedAmount);

        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          return res.status(400).json({
            message: "Estimated amount must be a valid non-negative number",
          });
        }

        updates.estimatedAmount = parsedAmount;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    const serviceRequest = await ServiceRequest.findOneAndUpdate(
      { _id: id, businessId },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("customerId", "name phone")
      .populate("assignedTo", "name email staffId");

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found",
      });
    }

    return res.status(200).json({
      message: "Service request updated successfully",
      serviceRequest,
    });
  } catch (err) {
    console.error("UPDATE SERVICE REQUEST ERROR:", err);

    return res.status(500).json({
      message: "Failed to update service request",
    });
  }
});



router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "staff") {
      return res.status(403).json({
        message: "Only staff members can update task status",
      });
    }

    const { id } = req.params;
    const { status, amount } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service request ID",
      });
    }

    const allowedStatuses = ["in-progress", "completed"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Status must be in-progress or completed",
      });
    }

    const finalAmount = Number(amount);

    if (
      status === "completed" &&
      (!Number.isFinite(finalAmount) || finalAmount <= 0)
    ) {
      return res.status(400).json({
        message: "A valid final amount greater than zero is required",
      });
    }

    const serviceRequest = await ServiceRequest.findOne({
      _id: id,
      businessId: req.user.businessId,
      assignedTo: req.user.userId,
    });

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Assigned service request not found",
      });
    }

    // Normal status update: no payment flow needed.
    if (status === "in-progress") {
      serviceRequest.status = status;
      await serviceRequest.save();

      return res.status(200).json({
        message: "Task status updated successfully",
        serviceRequest,
      });
    }

    const customer = await Customer.findOne({
      _id: serviceRequest.customerId,
      businessId: req.user.businessId,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found for this business",
      });
    }

    // Reuse an existing invoice for this service request.
    let invoice = await Invoice.findOne({
      serviceRequestId: serviceRequest._id,
      businessId: req.user.businessId,
    });

    if (invoice && invoice.amount !== finalAmount) {
      return res.status(409).json({
        message:
          "An invoice already exists with a different amount",
      });
    }

    if (!invoice) {
      invoice = await Invoice.create({
        invoiceNumber: makeInvoiceNumber(),
        businessId: req.user.businessId,
        customerId: customer._id,
        serviceRequestId: serviceRequest._id,
        amount: finalAmount,
      });
    }

    let paymentLinkError = null;
    if (!invoice.paymentUrl) {
      try {
        const paymentLink = await createPaymentLink({
          amount: invoice.amount,
          customerName: customer.name,
          customerPhone: customer.phone,
          description: `${serviceRequest.serviceType} — ${invoice.invoiceNumber}`,
          serviceRequestId: serviceRequest._id,
        });

        invoice.paymentLinkId = paymentLink.paymentLinkId;
        invoice.paymentUrl = paymentLink.paymentUrl;
        await invoice.save();
      } catch (linkError) {
        paymentLinkError = linkError.message;
        console.error("PAYMENT LINK ERROR:", linkError.message);
      }
    }

    serviceRequest.status = "completed";
    await serviceRequest.save();

    let whatsappSent = Boolean(invoice.whatsappSentAt);
    if (!invoice.whatsappSentAt) {
      const payLine = invoice.paymentUrl
        ? `Pay online: ${invoice.paymentUrl}`
        : "Please pay your technician or business owner.";

      const message = [
        `Hello ${customer.name}, your service has been completed.`,
        "",
        `Invoice: ${invoice.invoiceNumber}`,
        `Amount due: ₹${invoice.amount.toFixed(2)}`,
        payLine,
        "",
        "Thank you for choosing our service!",
      ].join("\n");

      try {
        await sendWhatsAppMessage(customer.phone, message);
        invoice.whatsappSentAt = new Date();
        await invoice.save();
        whatsappSent = true;
      } catch (whatsappError) {
        console.error("WHATSAPP SEND ERROR:", whatsappError.message);
      }
    }

    return res.status(200).json({
      message: whatsappSent
        ? "Service completed, invoice created, and customer notified"
        : "Service completed and invoice created (WhatsApp notice could not be sent)",
      serviceRequest,
      invoice,
      whatsappSent,
      paymentLinkCreated: Boolean(invoice.paymentUrl),
      paymentLinkError,
    });
  } catch (error) {
    console.error("COMPLETE SERVICE ERROR:", error.message);

    return res.status(500).json({
      message: "Service completion or invoice processing failed",
    });
  }
});

 
// DELETE: Delete a service request
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = req.user.businessId;
    if (req.user.role !== "owner") {
  return res.status(403).json({
    message: "Only business owners can perform this action",
  });
}

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service request ID",
      });
    }

    const serviceRequest = await ServiceRequest.findOneAndDelete({
      _id: id,
      businessId,
    });

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found",
      });
    }

    return res.status(200).json({
      message: "Service request deleted successfully",
      serviceRequest,
    });
  } catch (err) {
    console.error("DELETE SERVICE REQUEST ERROR:", err);

    return res.status(500).json({
      message: "Failed to delete service request",
    });
  }
});

router.patch("/:id/assign", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can assign service requests",
      });
    }
    if (!req.user.businessId) {
  return res.status(400).json({
    message: "No business linked to this user",
  });
}

    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service request ID",
      });
    }

    const serviceRequest = await ServiceRequest.findOne({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!serviceRequest) {
      return res.status(404).json({
        message: "Service request not found",
      });
    }

    // Unassign the technician
    if (assignedTo === null || assignedTo === "") {
      serviceRequest.assignedTo = null;
    } else {
      if (
        typeof assignedTo !== "string" ||
        !mongoose.isValidObjectId(assignedTo)
      ) {
        return res.status(400).json({
          message: "Provide a valid staff ID or null",
        });
      }

      const staff = await User.findOne({
        _id: assignedTo,
        businessId: req.user.businessId,
        role: "staff",
        $or: [{ isActive: true }, { isActive: { $exists: false } }],
      });

      if (!staff) {
        return res.status(404).json({
          message: "Staff member not found in your business or account is inactive",
        });
      }

      serviceRequest.assignedTo = staff._id;
    }

    await serviceRequest.save();

    const updatedRequest = await ServiceRequest.findById(
      serviceRequest._id
    )
      .populate("customerId", "name phone")
      .populate("assignedTo", "name email staffId");

    return res.status(200).json({
      message:
        assignedTo === null || assignedTo === ""
          ? "Service request unassigned successfully"
          : "Service request assigned successfully",
      serviceRequest: updatedRequest,
    });
  } catch (error) {
    console.error("ASSIGN SERVICE REQUEST ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to assign service request",
    });
  }
});



export default router;
