import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ConnectDB from "./config/db.js";

import authRoutes from "./routes/authRouter.js";
import businessRoutes from "./routes/businessRouter.js";
import customerRoutes from "./routes/customerRouter.js";
import serviceRequestRoutes from "./routes/serviceRequestRouter.js";
import serviceRoutes from "./routes/serviceRouter.js";
import staffRouter from "./routes/staffRouter.js";
import dashboardRoutes from "./routes/dashboardRouter.js";
import invoiceRoutes from "./routes/invoiceRouter.js";
import { startReminderScheduler } from "./services/reminderScheduler.js";
import razorpayWebhookRouter from "./routes/razorpayWebhookRouter.js";

import authMiddleware from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, Postman) send no Origin.
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin) ||
        (process.env.NODE_ENV !== "production" && isLocalDevOrigin(origin))
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use("/api/webhooks/razorpay", razorpayWebhookRouter);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/service-requests", serviceRequestRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/staff", staffRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/invoices", invoiceRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to ServiceFlow API",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "ServiceFlow API is running",
  });
});

app.get("/api/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "You accessed a protected route",
    user: req.user,
  });
});

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await ConnectDB();
    startReminderScheduler();
    app.listen(PORT, () => {
      console.log(`ServiceFlow server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
