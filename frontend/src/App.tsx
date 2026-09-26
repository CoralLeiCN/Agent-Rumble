import { ArenaScreen } from "./arena/ArenaScreen";
import { catalogGateway } from "./data/catalogGateway";
import { CatalogNotice } from "./catalog/CatalogNotice";
import { ExploreScreen } from "./catalog/ExploreScreen";
import { ResultsScreen } from "./catalog/ResultsScreen";
import { useCatalogApp } from "./catalog/useCatalogApp";
import { ComparisonScreen } from "./comparison/ComparisonScreen";
import { EvidenceDrawer } from "./evidence/EvidenceDrawer";
import type { CatalogGateway } from "./types/catalog";

function AppHeader({ onExplore }: { onExplore: () => void }) {
  return (
    <header className="site-header">
      <button className="wordmark" type="button" onClick={onExplore}>
        <span className="wordmark__mark" aria-hidden="true">
          AR
        </span>
        <span>
          <strong>Agent Rumble</strong>
        </span>
      </button>
      <nav aria-label="Primary navigation">
        <button
          className="nav-link nav-link--active"
          type="button"
          onClick={onExplore}
        >
          Explore
        </button>
      </nav>
    </header>
  );
}

interface AppProps {
  gateway?: CatalogGateway;
}

export function App({ gateway = catalogGateway }: AppProps) {
  const {
    context,
    setContext,
    catalogContext,
    view,
    query,
    setQuery,
    response,
    shortlist,
    comparison,
    evidence,
    drawerOpen,
    pending,
    error,
    mainRef,
    canEnterRumble,
    arenaGateway,
    announceView,
    search,
    toggleProject,
    openComparison,
    openEvidence,
    closeDrawer,
    reset,
  } = useCatalogApp(gateway);
  return (
    <>
      <div className="app-shell" inert={drawerOpen ? true : undefined}>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <CatalogNotice context={catalogContext} />
        <AppHeader onExplore={reset} />
        <main id="main-content" ref={mainRef} tabIndex={-1}>
          {view === "explore" && (
            <ExploreScreen
              context={context}
              onContextChange={setContext}
              query={query}
              pending={pending === "search"}
              onQueryChange={setQuery}
              onSubmit={() => void search()}
              onBrowseAll={() => void search("")}
            />
          )}
          {view === "results" && response && (
            <ResultsScreen
              response={response}
              shortlist={shortlist}
              onToggle={toggleProject}
              onEdit={() => announceView("explore")}
              onLoadMore={() => void search(response.query, response.page + 1)}
              loadingMore={pending === "search"}
            />
          )}
          {view === "comparison" && comparison && (
            <ComparisonScreen
              comparison={comparison}
              projects={response?.projects ?? []}
              onBack={() => announceView("results")}
              onOpenEvidence={(id, trigger) => void openEvidence(id, trigger)}
            />
          )}
          {view === "arena" && (
            <ArenaScreen
              gateway={arenaGateway}
              projectIds={shortlist}
              onExit={() => announceView("results")}
              onOpenEvidence={(reference, trigger) =>
                void openEvidence(reference, trigger)
              }
            />
          )}
          {error && !drawerOpen && (
            <p className="page-error" role="alert">
              {error}
            </p>
          )}
        </main>
        {view === "results" && shortlist.length > 0 && (
          <div className="compare-tray" aria-live="polite">
            <div>
              <span>Shortlist</span>
              <strong>{shortlist.length} / 3 projects</strong>
              <p>
                {shortlist
                  .map(
                    (id) =>
                      response?.projects.find((project) => project.id === id)
                        ?.name,
                  )
                  .join(" · ")}
              </p>
            </div>
            <div className="compare-tray__actions">
              <button
                className={`button ${canEnterRumble ? "button--tray-secondary" : "button--primary"}`}
                type="button"
                disabled={shortlist.length < 2 || pending === "comparison"}
                onClick={() => void openComparison()}
              >
                {pending === "comparison"
                  ? "Preparing…"
                  : shortlist.length < 2
                    ? "Select one more"
                    : "Compare projects →"}
              </button>
              {canEnterRumble && (
                <button
                  className="button button--primary"
                  type="button"
                  onClick={() => announceView("arena")}
                >
                  Enter Rumble →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {drawerOpen && (
        <EvidenceDrawer
          evidence={evidence}
          pending={pending === "evidence"}
          error={error}
          isIllustrative={false}
          onClose={closeDrawer}
        />
      )}
    </>
  );
}
