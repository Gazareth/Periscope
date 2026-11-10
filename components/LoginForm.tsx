"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login } from "@/app/login/actions";

export default function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, formAction, pending] = useActionState(login, {});

  return (
    <Card variant="outlined" sx={{ width: "100%", maxWidth: 360, p: 4 }}>
      <Stack component="form" action={formAction} sx={{ gap: 3, textAlign: "center" }}>
        <Stack sx={{ gap: 0.5 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            🔭 Periscope
          </Typography>
          <Typography color="text.secondary">Enter the password to continue</Typography>
        </Stack>
        <input type="hidden" name="next" value={next} />
        {/* Lets password managers save the password under a name. */}
        <input type="hidden" name="username" autoComplete="username" value="periscope" />
        <TextField
          name="password"
          type="password"
          label="Password"
          autoComplete="current-password"
          autoFocus
          required
          fullWidth
          error={!!state.error}
          helperText={state.error ?? " "}
        />
        <Button type="submit" variant="contained" size="large" loading={pending}>
          Log in
        </Button>
      </Stack>
    </Card>
  );
}
