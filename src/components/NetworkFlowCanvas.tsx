"use client";

import { useCallback, useMemo, useState } from "react";
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

type DeviceKind = "switch" | "router" | "core" | "firewall" | "server";
type LayoutDirection = "RIGHT" | "DOWN";

type NetworkNodeData = {
  device: DeviceNode;
  kind: DeviceKind;
  status: "healthy" | "warning" | "critical";
};

type NetworkEdgeData = {
  link: NetworkLink;
  showPorts: boolean;
  active: boolean;
};

type NetworkFlowNode = Node<NetworkNodeData, "networkDevice">;
type NetworkFlowEdge = Edge<NetworkEdgeData, "networkLink">;

type Selection =
  | { type: "device"; node: NetworkFlowNode }
  | { type: "link"; edge: NetworkFlowEdge }
  | null;

const elk = new ELK();
const NODE_WIDTH = 220;
const NODE_HEIGHT = 136;

function deviceKind(role: DeviceRole): DeviceKind {
  if (role === "Firewall") return "firewall";
  if (role === "Server") return "server";
  if (role === "Access") return "switch";
  if (role === "Provider Core") return "core";
  return "router";
}

function initialNodePosition(device: DeviceNode) {
  return {
    x: Math.round(device.x * 12.5),
    y: Math.round(device.y * 7.6)
  };
}

function statusForDevice(device: DeviceNode): NetworkNodeData["status"] {
  if (device.role === "Firewall") return "warning";
  if (device.role === "Server") return "healthy";
  return "healthy";
}

function buildNodes(): NetworkFlowNode[] {
  return devices.map((device) => ({
    id: device.id,
    type: "networkDevice",
    position: initialNodePosition(device),
    data: {
      device,
      kind: deviceKind(device.role),
      status: statusForDevice(device)
    }
  }));
}

function buildEdges(showPorts: boolean, activePath: boolean): NetworkFlowEdge[] {
  return links.map((link) => ({
    id: link.id,
    source: link.a,
    target: link.b,
    sourceHandle: "east",
    targetHandle: "west",
    type: "networkLink",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: activePath ? "#38bdf8" : "rgba(148, 163, 184, 0.78)"
    },
    animated: activePath,
    data: {
      link,
      showPorts,
      active: activePath
    }
  }));
}

function RackDeviceIcon({ kind }: { kind: DeviceKind }) {
  if (kind === "switch") {
    return (
      <svg viewBox="0 0 240 130" className="rf-device-svg" aria-hidden="true">
        <defs>
          <linearGradient id="rfSwitchBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#32415c" />
            <stop offset="50%" stopColor="#0d1727" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
        </defs>
        <path className="rf-device-shadow" d="M26 37h170l26 20-13 46H43L20 82z" />
        <path className="rf-device-chassis" d="M22 28h170l30 22-13 46H40L16 75z" fill="url(#rfSwitchBody)" />
        <path className="rf-faceplate" d="M43 51h122v29H43z" />
        {Array.from({ length: 16 }).map((_, index) => (
          <rect className="rf-rj45" key={index} x={52 + index * 6.6} y="59" width="4.6" height="10" rx="1" />
        ))}
        <rect className="rf-sfp" x="173" y="58" width="18" height="12" rx="2" />
        <rect className="rf-sfp" x="194" y="58" width="18" height="12" rx="2" />
        <circle className="rf-led rf-led-green" cx="46" cy="88" r="3" />
        <circle className="rf-led rf-led-blue" cx="58" cy="88" r="2.4" />
        <path className="rf-top-highlight" d="M23 28h169l30 22" />
      </svg>
    );
  }

  if (kind === "firewall") {
    return (
      <svg viewBox="0 0 240 130" className="rf-device-svg rf-firewall-svg" aria-hidden="true">
        <defs>
          <linearGradient id="rfFwBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a3214" />
            <stop offset="50%" stopColor="#111827" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
        </defs>
        <path className="rf-device-shadow" d="M36 34h154l23 20v48H51L28 80z" />
        <path className="rf-device-chassis" d="M31 25h154l29 23v48H47L22 73z" fill="url(#rfFwBody)" />
        <path className="rf-brick" d="M51 47h130M51 63h130M51 79h130M77 47v16M112 63v16M149 47v16M173 63v16" />
        <path className="rf-shield" d="M121 44l24 11v20c0 15-10 25-24 33-15-8-24-18-24-33V55z" />
        <path className="rf-shield-check" d="M109 74l9 8 17-24" />
        <circle className="rf-led rf-led-amber" cx="49" cy="89" r="3" />
        <circle className="rf-led" cx="61" cy="89" r="2.4" />
      </svg>
    );
  }

  if (kind === "server") {
    return (
      <svg viewBox="0 0 240 130" className="rf-device-svg rf-server-svg" aria-hidden="true">
        <defs>
          <linearGradient id="rfServerBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#164933" />
            <stop offset="48%" stopColor="#0c1b2f" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
        </defs>
        <path className="rf-device-shadow" d="M36 28h154l25 22v56H52L28 83z" />
        <path className="rf-device-chassis" d="M31 20h154l29 24v56H48L22 76z" fill="url(#rfServerBody)" />
        {Array.from({ length: 10 }).map((_, index) => (
          <rect className="rf-drive" key={index} x={51 + index * 13.2} y="52" width="9" height="25" rx="2" />
        ))}
        <path className="rf-vent" d="M51 37h77M141 37h38" />
        <circle className="rf-led rf-led-green" cx="49" cy="88" r="3" />
        <circle className="rf-led" cx="61" cy="88" r="2.4" />
      </svg>
    );
  }

  if (kind === "core") {
    return (
      <svg viewBox="0 0 240 130" className="rf-device-svg rf-core-svg" aria-hidden="true">
        <defs>
          <linearGradient id="rfCoreBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#403a74" />
            <stop offset="50%" stopColor="#0b1d34" />
            <stop offset="100%" stopColor="#030712" />
          </linearGradient>
        </defs>
        <path className="rf-device-shadow" d="M31 35h170l19 18v51H45L25 80z" />
        <path className="rf-device-chassis" d="M26 26h170l23 20v51H40L18 73z" fill="url(#rfCoreBody)" />
        <ellipse className="rf-core-ring" cx="121" cy="63" rx="45" ry="22" />
        <path className="rf-core-arrow" d="M91 63h60M108 48L91 63l17 15M134 48l17 15-17 15" />
        {Array.from({ length: 8 }).map((_, index) => (
          <rect className="rf-rj45" key={index} x={62 + index * 11.2} y="89" width="7" height="7" rx="1" />
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 240 130" className="rf-device-svg rf-router-svg" aria-hidden="true">
      <defs>
        <linearGradient id="rfRouterBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#173b5a" />
          <stop offset="50%" stopColor="#0c1d32" />
          <stop offset="100%" stopColor="#030712" />
        </linearGradient>
      </defs>
      <path className="rf-device-shadow" d="M44 29h145l27 23-17 48H52L26 76z" />
      <path className="rf-device-chassis" d="M38 20h145l31 24-18 48H48L18 69z" fill="url(#rfRouterBody)" />
      <ellipse className="rf-route-plane" cx="119" cy="58" rx="51" ry="24" />
      <path className="rf-route-arrows" d="M84 58h70M104 42L84 58l20 16M134 42l20 16-20 16" />
      <path className="rf-router-uplink" d="M119 31V13M119 102V84M99 13l20-12 20 12M99 112l20 13 20-13" />
      <circle className="rf-led rf-led-green" cx="48" cy="82" r="3" />
      <circle className="rf-led" cx="61" cy="82" r="2.4" />
    </svg>
  );
}

function NetworkDeviceNode({ data, selected }: NodeProps<NetworkFlowNode>) {
  const { device, kind, status } = data;
  const statusClass = status === "healthy" ? "good" : status === "warning" ? "warn" : "danger";

  return (
    <div className={`rf-device-node rf-device-${kind} ${selected ? "rf-device-selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="west" className="rf-handle rf-handle-west" />
      <Handle type="source" position={Position.Right} id="east" className="rf-handle rf-handle-east" />
      <Handle type="target" position={Position.Top} id="north" className="rf-handle rf-handle-north" />
      <Handle type="source" position={Position.Bottom} id="south" className="rf-handle rf-handle-south" />

      <div className="rf-device-icon-wrap">
        <RackDeviceIcon kind={kind} />
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
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    curvature: 0.42
  });

  const link = props.data?.link;
  const active = Boolean(props.data?.active);
  const showPorts = Boolean(props.data?.showPorts);

  return (
    <>
      <BaseEdge
        id={props.id}
        path={edgePath}
        markerEnd={props.markerEnd}
        className={`rf-network-edge ${active ? "rf-network-edge-active" : ""} ${props.selected ? "rf-network-edge-selected" : ""}`}
      />
      {showPorts && link ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="rf-edge-label"
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
    return (
      <aside className="rf-inspector" aria-label="Selected device details">
        <span className="badge good">Selected device</span>
        <strong>{device.name}</strong>
        <p>{device.vendor} {device.model} · {device.role}</p>
        <dl>
          <div><dt>Site</dt><dd>{device.site}</dd></div>
          <div><dt>Ports</dt><dd>{device.ports.join(" / ")}</dd></div>
          <div><dt>Source of truth</dt><dd>Neo4j node-ready</dd></div>
        </dl>
      </aside>
    );
  }

  if (selection?.type === "link") {
    const link = selection.edge.data?.link;
    if (!link) return null;
    return (
      <aside className="rf-inspector" aria-label="Selected link details">
        <span className="badge warn">Selected link</span>
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

  return (
    <aside className="rf-inspector" aria-label="Topology interaction hints">
      <span className="badge good">Interactive topology engine</span>
      <strong>React Flow + ELK foundation</strong>
      <p>Drag devices, create links, inspect ports, auto-layout the topology, and keep the source-of-truth model ready for Neo4j data.</p>
    </aside>
  );
}

async function getLayoutedNodes(nodes: NetworkFlowNode[], edges: NetworkFlowEdge[], direction: LayoutDirection): Promise<NetworkFlowNode[]> {
  const graph = {
    id: "ngineer-topology",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": direction,
      "elk.edgeRouting": "SPLINES",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "85",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX"
    },
    children: nodes.map((node) => ({ id: node.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
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
          width: 18,
          height: 18,
          color: nextActivePath ? "#38bdf8" : "rgba(148, 163, 184, 0.78)"
        },
        data: {
          link: edge.data.link,
          showPorts: nextShowPorts,
          active: nextActivePath
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
    const newLink: NetworkLink = {
      id: `manual-${Date.now()}`,
      a: connection.source || "unknown-local",
      aPort: connection.sourceHandle || "port-a",
      b: connection.target || "unknown-remote",
      bPort: connection.targetHandle || "port-b",
      purpose: "Manual draft link",
      protocol: "Unassigned",
      vrf: "Draft"
    };

    if (!connection.source || !connection.target) return;

    const edge: NetworkFlowEdge = {
      id: newLink.id,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: "networkLink",
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { link: newLink, showPorts, active: false }
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
      ports: ["Gi0/0/0", "Gi0/0/1"]
    };

    setNodes((current) => [
      ...current,
      {
        id,
        type: "networkDevice",
        position: { x: 360 + current.length * 18, y: 300 + current.length * 10 },
        data: { device, kind: "router", status: "warning" }
      }
    ]);
  }, [nodes.length, setNodes]);

  const resetDemo = useCallback(() => {
    const nextNodes = buildNodes();
    const nextEdges = buildEdges(showPorts, activePath);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelection(null);
    window.requestAnimationFrame(() => fitView({ padding: 0.18, duration: 350 }));
  }, [activePath, fitView, setEdges, setNodes, showPorts]);

  const runAutoLayout = useCallback(async (direction: LayoutDirection = layoutDirection) => {
    const nextNodes = await getLayoutedNodes(nodes, edges, direction);
    setNodes(nextNodes);
    window.requestAnimationFrame(() => fitView({ padding: 0.18, duration: 450 }));
  }, [edges, fitView, layoutDirection, nodes, setNodes]);

  const switchDirection = useCallback(async () => {
    const next = layoutDirection === "RIGHT" ? "DOWN" : "RIGHT";
    setLayoutDirection(next);
    await runAutoLayout(next);
  }, [layoutDirection, runAutoLayout]);

  return (
    <div className="rf-topology-shell">
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
        connectionLineType={ConnectionLineType.Bezier}
        defaultEdgeOptions={{ type: "networkLink", markerEnd: { type: MarkerType.ArrowClosed } }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={2}
        panOnScroll
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} />
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
          <button type="button" onClick={toggleActivePath}>{activePath ? "Unhighlight path" : "Highlight path"}</button>
          <button type="button" onClick={togglePorts}>{showPorts ? "Hide ports" : "Show ports"}</button>
          <button type="button" onClick={addDraftDevice}>Add draft device</button>
          <button type="button" onClick={resetDemo}>Reset demo</button>
        </Panel>
        <Panel position="top-right" className="rf-mode-panel">
          <span className="badge good">{nodes.length} devices</span>
          <span className="badge warn">{edges.length} links</span>
          <span className="badge good">React Flow + ELK</span>
        </Panel>
      </ReactFlow>
      <SelectionInspector selection={selection} />
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
