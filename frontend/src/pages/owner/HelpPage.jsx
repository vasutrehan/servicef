import { CircleHelp, CreditCard, MessageCircle, Wrench } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">HELP & SUPPORT</div>
          <h1>How ServiceFlow works</h1>
          <p className="page-subtitle">
            A quick guide to running your service business day to day.
          </p>
        </div>
      </div>

      <section className="help-grid">
        <article className="panel">
          <div className="help-icon">
            <Wrench size={20} />
          </div>
          <h2>Owner workflow</h2>
          <p>
            Add customers, create service requests, assign staff, and track
            invoices from the workspace sidebar. Use search and notifications in
            the top bar to jump to unpaid invoices or unassigned jobs.
          </p>
        </article>
        <article className="panel">
          <div className="help-icon">
            <MessageCircle size={20} />
          </div>
          <h2>Staff portal</h2>
          <p>
            Share each technician’s Staff ID and password. They sign in at
            `/staff/login`, start jobs, and complete work with a final amount.
            That creates the invoice and sends the customer a WhatsApp notice.
          </p>
        </article>
        <article className="panel">
          <div className="help-icon">
            <CreditCard size={20} />
          </div>
          <h2>Payments</h2>
          <p>
            Completing a job creates a Razorpay payment link when credentials are
            configured. Customers can pay from the WhatsApp message. You can also
            mark invoices paid manually, or resend the WhatsApp notice from
            Invoices.
          </p>
        </article>
        <article className="panel">
          <div className="help-icon">
            <CircleHelp size={20} />
          </div>
          <h2>Reminders</h2>
          <p>
            Appointment reminders are sent via WhatsApp for pending and
            in-progress jobs scheduled within the next 24 hours.
          </p>
        </article>
      </section>
    </div>
  );
}
