"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { VersionSummary } from "@/lib/r2";
import { formatPercent } from "@/lib/versions";
import { CARD_SIZE } from "./carouselSize";

const GAP = 24;
// Fade the cards out towards both edges.
const EDGE_FADE = "linear-gradient(to right, transparent, #000 28%, #000 72%, transparent)";

/** Start on the newest release; versions are sorted oldest first. */
function initialIndex(versions: VersionSummary[]): number {
  const latestRelease = versions.findLastIndex((v) => v.kind === "release");
  return latestRelease >= 0 ? latestRelease : 0;
}

export default function VersionCarousel({ versions }: { versions: VersionSummary[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(() => initialIndex(versions));

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    const left = card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2;
    el.scrollTo({ left, behavior });
  }, []);

  const select = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(versions.length - 1, index));
      setSelected(clamped);
      scrollToIndex(clamped);
    },
    [versions.length, scrollToIndex],
  );

  // Centre the initial card before the first paint, then reveal the carousel.
  useLayoutEffect(() => {
    scrollToIndex(initialIndex(versions), "instant");
    if (scrollerRef.current) scrollerRef.current.style.opacity = "1";
  }, [versions, scrollToIndex]);

  // Whichever card is nearest the centre is the selected one.
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const centre = el.scrollLeft + el.clientWidth / 2;
    let nearest = 0;
    let best = Infinity;
    Array.from(el.children).forEach((child, i) => {
      const card = child as HTMLElement;
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - centre);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    });
    setSelected(nearest);
  };

  // Let a normal mouse wheel scroll the carousel sideways.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({ left: e.deltaY });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") select(selected - 1);
    else if (e.key === "ArrowRight") select(selected + 1);
    else return;
    e.preventDefault();
  };

  if (versions.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ textAlign: "center" }}>
        No versions found in the bucket yet.
      </Typography>
    );
  }

  return (
    <Box sx={{ position: "relative" }} onKeyDown={onKeyDown}>
      <Box
        ref={scrollerRef}
        onScroll={onScroll}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: `${GAP}px`,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          // Lets the first and last cards reach the centre.
          px: `calc(50% - ${CARD_SIZE.width / 2}px)`,
          py: 3,
          opacity: 0,
          maskImage: EDGE_FADE,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {versions.map((version, i) => (
          <VersionCard
            key={version.id}
            version={version}
            selected={i === selected}
            onSelect={() => select(i)}
          />
        ))}
      </Box>
      <MobileStepper
        variant={versions.length > 10 ? "text" : "dots"}
        steps={versions.length}
        position="static"
        activeStep={selected}
        sx={{ bgcolor: "transparent", width: CARD_SIZE.width + 80, maxWidth: "100%", mx: "auto" }}
        backButton={
          <Button
            size="small"
            onClick={() => select(selected - 1)}
            disabled={selected === 0}
            startIcon={<ChevronLeftIcon />}
          >
            Older
          </Button>
        }
        nextButton={
          <Button
            size="small"
            onClick={() => select(selected + 1)}
            disabled={selected === versions.length - 1}
            endIcon={<ChevronRightIcon />}
          >
            Newer
          </Button>
        }
      />
    </Box>
  );
}

function VersionCard({
  version,
  selected,
  onSelect,
}: {
  version: VersionSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      elevation={selected ? 8 : 0}
      sx={{
        flexShrink: 0,
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        scrollSnapAlign: "center",
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        transform: selected ? "none" : "scale(0.84)",
        opacity: selected ? 1 : 0.6,
        transition: "transform 250ms ease-out, opacity 250ms ease-out, box-shadow 250ms, border-color 250ms",
        "&:hover": { opacity: 1 },
      }}
    >
      <CardActionArea
        component={Link}
        href={`/v/${encodeURIComponent(version.id)}`}
        aria-current={selected ? "true" : undefined}
        // Clicking a side card brings it to the centre; clicking the centre card opens it.
        onClick={(e: React.MouseEvent) => {
          if (!selected) {
            e.preventDefault();
            onSelect();
          }
        }}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {/* Top: page count */}
        <Typography color="text.secondary" sx={{ px: 2.5, py: 1.5 }}>
          {version.pageCount} {version.pageCount === 1 ? "page" : "pages"}
        </Typography>

        {/* Middle: visual diff vs the previous version */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            borderBlock: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h3" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {!version.previousLabel
              ? "—"
              : version.diffPercent === undefined
                ? "??"
                : formatPercent(version.diffPercent)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {!version.previousLabel
              ? "first version, nothing to compare"
              : version.diffPercent === undefined
                ? `visual diff vs ${version.previousLabel} · not built yet`
                : `visual diff vs ${version.previousLabel}`}
          </Typography>
        </Box>

        {/* Bottom: version number */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography variant="h5" component="span" noWrap sx={{ fontWeight: 700 }}>
            {version.label}
          </Typography>
          <Chip
            size="small"
            label={version.kind === "release" ? "Release" : "Branch"}
            color={version.kind === "release" ? "primary" : "default"}
            variant={version.kind === "release" ? "filled" : "outlined"}
          />
        </Box>
      </CardActionArea>
    </Card>
  );
}
