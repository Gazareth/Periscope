"use client";

import Chip, { type ChipProps } from "@mui/material/Chip";
import type { PageDiff } from "@/lib/diff";
import { formatPercent } from "@/lib/versions";

/** How much a page changed since the previous version. */
export default function PageDiffChip({ diff, ...props }: { diff: PageDiff } & ChipProps) {
  if (diff.status === "added") {
    return <Chip size="small" color="info" label="New page" {...props} />;
  }
  if (diff.diffPixels === 0) {
    return <Chip size="small" color="success" variant="outlined" label="No change" {...props} />;
  }
  return (
    <Chip
      size="small"
      color="warning"
      label={`${formatPercent(diff.percent)} changed${diff.sizeChanged ? " · resized" : ""}`}
      {...props}
    />
  );
}
