import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middleware/authMiddleware.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Customer from "../models/Customer.js";
import Invoice from "../models/Invoice.js";

const router = express.Router();

router.get("/summary", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only business owners can access the dashboard",
      });
    }

    const businessId = req.user.businessId;

    if (!businessId || !mongoose.isValidObjectId(businessId)) {
      return res.status(400).json({
        message: "No business linked to this user",
      });
    }

    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      cancelledRequests,
      unassignedRequests,
      totalCustomers,
      revenueResult,
      unpaidInvoices,
      unpaidAmountResult,
      revenueByDay,
    ] = await Promise.all([
      ServiceRequest.countDocuments({ businessId }),
      ServiceRequest.countDocuments({ businessId, status: "pending" }),
      ServiceRequest.countDocuments({ businessId, status: "in-progress" }),
      ServiceRequest.countDocuments({ businessId, status: "completed" }),
      ServiceRequest.countDocuments({ businessId, status: "cancelled" }),
      ServiceRequest.countDocuments({
        businessId,
        assignedTo: null,
        status: { $nin: ["completed", "cancelled"] },
      }),
      Customer.countDocuments({ businessId }),
      Invoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            paymentStatus: "paid",
            paidAt: { $gte: monthStart, $lt: nextMonthStart },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
      ]),
      Invoice.countDocuments({ businessId, paymentStatus: "pending" }),
      Invoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            paymentStatus: "pending",
          },
        },
        { $group: { _id: null, totalUnpaid: { $sum: "$amount" } } },
      ]),
      Invoice.aggregate([
        {
          $match: {
            businessId: businessObjectId,
            paymentStatus: "paid",
            paidAt: { $gte: lastMonthStart, $lt: nextMonthStart },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
            },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    return res.status(200).json({
      message: "Dashboard summary fetched successfully",
      summary: {
        totalRequests,
        pendingRequests,
        inProgressRequests,
        completedRequests,
        cancelledRequests,
        unassignedRequests,
        totalCustomers,
        revenueThisMonth: revenueResult[0]?.totalRevenue ?? 0,
        unpaidInvoices,
        unpaidInvoiceAmount: unpaidAmountResult[0]?.totalUnpaid ?? 0,
        revenueByDay: revenueByDay.map((row) => ({
          date: row._id,
          total: row.total,
        })),
        periodBounds: {
          monthStart,
          nextMonthStart,
          sevenDaysAgo,
          lastMonthStart,
        },
      },
    });
  } catch (error) {
    console.error("DASHBOARD SUMMARY ERROR:", error.message);

    return res.status(500).json({
      message: "Failed to fetch dashboard summary",
    });
  }
});

export default router;
