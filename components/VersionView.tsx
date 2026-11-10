"use client";

import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import GridViewIcon from "@mui/icons-material/GridView";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";
import { buildSiteTree } from "@/lib/siteMap";
import { formatPercent } from "@/lib/versions";
import CompareDialog from "./CompareDialog";
import type { ComparedPage, PageWithDiff } from "./pages";
import ScreenshotCanvas from "./ScreenshotCanvas";
import SiteMap from "./SiteMap";

type ViewMode = "canvas" | "sitemap";

interface Props {
  title: string;
  subtitle: string;
  pages: PageWithDiff[];
  /** Set when there's a previous version to compare against. */
  comparison?: { previousLabel: string; percent: number; removed: string[] };
}

/** A version's pages, as a free-form canvas or a site map. */
export default function VersionView({ title, subtitle, pages, comparison }: Props) {
  const [mode, setMode] = useState<ViewMode>("canvas");
  const [comparing, setComparing] = useState<ComparedPage | null>(null);
  const tree = useMemo(() => buildSiteTree(pages), [pages]);

  return (
    <Box sx={{ position: "fixed", inset: 0, overflow: "hidden", bgcolor: "background.default" }}>
      {mode === "canvas" ? (
        <ScreenshotCanvas tree={tree} onCompare={setComparing} />
      ) : (
        <SiteMap tree={tree} onCompare={setComparing} />
      )}

      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 0.5,
          pr: 2,
          py: 0.5,
          maxWidth: { xs: "calc(100vw - 32px)", md: "calc(50vw - 150px)" },
        }}
      >
        <Tooltip title="All versions">
          <IconButton component={Link} href="/" aria-label="Back to all versions">
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {subtitle} · {pages.length} {pages.length === 1 ? "page" : "pages"}
            {comparison && ` · ${formatPercent(comparison.percent)} changed vs ${comparison.previousLabel}`}
            {comparison?.removed.length ? ` · ${comparison.removed.length} removed` : ""}
          </Typography>
        </Box>
      </Paper>

      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          top: { xs: 84, md: 16 },
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
        }}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, value: ViewMode | null) => value && setMode(value)}
          aria-label="View"
          sx={{ "& .MuiToggleButton-root": { border: 0, px: 2, gap: 1 } }}
        >
          <ToggleButton value="canvas">
            <GridViewIcon fontSize="small" /> Canvas
          </ToggleButton>
          <ToggleButton value="sitemap">
            <AccountTreeIcon fontSize="small" /> Site map
          </ToggleButton>
        </ToggleButtonGroup>
      </Paper>

      {comparison && (
        <CompareDialog
          page={comparing}
          versionLabel={title}
          previousLabel={comparison.previousLabel}
          onClose={() => setComparing(null)}
        />
      )}
    </Box>
  );
}
