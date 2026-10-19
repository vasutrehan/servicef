import jwt from "jsonwebtoken";
import User from "../models/users.js";

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Token required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select(
      "isActive role businessId name email staffId"
    );

    if (!user) {
      return res.status(401).json({
        message: "User not found",
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        message: "This account has been deactivated",
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
      businessId: user.businessId ? user.businessId.toString() : null,
      name: user.name,
      email: user.email,
      staffId: user.staffId || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;
