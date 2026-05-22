import { useEffect, useMemo, useRef, useState } from "react";
import { computeDiagramLayout } from "../lib/domTree";

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.2;

function nodeClassName(node, selectedId) {
  const parts = ["diagram-node"];

  parts.push(`diagram-node-${node.kind}`);
  if (node.id === selectedId) {
    parts.push("diagram-node-selected");
  }

  return parts.join(" ");
}

function edgePath(from, to, direction) {
  if (direction === "horizontal") {
    const startX = from.x + from.width / 2;
    const endX = to.x - to.width / 2;
    const midX = (startX + endX) / 2;

    return `M ${startX} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${endX} ${to.y}`;
  }

  const startY = from.y + from.height / 2;
  const endY = to.y - to.height / 2;
  const midY = (startY + endY) / 2;

  return `M ${from.x} ${startY} L ${from.x} ${midY} L ${to.x} ${midY} L ${to.x} ${endY}`;
}

export default function LineDiagram({
  tree,
  selectedId,
  onSelect,
  direction,
  interactionMode,
  isLocked,
}) {
  const svgRef = useRef(null);
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const [nodeOffsets, setNodeOffsets] = useState({});
  const [zoom, setZoom] = useState(1);

  const layout = useMemo(
    () => computeDiagramLayout(tree, { direction }),
    [tree, direction],
  );

  useEffect(() => {
    setNodeOffsets({});
  }, [tree, direction, interactionMode]);

  useEffect(() => {
    if (interactionMode === "default") {
      setNodeOffsets({});
    }
  }, [interactionMode]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const root = layout.nodes[0];
    if (!root) {
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      return;
    }

    const centeredLeft = Math.max(
      0,
      root.x * zoom - stage.clientWidth / 2 + root.width / 2,
    );
    const centeredTop = Math.max(0, root.y * zoom - 96);

    stage.scrollTo({
      left: centeredLeft,
      top: centeredTop,
      behavior: "auto",
    });
  }, [tree, direction, interactionMode, layout.nodes, zoom]);

  useEffect(() => {
    function handlePointerMove(event) {
      const drag = dragRef.current;
      const svg = svgRef.current;
      if (!drag || !svg) return;

      const rect = svg.getBoundingClientRect();
      const scaleX = layout.width / rect.width;
      const scaleY = layout.height / rect.height;
      const dx = (event.clientX - drag.startClientX) * scaleX;
      const dy = (event.clientY - drag.startClientY) * scaleY;

      setNodeOffsets((current) => ({
        ...current,
        [drag.nodeId]: {
          x: drag.startOffsetX + dx,
          y: drag.startOffsetY + dy,
        },
      }));
    }

    function handlePointerUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [layout.height, layout.width]);

  const displayedNodes = useMemo(
    () =>
      layout.nodes.map((entry) => {
        const offset = nodeOffsets[entry.id] ?? { x: 0, y: 0 };
        return {
          ...entry,
          x: entry.x + offset.x,
          y: entry.y + offset.y,
        };
      }),
    [layout.nodes, nodeOffsets],
  );

  const displayedNodeMap = useMemo(
    () => new Map(displayedNodes.map((entry) => [entry.id, entry])),
    [displayedNodes],
  );

  if (!tree) {
    return (
      <div className="empty-state">
        Generate a DOM tree to see the line diagram.
      </div>
    );
  }

  return (
    <div className="diagram-shell">
      <div className="diagram-topbar">
        <div className="diagram-status-row">
          <span className="diagram-badge">
            {interactionMode === "default" ? "Default layout" : "Free move"}
          </span>
          <span className="diagram-badge diagram-badge-muted">
            {interactionMode === "default"
              ? "Automatic non-overlapping placement"
              : isLocked
                ? "Locked until you unlock"
                : "Unlocked for dragging"}
          </span>
        </div>

        <div className="diagram-zoom-controls">
          <button
            type="button"
            className="ghost-button diagram-mini-button"
            onClick={() =>
              setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
            }
          >
            −
          </button>
          <span className="diagram-zoom-readout">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="ghost-button diagram-mini-button"
            onClick={() =>
              setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
            }
          >
            +
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setZoom(1)}
          >
            Reset zoom
          </button>
        </div>
      </div>

      <div className="diagram-legend">
        <span>
          <i className="legend-swatch legend-element" />
          Element
        </span>
        <span>
          <i className="legend-swatch legend-text" />
          Text
        </span>
        <span>
          <i className="legend-swatch legend-comment" />
          Comment
        </span>
        <span>
          <i className="legend-swatch legend-doctype" />
          Document
        </span>
        <span className="diagram-hint">
          {interactionMode === "default"
            ? "Default layout keeps the structure tidy and avoids overlap."
            : isLocked
              ? "Unlock the view to drag nodes, then lock it again when you are happy."
              : "Drag any node to rearrange the visual structure."}
        </span>
      </div>

      <div ref={stageRef} className="diagram-stage">
        <svg
          ref={svgRef}
          className="diagram-svg"
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width * zoom}
          height={layout.height * zoom}
          role="img"
          aria-label="DOM line diagram"
        >
          <defs>
            <filter
              id="diagramShadow"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feDropShadow
                dx="0"
                dy="12"
                stdDeviation="12"
                floodOpacity="0.18"
              />
            </filter>
          </defs>

          {layout.edges.map((edge) => (
            <path
              key={edge.id}
              d={edgePath(
                displayedNodeMap.get(edge.from.id),
                displayedNodeMap.get(edge.to.id),
                direction,
              )}
              className="diagram-edge"
            />
          ))}

          {displayedNodes.map((entry) => {
            return (
              <g
                key={entry.id}
                className={nodeClassName(entry.node, selectedId)}
                transform={`translate(${entry.x - entry.width / 2}, ${entry.y - entry.height / 2})`}
                onClick={() => onSelect(entry.id)}
                onPointerDown={(event) => {
                  if (interactionMode !== "free" || isLocked) {
                    return;
                  }

                  event.preventDefault();
                  onSelect(entry.id);
                  const currentOffset = nodeOffsets[entry.id] ?? { x: 0, y: 0 };
                  dragRef.current = {
                    nodeId: entry.id,
                    startClientX: event.clientX,
                    startClientY: event.clientY,
                    startOffsetX: currentOffset.x,
                    startOffsetY: currentOffset.y,
                  };
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(entry.id);
                  }
                }}
              >
                <rect
                  width={entry.width}
                  height={entry.height}
                  rx="14"
                  filter="url(#diagramShadow)"
                />
                <text
                  x={entry.width / 2}
                  y={entry.height / 2 + 5}
                  textAnchor="middle"
                  className="diagram-node-text"
                >
                  {entry.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
