import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { CARD_SIZE } from "@/components/carouselSize";
import VersionCarousel from "@/components/VersionCarousel";
import { getConfig } from "@/lib/config";
import { listVersionSummaries } from "@/lib/diff";

export default function Home() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 4,
        py: 6,
      }}
    >
      <Suspense fallback={<HomeFallback />}>
        <Versions />
      </Suspense>
    </Box>
  );
}

async function Versions() {
  const versions = await listVersionSummaries();
  const { org, repo } = getConfig();
  return (
    <>
      <Header subtitle={`${org} / ${repo}`} />
      <VersionCarousel versions={versions} />
    </>
  );
}

function Header({ subtitle }: { subtitle?: string }) {
  return (
    <Stack sx={{ px: 3, gap: 0.5, alignItems: "center", textAlign: "center" }}>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700 }}>
        🔭 Periscope
      </Typography>
      <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
        {subtitle ?? <Skeleton width={240} />}
      </Typography>
    </Stack>
  );
}

function HomeFallback() {
  return (
    <>
      <Header />
      <Stack
        direction="row"
        sx={{ gap: 3, py: 3, justifyContent: "center", overflow: "hidden" }}
      >
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            sx={{
              flexShrink: 0,
              width: CARD_SIZE.width,
              height: CARD_SIZE.height,
              transform: i === 1 ? "none" : "scale(0.84)",
              opacity: i === 1 ? 1 : 0.4,
            }}
          />
        ))}
      </Stack>
    </>
  );
}
