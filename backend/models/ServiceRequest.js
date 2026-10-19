

import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customer",
      required: true,
    },
    reminderSentAt: {
  type: Date,
  default: null,
},

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    serviceType: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Address where the service will be performed
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // Date and time of the appointment
    scheduledAt: {
      type: Date,
      required: true,
    },

    // Estimated amount from service catalog
    estimatedAmount: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "in-progress", "completed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const ServiceRequest =
  mongoose.models.ServiceRequest ||
  mongoose.model("ServiceRequest", serviceRequestSchema);

export default ServiceRequest;
