import mongoose from "mongoose";

const customerschema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const customer =
  mongoose.models.customer || mongoose.model("customer", customerschema);

export default customer;