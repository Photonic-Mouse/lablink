export default function ShowMore({
  shown,
  total,
  isExpanded,
  onToggle,
  onBrowse,
}: {
  shown: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onBrowse: () => void;
}) {
  return (
    <div className="showmore-controls">
      <span className="showmore-count">Showing {shown} of {total} instruments</span>
      <div className="showmore-actions">
        <button className="btn btn-dark" onClick={onToggle} disabled={!total}>
          {isExpanded ? "SHOW LESS ↑" : "SHOW MORE ↓"}
        </button>
        <button className="outline-btn" onClick={onBrowse} disabled={!total}>
          BROWSE ALL INSTRUMENTS →
        </button>
      </div>
    </div>
  );
}
