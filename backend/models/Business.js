
import mongoose from "mongoose";

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },

  },
  { timestamps: true }
);

const Business =
  
  mongoose.model("Business", businessSchema);

export default Business;