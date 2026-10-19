import express from "express";
import jwt from "jsonwebtoken";
import Business from "../models/Business.js";
import User from "../models/users.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, phone, serviceType } = req.body;

    if (!name || !serviceType) {
      return res.status(400).json({
        message: "Business name and service type are required",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can create a business",
      });
    }

    if (user.businessId) {
      return res.status(409).json({
        message: "You already belong to a business",
      });
    }

    const business = await Business.create({
      name: name.trim(),
      phone: typeof phone === "string" ? phone.trim() : "",
      serviceType: serviceType.trim(),
    });

    user.businessId = business._id;
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        businessId: business._id,
        role: user.role || "owner",
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(201).json({
      message: "Business created successfully",
      business,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "owner",
        businessId: business._id,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      message: "Failed to create business",
    });
  }
});

router.get("/my-business", authMiddleware, async (req, res) => {
  try {
    if (!req.user.businessId) {
      return res.status(404).json({
        message: "No business linked to this account",
      });
    }

    const business = await Business.findById(req.user.businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    return res.status(200).json({
      message: "Business profile fetched successfully",
      business,
    });
  } catch (error) {
    console.error("GET BUSINESS PROFILE ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to fetch business profile",
    });
  }
});

router.put("/my-business", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can update the business profile",
      });
    }

    const { name, phone, serviceType } = req.body;

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Business name cannot be empty",
        });
      }

      updates.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          message: "Phone must be a string",
        });
      }

      updates.phone = phone.trim();
    }

    if (serviceType !== undefined) {
      if (typeof serviceType !== "string" || !serviceType.trim()) {
        return res.status(400).json({
          message: "Service type cannot be empty",
        });
      }

      updates.serviceType = serviceType.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    const business = await Business.findByIdAndUpdate(
      req.user.businessId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!business) {
      return res.status(404).json({
        message: "Business not found",
      });
    }

    return res.status(200).json({
      message: "Business profile updated successfully",
      business,
    });
  } catch (error) {
    console.error("UPDATE BUSINESS PROFILE ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to update business profile",
    });
  }
});

export default router;