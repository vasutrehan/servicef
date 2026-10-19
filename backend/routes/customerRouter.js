import express from "express";
import mongoose from "mongoose";
import Customer from "../models/Customer.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

function requireOwner(req, res) {
  if (req.user.role !== "owner") {
    res.status(403).json({
      message: "Only business owners can manage customers",
    });
    return false;
  }
  return true;
}

// POST: Create a customer
router.post("/", authMiddleware, async (req, res) => {
  try {
    if (!requireOwner(req, res)) return;

    const { name, phone } = req.body;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!name || !phone) {
      return res.status(400).json({
        message: "Name and phone are required",
      });
    }

    const customer = await Customer.create({
      name: name.trim(),
      phone: phone.trim(),
      businessId,
    });

    return res.status(201).json({
      message: "Customer created successfully",
      customer,
    });
  } catch (err) {
    console.error("CREATE CUSTOMER ERROR:", err);
    return res.status(500).json({
      message: "Failed to create customer",
    });
  }
});

// GET: Fetch all customers
router.get("/", authMiddleware, async (req, res) => {
  try {
    if (!requireOwner(req, res)) return;

    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    const customers = await Customer.find({ businessId });

    return res.status(200).json({
      count: customers.length,
      customers,
    });
  } catch (err) {
    console.error("GET CUSTOMERS ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch customers",
    });
  }
});

// GET: Fetch one customer by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    if (!requireOwner(req, res)) return;

    const { id } = req.params;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findOne({
      _id: id,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.status(200).json({ customer });
  } catch (err) {
    console.error("GET CUSTOMER BY ID ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch customer",
    });
  }
});

// PUT: Update customer
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (!requireOwner(req, res)) return;

    const { id } = req.params;
    const businessId = req.user.businessId;
    const { name, phone } = req.body;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide name or phone to update",
      });
    }

    if (
      Object.values(updates).some(
        (value) => typeof value !== "string" || !value.trim()
      )
    ) {
      return res.status(400).json({
        message: "Name and phone cannot be empty",
      });
    }

    if (updates.name !== undefined) updates.name = updates.name.trim();
    if (updates.phone !== undefined) updates.phone = updates.phone.trim();

    const customer = await Customer.findOneAndUpdate(
      { _id: id, businessId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      message: "Customer updated successfully",
      customer,
    });
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR:", err);
    return res.status(500).json({
      message: "Failed to update customer",
    });
  }
});

// DELETE: Delete customer
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (!requireOwner(req, res)) return;

    const { id } = req.params;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid customer ID",
      });
    }

    const customer = await Customer.findOneAndDelete({
      _id: id,
      businessId,
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      message: "Customer deleted successfully",
      customer,
    });
  } catch (err) {
    console.error("DELETE CUSTOMER ERROR:", err);
    return res.status(500).json({
      message: "Failed to delete customer",
    });
  }
});

export default router;