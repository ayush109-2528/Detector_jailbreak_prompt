export function Updating({ active }: { active: boolean }) {
  // Reserve this line even when idle to avoid shifting the table on each fetch.
  return (
    <div className="update-status" role="status" aria-live="polite">
      {active && (
        <>
          <span className="spinner" /> Updating results…
        </>
      )}
    </div>
  );
}
