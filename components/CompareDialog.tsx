"use client";

import CloseIcon from "@mui/icons-material/Close";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import ImageDiffView from "./ImageDiffView";
import PageDiffChip from "./PageDiffChip";
import type { ComparedPage } from "./pages";

interface Props {
  page: ComparedPage | null;
  versionLabel: string;
  previousLabel: string;
  onClose: () => void;
}

/** Full-screen comparison of one page against the previous version. */
export default function CompareDialog({ page, versionLabel, previousLabel, onClose }: Props) {
  const diff = useMemo(
    () =>
      page && {
        expected: { url: page.diff.previousUrl, title: previousLabel },
        actual: { url: page.url, title: versionLabel },
        diffUrl: page.diff.diffUrl,
      },
    [page, previousLabel, versionLabel],
  );

  return (
    <Dialog fullScreen open={!!page} onClose={onClose}>
      <AppBar position="sticky" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton edge="start" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {page?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {versionLabel} vs {previousLabel}
            </Typography>
          </Box>
          {page && <PageDiffChip diff={page.diff} />}
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2, display: "flex" }}>{diff && <ImageDiffView diff={diff} />}</Box>
    </Dialog>
  );
}
