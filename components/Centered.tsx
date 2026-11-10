import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

/** Full-viewport centred content; shows a spinner when empty. */
export default function Centered({ children }: { children?: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        textAlign: "center",
        p: 3,
      }}
    >
      {children ?? <CircularProgress aria-label="Loading" />}
    </Box>
  );
}
