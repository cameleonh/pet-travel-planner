export default function Loading() {
  return (
    <main aria-busy="true">
      <header className="topbar loading-topbar">
        <span className="skeleton skeleton-brand" />
        <span className="skeleton skeleton-badge" />
      </header>
      <section className="intro loading-intro">
        <span className="skeleton skeleton-kicker" />
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-copy" />
      </section>
      <section className="search-workspace loading-workspace" role="status" aria-live="polite">
        <p className="sr-only">반려견과 갈 수 있는 장소를 불러오고 있어요</p>
        <div className="control-panel loading-panel">
          <span className="skeleton skeleton-heading" />
          <div className="loading-controls">
            <span className="skeleton skeleton-control" />
            <span className="skeleton skeleton-control" />
            <span className="skeleton skeleton-control" />
          </div>
        </div>
        <div className="results-panel loading-panel">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-result" />
        </div>
      </section>
    </main>
  );
}
