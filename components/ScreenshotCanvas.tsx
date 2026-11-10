"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flattenSiteNode, isHome, type SiteNode } from "@/lib/siteMap";
import PageDiffChip from "./PageDiffChip";
import { toComparedPage, type ComparedPage, type PageWithDiff } from "./pages";
import ZoomControls from "./ZoomControls";

interface View {
  x: number;
  y: number;
  scale: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_SCALE = 0.02;
const MAX_SCALE = 8;
const FIT_PADDING = 64;
const GRID_GAP = 120;
const BUTTON_ZOOM = 1.25;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Zoom by `factor`, keeping the screen point (px, py) fixed. */
function zoomAt(view: View, factor: number, px: number, py: number): View {
  const scale = clampScale(view.scale * factor);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

/**
 * Site-map ordering as rows: home and standalone pages first, then one row per
 * page that has sub-pages (the page followed by its descendants).
 */
function canvasRows(tree: SiteNode<PageWithDiff>[]): PageWithDiff[][] {
  const standalone = tree.filter((n) => n.children.length === 0).map((n) => n.page);
  const sections = tree.filter((n) => n.children.length > 0).map(flattenSiteNode);
  // A home page with sub-pages still comes first.
  const homeSection = tree[0] && isHome(tree[0]) && tree[0].children.length > 0 ? sections.splice(0, 1) : [];
  return [...homeSection, standalone, ...sections].filter((row) => row.length > 0);
}

interface Props {
  tree: SiteNode<PageWithDiff>[];
  onCompare: (page: ComparedPage) => void;
}

export default function ScreenshotCanvas({ tree, onCompare }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  // Smoothly animate button/keyboard zooms, but not drags or wheel zooms.
  const [animate, setAnimate] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  // Keep fitting the grid as images load, until the user takes over.
  const userMoved = useRef(false);
  const rows = useMemo(() => canvasRows(tree), [tree]);

  const fitRect = useCallback((rect: Rect, maxScale: number) => {
    const vp = viewportRef.current;
    if (!vp || rect.width <= 0 || rect.height <= 0) return;
    const { clientWidth: w, clientHeight: h } = vp;
    const scale = clampScale(
      Math.min(
        (w - FIT_PADDING * 2) / rect.width,
        (h - FIT_PADDING * 2) / rect.height,
        maxScale,
      ),
    );
    setView({
      scale,
      x: (w - rect.width * scale) / 2 - rect.x * scale,
      y: (h - rect.height * scale) / 2 - rect.y * scale,
    });
  }, []);

  const fitAll = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;
    fitRect({ x: 0, y: 0, width: content.offsetWidth, height: content.offsetHeight }, 1);
  }, [fitRect]);

  /** Zoom around the viewport centre. */
  const zoomCentered = useCallback((getFactor: (scale: number) => number) => {
    const vp = viewportRef.current;
    if (!vp) return;
    userMoved.current = true;
    setAnimate(true);
    setView((v) => zoomAt(v, getFactor(v.scale), vp.clientWidth / 2, vp.clientHeight / 2));
  }, []);

  const fitAllByUser = useCallback(() => {
    userMoved.current = true;
    setAnimate(true);
    fitAll();
  }, [fitAll]);

  // Auto-fit while images load and the window resizes.
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (!userMoved.current) fitAll();
    });
    if (contentRef.current) observer.observe(contentRef.current);
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [fitAll]);

  // Mouse wheel / trackpad pinch zooms towards the cursor.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      userMoved.current = true;
      setAnimate(false);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vp.clientHeight : 1;
      // Pinch gestures arrive as ctrl+wheel with small deltas.
      const speed = e.ctrlKey ? 0.01 : 0.0015;
      const factor = Math.exp(-e.deltaY * unit * speed);
      const rect = vp.getBoundingClientRect();
      setView((v) => zoomAt(v, factor, e.clientX - rect.left, e.clientY - rect.top));
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

  const zoomIn = useCallback(() => zoomCentered(() => BUTTON_ZOOM), [zoomCentered]);
  const zoomOut = useCallback(() => zoomCentered(() => 1 / BUTTON_ZOOM), [zoomCentered]);
  const zoomReset = useCallback(() => zoomCentered((s) => 1 / s), [zoomCentered]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault(); // stops middle-click autoscroll and text selection
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    userMoved.current = true;
    setAnimate(false);
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    d.x = e.clientX;
    d.y = e.clientY;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  // Double-click a page to zoom to it. Pointer capture retargets events to the
  // viewport, so find the page under the cursor directly.
  const onDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const frame = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>("[data-frame]");
    const content = contentRef.current;
    if (!frame || !content) return;
    const c = content.getBoundingClientRect();
    const f = frame.getBoundingClientRect();
    setAnimate(true);
    fitRect(
      {
        x: (f.left - c.left) / view.scale,
        y: (f.top - c.top) / view.scale,
        width: f.width / view.scale,
        height: f.height / view.scale,
      },
      MAX_SCALE,
    );
  };

  // Dot grid that tracks pan and zoom, kept at a readable density.
  let dotSpacing = 24 * view.scale;
  while (dotSpacing < 12) dotSpacing *= 4;
  const transition = animate ? "transform 250ms ease-out, background 250ms ease-out" : "none";

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Box
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={onDoubleClick}
        sx={{
          position: "absolute",
          inset: 0,
          touchAction: "none",
          userSelect: "none",
          backgroundImage: (t) =>
            `radial-gradient(circle, ${t.vars?.palette.divider ?? t.palette.divider} 1px, transparent 1.5px)`,
        }}
        style={{
          cursor: dragging ? "grabbing" : "grab",
          backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
          transition,
        }}
      >
        <div
          ref={contentRef}
          style={
            {
              position: "absolute",
              top: 0,
              left: 0,
              transformOrigin: "0 0",
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transition,
              // Labels and outlines stay the same size on screen at any zoom.
              "--inv-scale": 1 / view.scale,
              "--label-size": `${Math.min(13 / view.scale, GRID_GAP * 0.6)}px`,
              imageRendering: view.scale >= 2 ? "pixelated" : "auto",
            } as React.CSSProperties
          }
        >
          <FrameRows rows={rows} onCompare={onCompare} />
        </div>
      </Box>

      <ZoomControls
        scale={view.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={zoomReset}
        onFit={fitAllByUser}
      />
    </Box>
  );
}

/** The pages, one row per site section. Memoised so panning doesn't re-render every image. */
const FrameRows = memo(function FrameRows({
  rows,
  onCompare,
}: {
  rows: PageWithDiff[][];
  onCompare: (page: ComparedPage) => void;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: `${GRID_GAP * 1.5}px`, pt: `${GRID_GAP / 2}px` }}>
      {rows.map((row) => (
        <Box key={row[0].key} sx={{ display: "flex", alignItems: "flex-start", gap: `${GRID_GAP}px` }}>
          {row.map((s) => (
            <Frame key={s.key} screenshot={s} onCompare={onCompare} />
          ))}
        </Box>
      ))}
    </Box>
  );
});

// Keeps clicks on a chip from starting a pan or a double-click zoom.
const stopCanvasGesture = {
  onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
  onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
};

function Frame({
  screenshot,
  onCompare,
}: {
  screenshot: PageWithDiff;
  onCompare: (page: ComparedPage) => void;
}) {
  const [failed, setFailed] = useState(false);
  const { diff } = screenshot;
  const compared = toComparedPage(screenshot);
  return (
    <Box data-frame sx={{ position: "relative" }}>
      {/* Label row: sized in --label-size units so it stays readable at any zoom. */}
      <Box
        sx={{
          position: "absolute",
          bottom: "100%",
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "flex-end",
          gap: "calc(var(--label-size) * 0.75)",
          mb: "calc(6px * var(--inv-scale))",
          fontSize: "var(--label-size)",
        }}
      >
        <Typography
          component="div"
          color="text.secondary"
          noWrap
          title={screenshot.name}
          sx={{ flex: 1, minWidth: 0, fontSize: "inherit", lineHeight: 1.2 }}
        >
          {screenshot.name}
        </Typography>
        {diff && (
          <PageDiffChip
            diff={diff}
            {...stopCanvasGesture}
            onClick={compared && (() => onCompare(compared))}
            sx={{
              flexShrink: 0,
              height: "1.6em",
              fontSize: "inherit",
              borderRadius: "0.8em",
              "& .MuiChip-label": { px: "0.6em" },
            }}
          />
        )}
      </Box>
      <Box
        sx={{
          bgcolor: "background.paper",
          boxShadow: 2,
          outline: "calc(2px * var(--inv-scale)) solid transparent",
          "&:hover": { outlineColor: (t) => t.palette.primary.main },
        }}
      >
        {failed ? (
          <Box
            sx={{ width: 480, height: 320, display: "grid", placeItems: "center", color: "text.secondary" }}
          >
            Failed to load
          </Box>
        ) : (
          // Plain <img>: sizes are unknown and the canvas scales them itself.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screenshot.url}
            alt={screenshot.name}
            draggable={false}
            decoding="async"
            onError={() => setFailed(true)}
            style={{ display: "block", maxWidth: "none" }}
          />
        )}
      </Box>
    </Box>
  );
}
