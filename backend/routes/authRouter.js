import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/users.js";

const router = express.Router();


router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

  if (
  typeof name !== "string" ||
  !name.trim() ||
  typeof email !== "string" ||
  !email.trim() ||
  typeof password !== "string" ||
  password.length < 8
) {
  return res.status(400).json({
    message:
      "A name, valid email, and password of at least 8 characters are required",
  });
}

   const normalizedEmail = email.trim().toLowerCase();

const existingUser = await User.findOne({
  email: normalizedEmail,
});

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "owner",
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Registration failed" });
  }
});



router.post("/login", async (req, res) => {
  try {
    const { email, staffId, password } = req.body;
    const hasEmail = typeof email === "string" && email.trim() !== "";
const hasStaffId =
  typeof staffId === "string" && staffId.trim() !== "";

if (
  (!hasEmail && !hasStaffId) ||
  (hasEmail && hasStaffId) ||
  typeof password !== "string" ||
  !password
) {
  return res.status(400).json({
    message: "Provide either email or staff ID, and password",
  });
}

 
    const user = email
      ? await User.findOne({ email: email.trim().toLowerCase() })
      : await User.findOne({ staffId: staffId.trim().toUpperCase() });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    if (user.role === "staff" && user.isActive === false) {
      return res.status(403).json({
        message: "This staff account has been deactivated",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const role = user.role || "owner";

    const token = jwt.sign(
      {
        userId: user._id,
        businessId: user.businessId,
        role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        staffId: user.staffId,
        role,
        businessId: user.businessId,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err.message);

    return res.status(500).json({
      message: "Login failed",
    });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Token required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        staffId: user.staffId,
        role: user.role || "owner",
        businessId: user.businessId,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
});

export default router;