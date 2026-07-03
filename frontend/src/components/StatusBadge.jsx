const STATUS_STYLES = {
  PLACED: { bg: '#1e3a5f', color: '#93c5fd', label: 'Placed' },
  PROCESSING: { bg: '#3b2f1a', color: '#fcd34d', label: 'Processing' },
  READY_TO_SHIP: { bg: '#1a3b2f', color: '#6ee7b7', label: 'Ready to Ship' },
  OUT_FOR_DELIVERY: { bg: '#3b1a4a', color: '#d8b4fe', label: 'Out for Delivery' },
  COMPLETED: { bg: '#14332a', color: '#4ade80', label: 'Completed' },
  CANCELLED: { bg: '#3b1a1a', color: '#fca5a5', label: 'Cancelled' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#2d3a4f', color: '#e8edf5', label: status };

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '0.8rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  );
}
