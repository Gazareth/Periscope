"use client";

import "@xyflow/react/dist/style.css";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import { useColorScheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { hierarchy, tree as treeLayout } from "d3-hierarchy";
import { useCallback, useMemo } from "react";
import { isHome, type SiteNode } from "@/lib/siteMap";
import PageDiffChip from "./PageDiffChip";
import { toComparedPage, type ComparedPage, type PageWithDiff } from "./pages";
import ZoomControls from "./ZoomControls";

const NODE_WIDTH = 240;
const THUMB_HEIGHT = 150;
const NODE_HEIGHT = 216;
const GAP_X = 48;
const GAP_Y = 96;
const ANIMATION = { duration: 250 };

type PageNodeData = {
  label: string;
  page?: PageWithDiff;
};
type PageNode = Node<PageNodeData, "page">;

/** One page in the site map: a top-aligned thumbnail, its name and its diff. */
function PageNodeView({ data: { label, page } }: NodeProps<PageNode>) {
  const comparable = !!page && !!toComparedPage(page);
  return (
    <Card
      variant="outlined"
      sx={{
        width: NODE_WIDTH,
        cursor: comparable ? "pointer" : "inherit",
        transition: "border-color 150ms",
        "&:hover": comparable ? { borderColor: "primary.main" } : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0 }} />
      <Box sx={{ height: THUMB_HEIGHT, bgcolor: "background.default", overflow: "hidden" }}>
        {page && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.url}
            alt={page.name}
            draggable={false}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        )}
      </Box>
      <Box sx={{ px: 1.5, py: 1, display: "flex", alignItems: "center", gap: 1, borderTop: 1, borderColor: "divider" }}>
        <Typography variant="body2" noWrap title={page?.name ?? label} sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
          {label}
        </Typography>
        {page?.diff && (
          <PageDiffChip diff={page.diff} />
        )}
      </Box>
      <Handle type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0 }} />
    </Card>
  );
}

const nodeTypes = { page: PageNodeView };

interface LayoutNode {
  id: string;
  label: string;
  page?: PageWithDiff;
  children: LayoutNode[];
}

function toLayoutNode(node: SiteNode<PageWithDiff>): LayoutNode {
  return { id: node.page.key, label: node.label, page: node.page, children: node.children.map(toLayoutNode) };
}

/** Lays the tree out top-down. The home page is the root, if there is one. */
function layout(tree: SiteNode<PageWithDiff>[]) {
  const [first, ...rest] = tree.map(toLayoutNode);
  const root: LayoutNode =
    first && isHome(tree[0])
      ? { ...first, children: [...first.children, ...rest] }
      : { id: "__site", label: "Site", children: tree.map(toLayoutNode) };

  const positioned = treeLayout<LayoutNode>().nodeSize([NODE_WIDTH + GAP_X, NODE_HEIGHT + GAP_Y])(
    hierarchy(root),
  );
  const nodes: PageNode[] = positioned.descendants().map((n) => ({
    id: n.data.id,
    type: "page",
    position: { x: n.x - NODE_WIDTH / 2, y: n.y },
    data: { label: n.data.label, page: n.data.page },
  }));
  const edges: Edge[] = positioned.links().map((l) => ({
    id: `${l.source.data.id}->${l.target.data.id}`,
    source: l.source.data.id,
    target: l.target.data.id,
    type: "smoothstep",
  }));
  return { nodes, edges };
}

function SiteMapControls() {
  const { zoomIn, zoomOut, zoomTo, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const onZoomIn = useCallback(() => zoomIn(ANIMATION), [zoomIn]);
  const onZoomOut = useCallback(() => zoomOut(ANIMATION), [zoomOut]);
  const onReset = useCallback(() => zoomTo(1, ANIMATION), [zoomTo]);
  const onFit = useCallback(() => fitView(ANIMATION), [fitView]);
  return (
    <ZoomControls scale={zoom} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onReset={onReset} onFit={onFit} />
  );
}

interface Props {
  tree: SiteNode<PageWithDiff>[];
  onCompare: (page: ComparedPage) => void;
}

/** The pages as a tree diagram, powered by React Flow. */
export default function SiteMap({ tree, onCompare }: Props) {
  const { nodes, edges } = useMemo(() => layout(tree), [tree]);
  const { mode, systemMode } = useColorScheme();
  const colorMode = (mode === "system" ? systemMode : mode) ?? "light";

  return (
    <Box sx={{ position: "absolute", inset: 0 }}>
      <ReactFlowProvider>
        <ReactFlow
          defaultNodes={nodes}
          defaultEdges={edges}
          nodeTypes={nodeTypes}
          // Clicking a page opens its comparison with the previous version.
          onNodeClick={(_, node: PageNode) => {
            const compared = node.data.page && toComparedPage(node.data.page);
            if (compared) onCompare(compared);
          }}
          colorMode={colorMode}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          maxZoom={4}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          attributionPosition="bottom-left"
          style={{ backgroundColor: "transparent" }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} />
          <SiteMapControls />
        </ReactFlow>
      </ReactFlowProvider>
    </Box>
  );
}
