"use client";

import LogoutIcon from "@mui/icons-material/Logout";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import { usePathname } from "next/navigation";
import { logout } from "@/app/login/actions";

/** Top-right log out button, shown on every page except the login page. */
export default function LogoutButton() {
  if (usePathname() === "/login") return null;
  return (
    <Paper
      component="form"
      action={logout}
      elevation={3}
      sx={{ position: "fixed", top: 16, right: 16, zIndex: 1100, p: 0.5 }}
    >
      <Tooltip title="Log out">
        <IconButton type="submit" aria-label="Log out">
          <LogoutIcon />
        </IconButton>
      </Tooltip>
    </Paper>
  );
}
