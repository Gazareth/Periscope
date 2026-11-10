"use client";

import AddIcon from "@mui/icons-material/Add";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import RemoveIcon from "@mui/icons-material/Remove";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import { useEffect } from "react";

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** Back to 100%. */
  onReset: () => void;
  onFit: () => void;
}

/**
 * Bottom-right zoom buttons, plus Figma-style shortcuts:
 * +/- zoom, Shift+0 = 100%, Shift+1 = fit.
 */
export default function ZoomControls({ scale, onZoomIn, onZoomOut, onReset, onFit }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, [role=dialog]")) return;
      if (e.key === "+" || e.key === "=") onZoomIn();
      else if (e.key === "-" || e.key === "_") onZoomOut();
      else if (e.shiftKey && e.code === "Digit0") onReset();
      else if (e.shiftKey && e.code === "Digit1") onFit();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onZoomIn, onZoomOut, onReset, onFit]);

  return (
    <Paper
      elevation={3}
      sx={{
        position: "absolute",
        bottom: 16,
        right: 16,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        p: 0.5,
      }}
    >
      <Tooltip title="Zoom out (-)">
        <IconButton size="small" aria-label="Zoom out" onClick={onZoomOut}>
          <RemoveIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Reset to 100% (Shift+0)">
        <Button
          size="small"
          color="inherit"
          onClick={onReset}
          sx={{ minWidth: 56, fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(scale * 100)}%
        </Button>
      </Tooltip>
      <Tooltip title="Zoom in (+)">
        <IconButton size="small" aria-label="Zoom in" onClick={onZoomIn}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <Tooltip title="Fit all pages (Shift+1)">
        <IconButton size="small" aria-label="Fit all pages" onClick={onFit}>
          <FitScreenIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}
