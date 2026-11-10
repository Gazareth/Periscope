"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect } from "react";
import Centered from "@/components/Centered";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Centered>
      <Stack sx={{ gap: 2, alignItems: "center", maxWidth: 560 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Couldn&apos;t load screenshots
        </Typography>
        <Typography color="text.secondary">
          {error instanceof globalThis.Error ? error.message : "Something went wrong."}
        </Typography>
        <Button variant="contained" onClick={retry}>
          Try again
        </Button>
      </Stack>
    </Centered>
  );
}
