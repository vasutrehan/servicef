import express from "express";
import mongoose from "mongoose";
import Service from "../models/Service.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST: Create a new service
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, description, basePrice, category } = req.body;

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can create services",
      });
    }

    if (!req.user.businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!name || !basePrice) {
      return res.status(400).json({
        message: "Service name and base price are required",
      });
    }

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Service name must be a non-empty string",
      });
    }

    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return res.status(400).json({
        message: "Base price must be a valid non-negative number",
      });
    }

    const service = await Service.create({
      businessId: req.user.businessId,
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      basePrice,
      category: typeof category === "string" ? category.trim() : "",
    });

    return res.status(201).json({
      message: "Service created successfully",
      service,
    });
  } catch (err) {
    console.error("CREATE SERVICE ERROR:", err);
    return res.status(500).json({
      message: "Failed to create service",
    });
  }
});

// GET: Fetch all services for this business
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can view services",
      });
    }

    if (!req.user.businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    const services = await Service.find({
      businessId: req.user.businessId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: services.length,
      services,
    });
  } catch (err) {
    console.error("GET SERVICES ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch services",
    });
  }
});

// GET: Fetch one service by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can view services",
      });
    }

    if (!req.user.businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const service = await Service.findOne({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    return res.status(200).json({
      service,
    });
  } catch (err) {
    console.error("GET SERVICE BY ID ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch service",
    });
  }
});

// PUT: Update a service
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, basePrice, category, isActive } = req.body;

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can update services",
      });
    }

    if (!req.user.businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Service name cannot be empty",
        });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          message: "Description must be a string",
        });
      }
      updates.description = description.trim();
    }

    if (basePrice !== undefined) {
      if (!Number.isFinite(basePrice) || basePrice < 0) {
        return res.status(400).json({
          message: "Base price must be a valid non-negative number",
        });
      }
      updates.basePrice = basePrice;
    }

    if (category !== undefined) {
      if (typeof category !== "string") {
        return res.status(400).json({
          message: "Category must be a string",
        });
      }
      updates.category = category.trim();
    }

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          message: "isActive must be a boolean",
        });
      }
      updates.isActive = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide at least one field to update",
      });
    }

    const service = await Service.findOneAndUpdate(
      { _id: id, businessId: req.user.businessId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    return res.status(200).json({
      message: "Service updated successfully",
      service,
    });
  } catch (err) {
    console.error("UPDATE SERVICE ERROR:", err);
    return res.status(500).json({
      message: "Failed to update service",
    });
  }
});

// DELETE: Delete a service
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can delete services",
      });
    }

    if (!req.user.businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid service ID",
      });
    }

    const service = await Service.findOneAndDelete({
      _id: id,
      businessId: req.user.businessId,
    });

    if (!service) {
      return res.status(404).json({
        message: "Service not found",
      });
    }

    return res.status(200).json({
      message: "Service deleted successfully",
      service,
    });
  } catch (err) {
    console.error("DELETE SERVICE ERROR:", err);
    return res.status(500).json({
      message: "Failed to delete service",
    });
  }
});

export default router;
