
import cron from "node-cron";
import ServiceRequest from "../models/ServiceRequest.js";
import customer from "../models/Customer.js";
import { sendWhatsAppMessage } from "./whatsappService.js";

function formatAppointmentTime(date) {
  return new Date(date).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function startReminderScheduler() {
  // Run once every minute.
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const next24Hours = new Date(
        now.getTime() + 24 * 60 * 60 * 1000
      );

      const appointments = await ServiceRequest.find({
        scheduledAt: {
          $gt: now,
          $lte: next24Hours,
        },
        reminderSentAt: null,
        status: { $in: ["pending", "in-progress"] },
      });

      for (const appointment of appointments) {
        try {
          const Customer = await customer.findById(
            appointment.customerId
          );

          if (!Customer || !Customer.phone) {
            console.log(
              `Skipping appointment ${appointment._id}: customer phone missing`
            );
            continue;
          }

          const message = [
            "Hello! This is a reminder from ServiceFlow.",
            "",
            `Service: ${appointment.serviceType}`,
            `Appointment: ${formatAppointmentTime(
              appointment.scheduledAt
            )}`,
            `Address: ${appointment.address}`,
            "",
            "Please contact your service provider if you need to reschedule.",
          ].join("\n");

          await sendWhatsAppMessage(Customer.phone, message);

          // Save only after the WhatsApp API call succeeds.
          appointment.reminderSentAt = new Date();
          await appointment.save();

          console.log(
            `Reminder accepted for appointment ${appointment._id}`
          );
        } catch (error) {
          console.error(
            `Reminder failed for appointment ${appointment._id}:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error("Reminder scheduler error:", error.message);
    }
  });

  console.log("WhatsApp appointment reminder scheduler started.");
}