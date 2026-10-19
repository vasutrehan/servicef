
import express from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import ServiceRequest from "../models/ServiceRequest.js";
import User from "../models/users.js"
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// POST: Owner creates a staff account
router.post("/", authMiddleware, async (req, res) => {
  try {
    // Only owners can create staff accounts
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can create staff accounts",
      });
    }

    const { name, email, password } = req.body;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this owner",
      });
    }

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Name, email, and a password of at least 8 characters are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    // Generate a unique staff ID
    let staffId;

    do {
      staffId = `STF-${randomBytes(4).toString("hex").toUpperCase()}`;
    } while (await User.exists({ staffId }));

    const hashedPassword = await bcrypt.hash(password, 12);

    const staff = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "staff",
      staffId,
      businessId,
    });

    return res.status(201).json({
      message: "Staff account created successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        staffId: staff.staffId,
        role: staff.role,
        businessId: staff.businessId,
      },
    });
  } catch (err) {
    console.error("CREATE STAFF ERROR:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email or staff ID already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to create staff account",
    });
  }
});

 
// GET: Fetch all staff members for the owner's business
router.get("/", authMiddleware, async (req, res) => {
  try {
    // Only owners can view the staff list
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can view staff members",
      });
    }

    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this owner",
      });
    }

    const staffMembers = await User.find({
      businessId : req.user.businessId,
      role: "staff",
    }).select("-password").sort({ createdAt: -1 });

    return res.status(200).json({
      count: staffMembers.length,
      staff: staffMembers,
    });
  } catch (err) {
    console.error("GET STAFF ERROR:", err);

    return res.status(500).json({
      message: "Failed to fetch staff members",
    });
  }
});

 
// GET: Fetch one staff member by ID
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    // Only owners can view individual staff details
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can view staff details",
      });
    }

    const { id } = req.params;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this owner",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const staff = await User.findOne({
      _id: id,
      businessId,
      role: "staff",
    }).select("-password");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    return res.status(200).json({ staff });
  } catch (err) {
    console.error("GET STAFF BY ID ERROR:", err);

    return res.status(500).json({
      message: "Failed to fetch staff member",
    });
  }
});

 
// PUT: Update a staff member
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can update staff members",
      });
    }

    const { id } = req.params;
    const businessId = req.user.businessId;
    const { name, email } = req.body;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this owner",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      updates.email = email.trim().toLowerCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Provide a name or email to update",
      });
    }

    if (updates.email) {
      const existingUser = await User.findOne({
        email: updates.email,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(409).json({
          message: "Email is already registered",
        });
      }
    }

    const staff = await User.findOneAndUpdate(
      { _id: id, businessId, role: "staff" },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      message: "Staff member updated successfully",
      staff,
    });
  } catch (err) {
    console.error("UPDATE STAFF ERROR:", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    return res.status(500).json({
      message: "Failed to update staff member",
    });
  }
});

router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can change staff status",
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const staff = await User.findOneAndUpdate(
      {
        _id: id,
        businessId: req.user.businessId,
        role: "staff",
      },
      { $set: { isActive } },
      { new: true, runValidators: true }
    ).select("-password");

    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found in your business",
      });
    }

    return res.status(200).json({
      message: isActive
        ? "Staff member activated successfully"
        : "Staff member deactivated successfully",
      staff,
    });
  } catch (error) {
    console.error("UPDATE STAFF STATUS ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to update staff status",
    });
  }
});

 
// DELETE: Delete a staff member
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can delete staff members",
      });
    }

    const { id } = req.params;
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        message: "No business linked to this owner",
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid staff ID",
      });
    }
const existingAssignment = await ServiceRequest.exists({
  assignedTo: id,
  businessId,
});

if (existingAssignment) {
  return res.status(409).json({
    message:
      "This staff member is assigned to service requests. Reassign or unassign those requests before deleting the account.",
  });
}

const staff = await User.findOneAndDelete({
  _id: id,
  businessId,
  role: "staff",
});
    if (!staff) {
      return res.status(404).json({
        message: "Staff member not found",
      });
    }

    return res.status(200).json({
      message: "Staff member deleted successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        staffId: staff.staffId,
      },
    });
  } catch (err) {
    console.error("DELETE STAFF ERROR:", err);

    return res.status(500).json({
      message: "Failed to delete staff member",
    });
  }
});



export default router;
