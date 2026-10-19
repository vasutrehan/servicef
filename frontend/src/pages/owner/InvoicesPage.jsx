import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { CreditCard, ExternalLink, LoaderCircle, RefreshCw } from "lucide-react";
import api from "../../lib/api";
import { formatCurrency, formatDate, statusLabel } from "../../lib/auth";
import { useWorkspace } from "../../lib/workspaceContext";

export default function InvoicesPage() {
  const location = useLocation();
  const { refreshWorkspace } = useWorkspace();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [focusId, setFocusId] = useState(location.state?.focusId || "");

  const fetchInvoices = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/invoices");
      setInvoices(response.data.invoices || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (location.state?.focusId) setFocusId(location.state.focusId);
  }, [location.state]);

  useEffect(() => {
    if (!focusId || loading) return;
    const row = document.getElementById(`invoice-${focusId}`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setFocusId(""), 2400);
    return () => window.clearTimeout(timer);
  }, [focusId, loading, invoices]);

  const updateStatus = async (id, paymentStatus) => {
    setUpdatingId(id);
    try {
      await api.patch(`/invoices/${id}/status`, { paymentStatus });
      await fetchInvoices();
      await refreshWorkspace();
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not update invoice.");
    } finally {
      setUpdatingId("");
    }
  };

  const resendNotice = async (id) => {
    setUpdatingId(id);
    try {
      await api.post(`/invoices/${id}/resend-whatsapp`);
      await fetchInvoices();
      window.alert("WhatsApp invoice notice sent.");
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not send WhatsApp notice.");
    } finally {
      setUpdatingId("");
    }
  };

  const regeneratePaymentLink = async (id) => {
    setUpdatingId(id);
    try {
      await api.post(`/invoices/${id}/regenerate-payment-link`);
      await fetchInvoices();
      window.alert("Payment link regenerated successfully.");
    } catch (err) {
      window.alert(err.response?.data?.message || "Could not regenerate payment link.");
    } finally {
      setUpdatingId("");
    }
  };

  const unpaid = invoices.filter((invoice) => invoice.paymentStatus === "pending");
  const unpaidTotal = unpaid.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

  return (
    <div className="workspace-page">
      <div className="welcome-row">
        <div>
          <div className="eyebrow">INVOICES & PAYMENTS</div>
          <h1>Money collected & due</h1>
          <p className="page-subtitle">
            Invoices are created when staff complete jobs. Customers get a Razorpay
            payment link on WhatsApp. You can also mark invoices paid manually.
          </p>
        </div>
      </div>

      <section className="stats-grid invoices-stats">
        <article className="stat-card">
          <div className="stat-top">
            <div className="stat-label">Total invoices</div>
            <div className="stat-icon tone-violet">
              <CreditCard size={19} />
            </div>
          </div>
          <div className="stat-value">{invoices.length}</div>
        </article>
        <article className="stat-card">
          <div className="stat-top">
            <div className="stat-label">Unpaid amount</div>
            <div className="stat-icon tone-orange">
              <CreditCard size={19} />
            </div>
          </div>
          <div className="stat-value">{formatCurrency(unpaidTotal)}</div>
        </article>
      </section>

      <article className="panel table-panel">
        <div className="panel-header table-heading">
          <div>
            <div className="panel-kicker">LEDGER</div>
            <h2>All invoices</h2>
          </div>
          <button className="button button-secondary button-small" onClick={fetchInvoices}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="workspace-empty">
            <LoaderCircle size={28} className="staff-login-spinner" />
            <p>Loading invoices…</p>
          </div>
        ) : error ? (
          <div className="workspace-empty">
            <CreditCard size={28} />
            <p>{error}</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>INVOICE</th>
                  <th>CUSTOMER</th>
                  <th>SERVICE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice._id}
                    id={`invoice-${invoice._id}`}
                    className={focusId === invoice._id ? "row-focus" : undefined}
                  >
                    <td>
                      <span className="request-id">{invoice.invoiceNumber}</span>
                      <span className="request-date">{formatDate(invoice.createdAt)}</span>
                      {invoice.paymentUrl ? (
                        <a
                          className="payment-link"
                          href={invoice.paymentUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open pay link <ExternalLink size={12} />
                        </a>
                      ) : invoice.paymentStatus === "pending" ? (
                        <button
                          className="payment-link-button"
                          disabled={updatingId === invoice._id}
                          onClick={() => regeneratePaymentLink(invoice._id)}
                        >
                          Generate pay link
                        </button>
                      ) : null}
                    </td>
                    <td>{invoice.customerId?.name || "Customer"}</td>
                    <td>{invoice.serviceRequestId?.serviceType || "Service"}</td>
                    <td className="amount-cell">{formatCurrency(invoice.amount)}</td>
                    <td>
                      <span
                        className={`status status-${
                          invoice.paymentStatus === "paid" ? "completed" : "pending"
                        }`}
                      >
                        <span />
                        {statusLabel(invoice.paymentStatus)}
                      </span>
                    </td>
                    <td className="row-actions">
                      {invoice.paymentStatus === "pending" ? (
                        <button
                          className="button button-secondary button-small"
                          disabled={updatingId === invoice._id}
                          onClick={() => updateStatus(invoice._id, "paid")}
                        >
                          Mark paid
                        </button>
                      ) : invoice.paymentStatus === "paid" ? (
                        <button
                          className="button button-secondary button-small"
                          disabled={updatingId === invoice._id}
                          onClick={() => updateStatus(invoice._id, "pending")}
                        >
                          Mark unpaid
                        </button>
                      ) : null}
                      <button
                        className="button button-secondary button-small"
                        disabled={updatingId === invoice._id}
                        onClick={() => resendNotice(invoice._id)}
                      >
                        Resend WhatsApp
                      </button>
                    </td>
                  </tr>
                ))}
                {invoices.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      No invoices yet. They appear when staff mark jobs completed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  );
}
