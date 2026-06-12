"use client";

import { type CSSProperties, useCallback, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  getBezierPath,
  getSmoothStepPath,
  Handle,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type OnConnect,
  ConnectionLineType
} from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import { devices, links, type DeviceNode, type DeviceRole, type NetworkLink } from "@/lib/network-seed";
import { FirewallGlyph, MultilayerGlyph, RouterGlyph, ServerGlyph, SwitchGlyph } from "@/components/DeviceGlyphs";

type DeviceKind = "switch" | "router" | "core" | "firewall" | "server";
type LayoutDirection = "RIGHT" | "DOWN";
type PortSide = "north" | "east" | "south" | "west";
type LinkStyle = "orthogonal" | "spline" | "security" | "server";

type PortAnchor = {
  id: string;
  port: string;
  side: PortSide;
  offset: number;
  protocol?: string;
  purpose?: string;
};

type NetworkNodeData = {
  device: DeviceNode;
  kind: DeviceKind;
  status: "healthy" | "warning" | "critical";
  portAnchors: PortAnchor[];
};

type NetworkEdgeData = {
  link: NetworkLink;
  showPorts: boolean;
  active: boolean;
  linkStyle: LinkStyle;
};

type NetworkFlowNode = Node<NetworkNodeData, "networkDevice">;
type NetworkFlowEdge = Edge<NetworkEdgeData, "networkLink">;

type Selection =
  | { type: "device"; node: NetworkFlowNode }
  | { type: "link"; edge: NetworkFlowEdge }
  | null;

const elk = new ELK();
const NODE_WIDTH = 246;
const NODE_HEIGHT = 152;
const deviceById = new Map(devices.map((device) => [device.id, device]));

function deviceKind(role: DeviceRole): DeviceKind {
  if (role === "Firewall") return "firewall";
  if (role === "Server") return "server";
  if (role === "Access") return "switch";
  if (role === "Provider Core") return "core";
  return "router";
}

function initialNodePosition(device: DeviceNode) {
  return {
    x: Math.round(device.x * 13.5),
    y: Math.round(device.y * 8.4)
  };
}

function statusForDevice(device: DeviceNode): NetworkNodeData["status"] {
  if (device.role === "Firewall") return "warning";
  if (device.role === "Server") return "healthy";
  return "healthy";
}

function slugPort(port: string): string {
  return port.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "port";
}

function endpointSide(link: NetworkLink, deviceId: string): PortSide {
  const device = deviceById.get(deviceId);
  const other = deviceById.get(link.a === deviceId ? link.b : link.a);
  if (!device || !other) return "east";

  const dx = other.x - device.x;
  const dy = other.y - device.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
  return dy >= 0 ? "south" : "north";
}

function portHandleId(port: string, side: PortSide): string {
  return `${slugPort(port)}-${side}`;
}

function positionForSide(side: PortSide): Position {
  if (side === "west") return Position.Left;
  if (side === "east") return Position.Right;
  if (side === "north") return Position.Top;
  return Position.Bottom;
}

function styleForAnchor(anchor: PortAnchor): CSSProperties {
  if (anchor.side === "west" || anchor.side === "east") {
    return { top: `${anchor.offset}%` };
  }
  return { left: `${anchor.offset}%` };
}

function buildPortAnchors(device: DeviceNode): PortAnchor[] {
  const anchorsByPortSide = new Map<string, Omit<PortAnchor, "offset">>();

  for (const link of links) {
    if (link.a === device.id) {
      const side = endpointSide(link, device.id);
      const key = `${link.aPort}:${side}`;
      anchorsByPortSide.set(key, {
        id: portHandleId(link.aPort, side),
        port: link.aPort,
        side,
        protocol: link.protocol,
        purpose: link.purpose
      });
    }
    if (link.b === device.id) {
      const side = endpointSide(link, device.id);
      const key = `${link.bPort}:${side}`;
      anchorsByPortSide.set(key, {
        id: portHandleId(link.bPort, side),
        port: link.bPort,
        side,
        protocol: link.protocol,
        purpose: link.purpose
      });
    }
  }

  for (const [index, port] of device.ports.entries()) {
    if (![...anchorsByPortSide.values()].some((anchor) => anchor.port === port)) {
      const side: PortSide = device.role === "Server" ? "west" : index % 2 === 0 ? "east" : "south";
      anchorsByPortSide.set(`${port}:${side}`, {
        id: portHandleId(port, side),
        port,
        side,
        protocol: "available",
        purpose: "Available mapped port"
      });
    }
  }

  const anchors = [...anchorsByPortSide.values()].map((anchor) => ({ ...anchor, offset: 50 }));
  for (const side of ["north", "east", "south", "west"] as const) {
    const sideAnchors = anchors.filter((anchor) => anchor.side === side);
    sideAnchors.forEach((anchor, index) => {
      anchor.offset = Math.round(((index + 1) / (sideAnchors.length + 1)) * 100);
    });
  }
  return anchors;
}

function linkStyleFor(link: NetworkLink): LinkStyle {
  const protocol = (link.protocol || "").toLowerCase();
  if (protocol.includes("firewall") || protocol.includes("nat") || protocol.includes("security")) return "security";
  if (protocol.includes("server")) return "server";
  if (protocol.includes("mpls") || protocol.includes("bgp") || protocol.includes("wan")) return "spline";
  return "orthogonal";
}

function buildNodes(): NetworkFlowNode[] {
  return devices.map((device) => ({
    id: device.id,
    type: "networkDevice",
    position: initialNodePosition(device),
    data: {
      device,
      kind: deviceKind(device.role),
      status: statusForDevice(device),
      portAnchors: buildPortAnchors(device)
    }
  }));
}

function buildEdges(showPorts: boolean, activePath: boolean): NetworkFlowEdge[] {
  return links.map((link) => {
    const aSide = endpointSide(link, link.a);
    const bSide = endpointSide(link, link.b);
    const linkStyle = linkStyleFor(link);

    return {
      id: link.id,
      source: link.a,
      target: link.b,
      sourceHandle: portHandleId(link.aPort, aSide),
      targetHandle: portHandleId(link.bPort, bSide),
      type: "networkLink",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: activePath ? "#38bdf8" : "rgba(148, 163, 184, 0.78)"
      },
      animated: activePath,
      data: {
        link,
        showPorts,
        active: activePath,
        linkStyle
      }
    };
  });
}

function RackDeviceIcon({ kind }: { kind: DeviceKind; device: DeviceNode }) {
  if (kind === "switch") return <SwitchGlyph />;
  if (kind === "firewall") return <FirewallGlyph />;
  if (kind === "server") return <ServerGlyph />;
  if (kind === "core") return <MultilayerGlyph />;
  return <RouterGlyph />;
}

function NetworkDeviceNode({ data, selected }: NodeProps<NetworkFlowNode>) {
  const { device, kind, status, portAnchors } = data;
  const statusClass = status === "healthy" ? "good" : status === "warning" ? "warn" : "danger";

  return (
    <div className={`rf-device-node rf-port-aware-node rf-device-${kind} ${selected ? "rf-device-selected" : ""}`}>
      {portAnchors.map((anchor) => (
        <div key={`${anchor.id}-wrap`} className={`rf-port-anchor-wrap rf-port-${anchor.side}`} style={styleForAnchor(anchor)} title={`${anchor.port} · ${anchor.protocol || "mapped port"}`}>
          <Handle type="source" position={positionForSide(anchor.side)} id={anchor.id} className={`rf-handle rf-port-handle rf-source-handle rf-port-${anchor.side}`} />
          <Handle type="target" position={positionForSide(anchor.side)} id={anchor.id} className={`rf-handle rf-port-handle rf-target-handle rf-port-${anchor.side}`} />
          <span className="rf-port-dot" />
        </div>
      ))}

      <div className="rf-device-icon-wrap">
        <RackDeviceIcon kind={kind} device={device} />
      </div>
      <div className="rf-device-caption">
        <span className={`rf-status-dot ${statusClass}`} />
        <span className="rf-device-role">{device.role}</span>
        <strong>{device.name}</strong>
        <span>{device.vendor} {device.model}</span>
        <small>{device.ports.join(" · ")}</small>
      </div>
    </div>
  );
}

function NetworkLinkEdge(props: EdgeProps<NetworkFlowEdge>) {
  const link = props.data?.link;
  const active = Boolean(props.data?.active);
  const showPorts = Boolean(props.data?.showPorts);
  const linkStyle = props.data?.linkStyle || "orthogonal";
  const edgeArgs = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition
  };
  const [edgePath, labelX, labelY] = linkStyle === "spline"
    ? getBezierPath({ ...edgeArgs, curvature: 0.28 })
    : getSmoothStepPath({ ...edgeArgs, borderRadius: linkStyle === "security" ? 18 : 10, offset: 12 });

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        className={`rf-network-edge rf-edge-${linkStyle} ${active ? "rf-network-edge-active" : ""} ${props.selected ? "rf-network-edge-selected" : ""}`}
      />
      {showPorts && link ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className={`rf-edge-label rf-edge-label-${linkStyle}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
          >
            <strong>{link.aPort}</strong>
            <span>→</span>
            <strong>{link.bPort}</strong>
            <small>{link.protocol}</small>
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

const nodeTypes = { networkDevice: NetworkDeviceNode };
const edgeTypes = { networkLink: NetworkLinkEdge };

function SelectionInspector({ selection }: { selection: Selection }) {
  if (selection?.type === "device") {
    const device = selection.node.data.device;
    const anchors = selection.node.data.portAnchors;
    return (
      <aside className="rf-inspector" aria-label="Selected device details">
        <span className="badge good">Selected device</span>
        <strong>{device.name}</strong>
        <p>{device.vendor} {device.model} · {device.role}</p>
        <dl>
          <div><dt>Site</dt><dd>{device.site}</dd></div>
          <div><dt>Mapped ports</dt><dd>{anchors.map((anchor) => `${anchor.port} (${anchor.side})`).join(" / ")}</dd></div>
          <div><dt>Source of truth</dt><dd>Port-aware Neo4j node-ready</dd></div>
        </dl>
      </aside>
    );
  }

  if (selection?.type === "link") {
    const link = selection.edge.data?.link;
    if (!link) return null;
    return (
      <aside className="rf-inspector" aria-label="Selected link details">
        <span className="badge warn">Selected port-mapped link</span>
        <strong>{link.aPort} → {link.bPort}</strong>
        <p>{link.purpose}</p>
        <dl>
          <div><dt>Local</dt><dd>{link.a}</dd></div>
          <div><dt>Remote</dt><dd>{link.b}</dd></div>
          <div><dt>VLAN / VRF</dt><dd>VLAN {link.vlan || "—"} / VRF {link.vrf || "—"}</dd></div>
          <div><dt>Protocol</dt><dd>{link.protocol || "—"}</dd></div>
        </dl>
      </aside>
    );
  }

  return null;
}

async function getLayoutedNodes(nodes: NetworkFlowNode[], edges: NetworkFlowEdge[], direction: LayoutDirection): Promise<NetworkFlowNode[]> {
  const graph = {
    id: "ngineer-topology",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.spacing.nodeNodeBetweenLayers": "90",
      "elk.spacing.nodeNode": "60",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.portConstraints": "FIXED_SIDE"
    },
    children: nodes.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      layoutOptions: { "elk.portConstraints": "FIXED_SIDE" }
    })),
    edges: edges.map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] }))
  };

  const layout = await elk.layout(graph);
  const children = new Map((layout.children || []).map((child: { id: string; x?: number; y?: number }) => [child.id, child]));

  return nodes.map((node) => {
    const child = children.get(node.id);
    return {
      ...node,
      position: {
        x: typeof child?.x === "number" ? child.x : node.position.x,
        y: typeof child?.y === "number" ? child.y : node.position.y
      }
    };
  });
}

function NetworkFlowCanvasInner() {
  const [showPorts, setShowPorts] = useState(true);
  const [activePath, setActivePath] = useState(true);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>("RIGHT");
  const [selection, setSelection] = useState<Selection>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<NetworkFlowNode>(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState<NetworkFlowEdge>(buildEdges(true, true));
  const { fitView } = useReactFlow<NetworkFlowNode, NetworkFlowEdge>();

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);
  const memoizedEdgeTypes = useMemo(() => edgeTypes, []);

  const refreshEdges = useCallback((nextShowPorts: boolean, nextActivePath: boolean) => {
    setEdges((current) => current.map((edge) => {
      if (!edge.data?.link) return edge;

      return {
        ...edge,
        animated: nextActivePath,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: nextActivePath ? "#38bdf8" : "rgba(148, 163, 184, 0.78)"
        },
        data: {
          link: edge.data.link,
          showPorts: nextShowPorts,
          active: nextActivePath,
          linkStyle: edge.data.linkStyle || linkStyleFor(edge.data.link)
        }
      };
    }));
  }, [setEdges]);

  const togglePorts = useCallback(() => {
    setShowPorts((current) => {
      const next = !current;
      refreshEdges(next, activePath);
      return next;
    });
  }, [activePath, refreshEdges]);

  const toggleActivePath = useCallback(() => {
    setActivePath((current) => {
      const next = !current;
      refreshEdges(showPorts, next);
      return next;
    });
  }, [refreshEdges, showPorts]);

  const onConnect: OnConnect = useCallback((connection) => {
    if (!connection.source || !connection.target) return;
    const newLink: NetworkLink = {
      id: `manual-${Date.now()}`,
      a: connection.source,
      aPort: connection.sourceHandle || "port-a",
      b: connection.target,
      bPort: connection.targetHandle || "port-b",
      purpose: "Manual draft link",
      protocol: "Draft port map",
      vrf: "Draft"
    };

    const edge: NetworkFlowEdge = {
      id: newLink.id,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: "networkLink",
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { link: newLink, showPorts, active: false, linkStyle: "orthogonal" }
    };

    setEdges((current) => [...current, edge]);
  }, [setEdges, showPorts]);

  const addDraftDevice = useCallback(() => {
    const id = `draft-router-${nodes.length + 1}`;
    const device: DeviceNode = {
      id,
      name: `DRAFT-${nodes.length + 1}`,
      vendor: "Cisco",
      model: "Router",
      role: "Customer Edge",
      site: "Draft",
      x: 50,
      y: 50,
      ports: ["Gi0/0/0", "Gi0/0/1", "Gi0/0/2"]
    };

    setNodes((current) => [
      ...current,
      {
        id,
        type: "networkDevice",
        position: { x: 360 + current.length * 24, y: 300 + current.length * 14 },
        data: { device, kind: "router", status: "warning", portAnchors: buildPortAnchors(device) }
      }
    ]);
  }, [nodes.length, setNodes]);

  const resetDemo = useCallback(() => {
    const nextNodes = buildNodes();
    const nextEdges = buildEdges(showPorts, activePath);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelection(null);
    window.requestAnimationFrame(() => fitView({ padding: 0.06, duration: 350 }));
  }, [activePath, fitView, setEdges, setNodes, showPorts]);

  const runAutoLayout = useCallback(async (direction: LayoutDirection = layoutDirection) => {
    const nextNodes = await getLayoutedNodes(nodes, edges, direction);
    setNodes(nextNodes);
    window.requestAnimationFrame(() => fitView({ padding: 0.06, duration: 450 }));
  }, [edges, fitView, layoutDirection, nodes, setNodes]);

  const switchDirection = useCallback(async () => {
    const next = layoutDirection === "RIGHT" ? "DOWN" : "RIGHT";
    setLayoutDirection(next);
    await runAutoLayout(next);
  }, [layoutDirection, runAutoLayout]);

  return (
    <div className="rf-topology-shell rf-topology-shell-v2">
      <svg width="0" height="0" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="trafficFlowGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="52%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>
        </defs>
      </svg>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={memoizedNodeTypes}
        edgeTypes={memoizedEdgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelection({ type: "device", node })}
        onEdgeClick={(_, edge) => setSelection({ type: "link", edge })}
        onPaneClick={() => setSelection(null)}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{ type: "networkLink", markerEnd: { type: MarkerType.ArrowClosed } }}
        fitView
        fitViewOptions={{ padding: 0.06 }}
        minZoom={0.2}
        maxZoom={2.2}
        panOnScroll
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const kind = (node as NetworkFlowNode).data?.kind;
            if (kind === "firewall") return "#f59e0b";
            if (kind === "server") return "#22c55e";
            if (kind === "core") return "#a78bfa";
            return "#38bdf8";
          }}
        />
        <Panel position="top-left" className="rf-control-panel">
          <button type="button" onClick={() => runAutoLayout()}>Auto layout</button>
          <button type="button" onClick={switchDirection}>{layoutDirection === "RIGHT" ? "Vertical layout" : "Horizontal layout"}</button>
          <button type="button" onClick={togglePorts}>{showPorts ? "Hide port labels" : "Show port labels"}</button>
          <button type="button" onClick={toggleActivePath}>{activePath ? "Unhighlight path" : "Highlight path"}</button>
          <button type="button" onClick={addDraftDevice}>Add draft device</button>
          <button type="button" onClick={resetDemo}>Reset demo</button>
        </Panel>
        <Panel position="top-right" className="rf-mode-panel">
          <span className="badge good">Port-aware</span>
          <span>{nodes.length} devices</span>
          <span>{edges.length} links</span>
        </Panel>
        <SelectionInspector selection={selection} />
      </ReactFlow>
    </div>
  );
}

export function NetworkFlowCanvas() {
  return (
    <ReactFlowProvider>
      <NetworkFlowCanvasInner />
    </ReactFlowProvider>
  );
}
