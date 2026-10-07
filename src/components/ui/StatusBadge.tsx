import React from 'react';

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  // --- PM Provided DLR Statuses ---
  DELIVERED: { bg: "#DCFCE7", text: "#166534", border: "#16A34A", label: "Delivered" },
  SUBMITTED: { bg: "#DBEAFE", text: "#1E40AF", border: "#2563EB", label: "Submitted" },
  SENT_TO_VENDOR: { bg: "#E0E7FF", text: "#3730A3", border: "#4F46E5", label: "Sent to Vendor" },
  SUBMITTING: { bg: "#F3E8FF", text: "#6B21A8", border: "#9333EA", label: "Submitting" },
  ATTEMPTING: { bg: "#F3E8FF", text: "#6B21A8", border: "#9333EA", label: "Attempting" },
  QUEUED: { bg: "#F3F4F6", text: "#374151", border: "#6B7280", label: "Queued" },
  PENDING: { bg: "#FEF3C7", text: "#92400E", border: "#F59E0B", label: "Pending" },
  UNDELIVERED: { bg: "#FFEDD5", text: "#9A3412", border: "#EA580C", label: "Undelivered" },
  FAILED: { bg: "#FEE2E2", text: "#991B1B", border: "#DC2626", label: "Failed" },
  REJECTED: { bg: "#FEE2E2", text: "#7F1D1D", border: "#991B1B", label: "Rejected" },
  EXPIRED: { bg: "#FEF3C7", text: "#78350F", border: "#92400E", label: "Expired" },
  UNCERTAIN: { bg: "#FEF9C3", text: "#854D0E", border: "#EAB308", label: "Uncertain" },
  UNKNOWN: { bg: "#E2E8F0", text: "#334155", border: "#475569", label: "Unknown" },

  // --- Extended Generic Statuses using the same PM Color Palette ---
  ACTIVE: { bg: "#DCFCE7", text: "#166534", border: "#16A34A", label: "Active" },
  ONLINE: { bg: "#DCFCE7", text: "#166534", border: "#16A34A", label: "Online" },
  CONNECTED: { bg: "#DCFCE7", text: "#166534", border: "#16A34A", label: "Connected" },
  HEALTHY: { bg: "#DCFCE7", text: "#166534", border: "#16A34A", label: "Healthy" },
  WARMING: { bg: "#FEF9C3", text: "#854D0E", border: "#EAB308", label: "Warming" },
  CRITICAL: { bg: "#FEE2E2", text: "#991B1B", border: "#DC2626", label: "Critical" },
  
  TRIAL: { bg: "#DBEAFE", text: "#1E40AF", border: "#2563EB", label: "Trial" },
  BOUND: { bg: "#DBEAFE", text: "#1E40AF", border: "#2563EB", label: "Bound" },
  
  SUSPENDED: { bg: "#FEE2E2", text: "#991B1B", border: "#DC2626", label: "Suspended" },
  OFFLINE: { bg: "#FEE2E2", text: "#991B1B", border: "#DC2626", label: "Offline" },
  
  DRAFT: { bg: "#F3F4F6", text: "#374151", border: "#6B7280", label: "Draft" },
  MULTIPLE_RATES: { bg: "#DBEAFE", text: "#1E40AF", border: "#2563EB", label: "Multiple Rates" },
};

interface StatusBadgeProps {
  status?: string | null;
  customText?: React.ReactNode; // Allow overriding the text while keeping the color
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, customText }) => {
  if (status === null || status === undefined || status === "") {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium border bg-gray-100 text-gray-600 border-gray-300">
        {customText || "-"}
      </span>
    );
  }

  const normalizedStatus = String(status).toUpperCase().replace(/\s+/g, '_');
  const config = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.UNKNOWN;

  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium border"
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border,
      }}
    >
      {customText !== undefined ? customText : (STATUS_COLORS[normalizedStatus] ? config.label : status)}
    </span>
  );
};