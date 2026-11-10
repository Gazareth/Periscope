"use client";

/*
 * Ported from Playwright's HTML report image diff view
 * (packages/web/src/shared/imageDiffView.tsx and resizeView.tsx, v1.65.0),
 * rebuilt with MUI components.
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";

export interface ImageDiff {
  expected: { url: string; title: string };
  actual: { url: string; title: string };
  diffUrl?: string;
}

type Mode = "diff" | "actual" | "expected" | "sxs" | "slider";

async function loadImage(src?: string): Promise<HTMLImageElement> {
  const image = new Image();
  if (src) {
    image.src = src;
    await new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });
  }
  return image;
}

/** Width of an element, kept up to date as it resizes. */
function useMeasuredWidth<T extends Element>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [width, ref] as const;
}

const checkerboard = {
  backgroundImage: `linear-gradient(45deg, #80808020 25%, transparent 25%),
                    linear-gradient(-45deg, #80808020 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #80808020 75%),
                    linear-gradient(-45deg, transparent 75%, #80808020 75%)`,
  backgroundSize: "20px 20px",
  backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
  boxShadow: 4,
} as const;

interface Loaded {
  expected: HTMLImageElement;
  actual: HTMLImageElement;
  diff: HTMLImageElement;
}

export default function ImageDiffView({ diff }: { diff: ImageDiff }) {
  const [mode, setMode] = useState<Mode>(diff.diffUrl ? "diff" : "slider");
  const [showSxsDiff, setShowSxsDiff] = useState(false);
  const [images, setImages] = useState<Loaded | null>(null);
  const [measuredWidth, ref] = useMeasuredWidth<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadImage(diff.expected.url), loadImage(diff.actual.url), loadImage(diff.diffUrl)]).then(
      ([expected, actual, diffImage]) => {
        if (!cancelled) setImages({ expected, actual, diff: diffImage });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [diff]);

  const imageWidth = images ? Math.max(images.expected.naturalWidth, images.actual.naturalWidth, 200) : 500;
  const imageHeight = images ? Math.max(images.expected.naturalHeight, images.actual.naturalHeight, 200) : 500;
  const scale = Math.min(1, (measuredWidth - 30) / imageWidth);
  const sxsScale = Math.min(1, (measuredWidth - 50) / imageWidth / 2);
  const fit = { canvasWidth: imageWidth * scale, canvasHeight: imageHeight * scale, scale };
  const sxsFit = { canvasWidth: imageWidth * sxsScale, canvasHeight: imageHeight * sxsScale, scale: sxsScale };

  return (
    <Box ref={ref} sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "auto" }}>
      {!images || measuredWidth === 0 ? (
        <CircularProgress sx={{ my: 8 }} />
      ) : (
        <>
          <Tabs
            value={mode}
            onChange={(_, m: Mode) => setMode(m)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 1, maxWidth: "100%" }}
          >
            {diff.diffUrl && <Tab value="diff" label="Diff" />}
            <Tab value="actual" label={diff.actual.title} />
            <Tab value="expected" label={diff.expected.title} />
            <Tab value="sxs" label="Side by side" />
            <Tab value="slider" label="Slider" />
          </Tabs>
          <Box sx={{ display: "flex", justifyContent: "center", flex: "auto", minHeight: fit.canvasHeight + 60 }}>
            {mode === "diff" && <ImageWithSize image={images.diff} alt="Diff" {...fit} />}
            {mode === "actual" && <ImageWithSize image={images.actual} alt={diff.actual.title} {...fit} />}
            {mode === "expected" && <ImageWithSize image={images.expected} alt={diff.expected.title} {...fit} />}
            {mode === "slider" && (
              <ImageDiffSlider
                expectedImage={images.expected}
                actualImage={images.actual}
                expectedTitle={diff.expected.title}
                actualTitle={diff.actual.title}
                {...fit}
              />
            )}
            {mode === "sxs" && (
              <Box sx={{ display: "flex" }}>
                <ImageWithSize image={images.expected} title={diff.expected.title} {...sxsFit} />
                <ImageWithSize
                  image={showSxsDiff && diff.diffUrl ? images.diff : images.actual}
                  title={showSxsDiff && diff.diffUrl ? "Diff" : diff.actual.title}
                  onClick={diff.diffUrl ? () => setShowSxsDiff(!showSxsDiff) : undefined}
                  {...sxsFit}
                />
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

function SizeLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ m: 0.5, fontVariantNumeric: "tabular-nums" }}>
      {children}
    </Typography>
  );
}

interface FitProps {
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
}

function ImageDiffSlider({
  expectedImage,
  actualImage,
  expectedTitle,
  actualTitle,
  canvasWidth,
  canvasHeight,
  scale,
}: FitProps & {
  expectedImage: HTMLImageElement;
  actualImage: HTMLImageElement;
  expectedTitle: string;
  actualTitle: string;
}) {
  // Kept as a fraction so it survives the dialog resizing.
  const [fraction, setFraction] = useState(0.5);
  const slider = fraction * canvasWidth;
  const sameSize =
    expectedImage.naturalWidth === actualImage.naturalWidth &&
    expectedImage.naturalHeight === actualImage.naturalHeight;

  // Replaces Playwright's ResizeView: drag the divider (or anywhere on the image).
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragTo = (clientX: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) setFraction(Math.min(Math.max(0, (clientX - rect.left) / canvasWidth), 1));
  };

  return (
    <Box sx={{ flex: "none", display: "flex", alignItems: "center", flexDirection: "column", userSelect: "none" }}>
      <SizeLabel>
        {!sameSize && `${actualTitle} ${actualImage.naturalWidth} x ${actualImage.naturalHeight} · `}
        {expectedTitle} {expectedImage.naturalWidth} x {expectedImage.naturalHeight}
      </SizeLabel>
      <Box
        ref={canvasRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragTo(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) dragTo(e.clientX);
        }}
        sx={{
          position: "relative",
          width: canvasWidth,
          height: canvasHeight,
          m: "15px",
          cursor: "ew-resize",
          touchAction: "none",
          ...checkerboard,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={expectedTitle}
          draggable={false}
          src={expectedImage.src}
          style={{
            display: "block",
            width: expectedImage.naturalWidth * scale,
            height: expectedImage.naturalHeight * scale,
          }}
        />
        <Box
          sx={{ position: "absolute", top: 0, left: 0, bottom: 0, overflow: "hidden", ...checkerboard, boxShadow: "none" }}
          style={{ width: slider }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={actualTitle}
            draggable={false}
            src={actualImage.src}
            style={{
              display: "block",
              maxWidth: "none",
              width: actualImage.naturalWidth * scale,
              height: actualImage.naturalHeight * scale,
            }}
          />
        </Box>
        {/* Divider: same colour and width as Playwright's resizer. */}
        <Box
          role="separator"
          aria-orientation="vertical"
          aria-valuenow={Math.round(fraction * 100)}
          sx={{ position: "absolute", top: 0, bottom: 0, width: 6, ml: "-3px", bgcolor: "#57606a80" }}
          style={{ left: slider }}
        />
        <SliderLabel side="left">{actualTitle}</SliderLabel>
        <SliderLabel side="right">{expectedTitle}</SliderLabel>
      </Box>
    </Box>
  );
}

function SliderLabel({ side, children }: { side: "left" | "right"; children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        position: "absolute",
        top: 8,
        [side]: 8,
        px: 1,
        borderRadius: 1,
        bgcolor: "rgb(0 0 0 / 60%)",
        color: "#fff",
        pointerEvents: "none",
      }}
    >
      {children}
    </Typography>
  );
}

function ImageWithSize({
  image,
  title,
  alt,
  canvasWidth,
  canvasHeight,
  scale,
  onClick,
}: FitProps & {
  image: HTMLImageElement;
  title?: string;
  alt?: string;
  onClick?: () => void;
}) {
  return (
    <Box sx={{ flex: "none", display: "flex", alignItems: "center", flexDirection: "column" }}>
      <SizeLabel>
        {title && `${title} `}
        {image.naturalWidth} x {image.naturalHeight}
      </SizeLabel>
      <Box sx={{ display: "flex", flex: "none", width: canvasWidth, height: canvasHeight, m: "15px", ...checkerboard }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={image.naturalWidth * scale}
          height={image.naturalHeight * scale}
          alt={title || alt}
          draggable={false}
          src={image.src}
          onClick={onClick}
          style={{ cursor: onClick ? "pointer" : "auto", maxWidth: "none" }}
        />
      </Box>
    </Box>
  );
}
