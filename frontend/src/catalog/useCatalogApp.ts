import { useEffect, useMemo, useRef, useState } from "react";
import { projectCardToSummary } from "../data/projectCardAdapter";
import {
  CanonicalRumbleGateway,
  isRumblePair,
} from "../data/canonicalRumbleGateway";
import { restoreSession, saveSession } from "../data/session";
import { cleanContext } from "../comparison/ContextEditor";
import type {
  CatalogGateway,
  CatalogContext,
  AssessmentContextInput,
  ClaimEvidenceRecord,
  ClaimReference,
  ComparisonResponse,
  SearchResponse,
} from "../types/catalog";
type View = "explore" | "results" | "comparison" | "arena";
type PendingAction = "search" | "comparison" | "evidence" | null;

export function useCatalogApp(gateway: CatalogGateway) {
  const [saved] = useState(restoreSession);
  const [context, setContext] = useState<AssessmentContextInput>(saved.context);
  const [catalogContext, setCatalogContext] = useState<CatalogContext | null>(
    null,
  );
  const [view, setView] = useState<View>("explore");
  const [query, setQuery] = useState(saved.query);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [shortlist, setShortlist] = useState<string[]>(saved.shortlist);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [evidence, setEvidence] = useState<ClaimEvidenceRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const evidenceTriggerRef = useRef<HTMLButtonElement | null>(null);
  const requestIdRef = useRef(0);
  const canEnterRumble = isRumblePair(shortlist);
  const arenaGateway = useMemo(
    () =>
      new CanonicalRumbleGateway(
        shortlist.flatMap((projectId) => {
          const project = response?.projects.find(
            (item) => item.id === projectId,
          );
          return project
            ? [{ projectId, cardVersion: project.cardVersion }]
            : [];
        }),
        cleanContext(context),
      ),
    [shortlist, response, context],
  );

  useEffect(
    () => saveSession({ query, context, shortlist }),
    [query, context, shortlist],
  );

  useEffect(() => {
    let cancelled = false;
    void gateway
      .getCatalogContext()
      .then((value) => {
        if (!cancelled) setCatalogContext(value);
      })
      .catch(() => {
        /* Search reports API failures separately. */
      });
    if (saved.shortlist.length) {
      const id = ++requestIdRef.current;
      void Promise.all([
        gateway.searchProjects("", 1),
        Promise.allSettled(
          saved.shortlist.map((projectId) => gateway.getCurrentCard(projectId)),
        ),
      ])
        .then(([results, cards]) => {
          if (cancelled || id !== requestIdRef.current) return;
          const restored = cards.flatMap((result) =>
            result.status === "fulfilled"
              ? [projectCardToSummary(result.value)]
              : [],
          );
          setResponse({
            ...results,
            projects: [
              ...new Map(
                [...results.projects, ...restored].map((item) => [
                  item.id,
                  item,
                ]),
              ).values(),
            ],
          });
          setShortlist(restored.map((item) => item.id));
          setView("results");
        })
        .catch(() => {
          if (!cancelled && id === requestIdRef.current)
            setError(
              "The saved shortlist could not be reloaded. Search again when the catalog is available.",
            );
        });
    }
    return () => {
      cancelled = true;
    };
  }, [gateway, saved]);

  useEffect(
    () => () => {
      requestIdRef.current += 1;
    },
    [],
  );

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && drawerOpen) closeDrawer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const announceView = (nextView: View) => {
    requestIdRef.current += 1;
    setPending(null);
    setView(nextView);
    window.requestAnimationFrame(() => mainRef.current?.focus());
  };

  const search = async (searchQuery = query, page = 1) => {
    const requestId = ++requestIdRef.current;
    setPending("search");
    setError(null);
    try {
      const result = await gateway.searchProjects(
        searchQuery,
        page,
        searchQuery
          ? cleanContext({
              ...context,
              use_case: context.use_case || searchQuery,
            })
          : undefined,
      );
      if (requestId !== requestIdRef.current) return;
      if (page === 1) {
        setResponse(result);
        setShortlist([]);
        setComparison(null);
      } else {
        setResponse((previous) =>
          previous && previous.query === result.query
            ? {
                ...result,
                projects: [
                  ...new Map(
                    [...previous.projects, ...result.projects].map(
                      (project) => [project.id, project],
                    ),
                  ).values(),
                ],
                assessmentContexts: [
                  ...previous.assessmentContexts,
                  ...result.assessmentContexts,
                ],
              }
            : previous,
        );
      }
      if (page === 1) announceView("results");
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Projects could not be loaded right now.",
      );
    } finally {
      if (requestId === requestIdRef.current) setPending(null);
    }
  };

  const toggleProject = (projectId: string) => {
    if (pending === "comparison") {
      requestIdRef.current += 1;
      setPending(null);
    }
    setShortlist((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : current.length < 3
          ? [...current, projectId]
          : current,
    );
  };

  const openComparison = async () => {
    if (shortlist.length < 2) return;
    const requestId = ++requestIdRef.current;
    setPending("comparison");
    setError(null);
    try {
      const result = await gateway.compareProjects(
        shortlist.map((projectId) => {
          const project = response!.projects.find(
            ({ id }) => id === projectId,
          )!;
          return { projectId, cardVersion: project.cardVersion };
        }),
        cleanContext(context),
      );
      if (requestId !== requestIdRef.current) return;
      setComparison(result);
      announceView("comparison");
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "The comparison could not be prepared.",
      );
    } finally {
      if (requestId === requestIdRef.current) setPending(null);
    }
  };

  const openEvidence = async (
    reference: ClaimReference,
    trigger: HTMLButtonElement,
  ) => {
    const requestId = ++requestIdRef.current;
    evidenceTriggerRef.current = trigger;
    setEvidence(null);
    setError(null);
    setDrawerOpen(true);
    setPending("evidence");
    try {
      const result = await gateway.getClaimEvidence(reference);
      if (requestId !== requestIdRef.current) return;
      setEvidence(result);
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Source details could not be loaded.",
      );
    } finally {
      if (requestId === requestIdRef.current) setPending(null);
    }
  };

  const closeDrawer = () => {
    requestIdRef.current += 1;
    setPending(null);
    setDrawerOpen(false);
    setEvidence(null);
    setError(null);
    window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus());
  };

  const reset = () => {
    setResponse(null);
    setComparison(null);
    setShortlist([]);
    setDrawerOpen(false);
    setEvidence(null);
    setError(null);
    announceView("explore");
  };

  return {
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
  };
}
