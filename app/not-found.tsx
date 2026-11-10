"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import Centered from "@/components/Centered";

export default function NotFound() {
  return (
    <Centered>
      <Stack sx={{ gap: 2, alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          No screenshots here
        </Typography>
        <Typography color="text.secondary">
          This version doesn&apos;t exist or has no screenshots yet.
        </Typography>
        <Button variant="contained" component={Link} href="/">
          All versions
        </Button>
      </Stack>
    </Centered>
  );
}
