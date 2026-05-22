import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DomCoach from "./components/DomCoach";
import LineDiagram from "./components/LineDiagram";
import TreeNode from "./components/TreeNode";
import { SAMPLE_SNIPPETS } from "./data/samples";
import {
  collectExpandableIds,
  collectInitialExpandedIds,
  parseHtmlToTree,
} from "./lib/domTree";

const DEFAULT_SAMPLE = SAMPLE_SNIPPETS[0];

function Stat({ label, value }) {
  return (
    <div className="stat-pill">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle-chip">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

export default function App() {
  const appRef = useRef(null);
  const [sampleId, setSampleId] = useState(DEFAULT_SAMPLE.id);
  const [editorValue, setEditorValue] = useState(DEFAULT_SAMPLE.html);
  const [committedHtml, setCommittedHtml] = useState(DEFAULT_SAMPLE.html);
  const [showTextNodes, setShowTextNodes] = useState(true);
  const [showCommentNodes, setShowCommentNodes] = useState(false);
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [viewMode, setViewMode] = useState("tree");
  const [diagramMode, setDiagramMode] = useState("default");
  const [diagramLocked, setDiagramLocked] = useState(true);
  const [diagramDirection, setDiagramDirection] = useState("vertical");
  const [diagramResetKey, setDiagramResetKey] = useState(0);
  const [expandedIds, setExpandedIds] = useState(
    () => new Set(["document-root"]),
  );
  const [selectedId, setSelectedId] = useState("document-root");

  useEffect(() => {
    if (autoUpdate) {
      setCommittedHtml(editorValue);
    }
  }, [autoUpdate, editorValue]);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const cleanupHandlers = [];

    const context = gsap.context(() => {
      const entrance = gsap.timeline({ defaults: { ease: "power3.out" } });

      entrance
        .from(".gsap-fade", {
          y: -24,
          opacity: 0,
          duration: 0.7,
        })
        .from(
          ".gsap-hero",
          {
            y: 26,
            opacity: 0,
            duration: 0.7,
            stagger: 0.12,
          },
          "-=0.38",
        )
        .from(
          ".gsap-panel",
          {
            y: 30,
            opacity: 0,
            duration: 0.7,
            stagger: 0.08,
          },
          "-=0.25",
        );

      gsap.to(".learning-panel, .coach-panel", {
        scrollTrigger: {
          trigger: ".learning-panel",
          start: "top 85%",
          end: "bottom top",
          scrub: 1,
        },
        y: -20,
        ease: "none",
      });

      const pressTargets = document.querySelectorAll(
        ".btn-press, .ghost-button, .view-tab",
      );

      pressTargets.forEach((button) => {
        const handleDown = () => {
          gsap.to(button, {
            scale: 0.97,
            duration: 0.12,
            ease: "power1.out",
          });
        };

        const handleUp = () => {
          gsap.to(button, {
            scale: 1,
            duration: 0.24,
            ease: "back.out(2)",
          });
        };

        button.addEventListener("mousedown", handleDown);
        button.addEventListener("mouseup", handleUp);
        button.addEventListener("mouseleave", handleUp);

        cleanupHandlers.push(() => {
          button.removeEventListener("mousedown", handleDown);
          button.removeEventListener("mouseup", handleUp);
          button.removeEventListener("mouseleave", handleUp);
        });
      });
    }, appRef);

    return () => {
      cleanupHandlers.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, []);

  const result = useMemo(
    () =>
      parseHtmlToTree(committedHtml, {
        showTextNodes,
        showCommentNodes,
      }),
    [committedHtml, showTextNodes, showCommentNodes],
  );

  useEffect(() => {
    if (!result.tree) {
      setExpandedIds(new Set());
      setSelectedId("");
      return;
    }

    setExpandedIds(new Set(collectInitialExpandedIds(result.tree, 3)));
    setSelectedId((current) =>
      result.nodeMap.has(current) ? current : result.tree.id,
    );
  }, [result.tree, result.nodeMap]);

  const selectedNode = selectedId ? result.nodeMap.get(selectedId) : null;

  const currentSample =
    SAMPLE_SNIPPETS.find((sample) => sample.id === sampleId) ?? DEFAULT_SAMPLE;

  function handleSampleChange(event) {
    const nextSample = SAMPLE_SNIPPETS.find(
      (sample) => sample.id === event.target.value,
    );
    if (!nextSample) return;

    setSampleId(nextSample.id);
    setEditorValue(nextSample.html);
    setCommittedHtml(nextSample.html);
  }

  function handleVisualize() {
    setCommittedHtml(editorValue);
  }

  function handleToggleNode(id) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleExpandAll() {
    if (!result.tree) return;
    setExpandedIds(new Set(collectExpandableIds(result.tree)));
  }

  function handleCollapseAll() {
    setExpandedIds(new Set(["document-root"]));
  }

  function handleDiagramModeChange(nextMode) {
    setDiagramMode(nextMode);
    setDiagramLocked(true);

    if (nextMode === "default") {
      setDiagramResetKey((value) => value + 1);
    }
  }

  return (
    <div ref={appRef} className="app-shell">
      <div className="site-header gsap-fade">
        <span className="site-header-logo">DomTreeView</span>
        <span className="site-header-tag">DOM Learning Playground</span>
      </div>

      <header className="hero-card gsap-fade">
        <div>
          <p className="eyebrow">DOM learning playground</p>
          <h1>DomTreeView</h1>
          <p className="hero-copy">
            Paste any HTML, let the browser parse it, and explore the resulting
            DOM tree like a mini DevTools lab.
          </p>
        </div>

        <div className="hero-note">
          <span className="hero-badge">Built for learning</span>
          <p>
            Great for understanding nesting, text nodes, comments, semantic
            tags, and how browsers quietly repair imperfect markup.
          </p>
        </div>
      </header>

      <main className="layout-grid">
        <section className="panel input-panel gsap-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Editor</p>
              <h2>Write or paste HTML</h2>
            </div>
            <button
              type="button"
              className="btn-press"
              onClick={handleVisualize}
            >
              Visualize DOM
            </button>
          </div>

          <div className="control-grid">
            <label>
              Sample snippet
              <select value={sampleId} onChange={handleSampleChange}>
                {SAMPLE_SNIPPETS.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="sample-summary">
              <strong>{currentSample.label}</strong>
              <p>{currentSample.description}</p>
            </div>
          </div>

          <div className="toggle-row">
            <Toggle
              label="Auto update"
              checked={autoUpdate}
              onChange={() => setAutoUpdate((value) => !value)}
            />
            <Toggle
              label="Show text nodes"
              checked={showTextNodes}
              onChange={() => setShowTextNodes((value) => !value)}
            />
            <Toggle
              label="Show comments"
              checked={showCommentNodes}
              onChange={() => setShowCommentNodes((value) => !value)}
            />
          </div>

          <textarea
            className="editor"
            value={editorValue}
            onChange={(event) => setEditorValue(event.target.value)}
            spellCheck={false}
            placeholder="<!DOCTYPE html>\n<html>...</html>"
          />

          <div className="hint-box">
            <strong>Learning tip:</strong> Try removing the{" "}
            <code>&lt;body&gt;</code> tag or write slightly messy HTML. The
            parser often corrects it, and the tree will show you what the
            browser actually built.
          </div>
        </section>

        <section className="panel output-panel gsap-panel">
          <div className="panel-header panel-header-stacked">
            <div>
              <p className="eyebrow">DOM tree</p>
              <h2>Parsed structure and line diagram</h2>
            </div>
            <div className="button-row output-toolbar">
              <div
                className="view-switcher"
                role="tablist"
                aria-label="DOM view mode"
              >
                <button
                  type="button"
                  className={
                    viewMode === "tree"
                      ? "view-tab view-tab-active"
                      : "view-tab"
                  }
                  onClick={() => setViewMode("tree")}
                >
                  Tree view
                </button>
                <button
                  type="button"
                  className={
                    viewMode === "diagram"
                      ? "view-tab view-tab-active"
                      : "view-tab"
                  }
                  onClick={() => setViewMode("diagram")}
                >
                  Line diagram
                </button>
              </div>
              {viewMode === "diagram" ? (
                <div className="diagram-controls">
                  <div
                    className="diagram-mode-switcher"
                    aria-label="Diagram mode"
                  >
                    <button
                      type="button"
                      className={
                        diagramMode === "default"
                          ? "view-tab view-tab-active"
                          : "view-tab"
                      }
                      onClick={() => handleDiagramModeChange("default")}
                    >
                      Default layout
                    </button>
                    <button
                      type="button"
                      className={
                        diagramMode === "free"
                          ? "view-tab view-tab-active"
                          : "view-tab"
                      }
                      onClick={() => handleDiagramModeChange("free")}
                    >
                      Free move
                    </button>
                  </div>
                  <label className="diagram-select-label">
                    Flow
                    <select
                      className="diagram-select"
                      value={diagramDirection}
                      onChange={(event) =>
                        setDiagramDirection(event.target.value)
                      }
                    >
                      <option value="vertical">Top to bottom</option>
                      <option value="horizontal">Left to right</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setDiagramLocked((value) => !value)}
                    disabled={diagramMode === "default"}
                  >
                    {diagramMode === "default"
                      ? "Auto locked"
                      : diagramLocked
                        ? "Unlock view"
                        : "Lock view"}
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setDiagramResetKey((value) => value + 1)}
                  >
                    Reset node positions
                  </button>
                </div>
              ) : null}
              {viewMode === "tree" ? (
                <>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleExpandAll}
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={handleCollapseAll}
                  >
                    Collapse all
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="stats-row">
            <Stat label="Total nodes" value={result.stats.totalNodes} />
            <Stat label="Elements" value={result.stats.elements} />
            <Stat label="Text" value={result.stats.textNodes} />
            <Stat label="Comments" value={result.stats.commentNodes} />
            <Stat label="Depth" value={result.stats.maxDepth} />
          </div>

          {result.error ? (
            <div className="warning-box">{result.error}</div>
          ) : null}

          {viewMode === "tree" ? (
            <div className="tree-panel">
              {result.tree ? (
                <TreeNode
                  node={result.tree}
                  depth={0}
                  expandedIds={expandedIds}
                  selectedId={selectedId}
                  onToggle={handleToggleNode}
                  onSelect={setSelectedId}
                />
              ) : (
                <div className="empty-state">
                  Your parsed DOM tree will appear here.
                </div>
              )}
            </div>
          ) : (
            <div className="tree-panel diagram-panel">
              <LineDiagram
                key={`${diagramDirection}-${diagramMode}-${diagramResetKey}`}
                tree={result.tree}
                selectedId={selectedId}
                onSelect={setSelectedId}
                direction={diagramDirection}
                interactionMode={diagramMode}
                isLocked={diagramLocked}
              />
            </div>
          )}
        </section>

        <section className="panel details-panel gsap-panel">
          <div className="panel-header panel-header-stacked">
            <div>
              <p className="eyebrow">Inspector</p>
              <h2>Selected node details</h2>
            </div>
          </div>

          {selectedNode ? (
            <div className="inspector-stack">
              <div className="info-card">
                <span className="info-label">Kind</span>
                <strong>{selectedNode.kind}</strong>
              </div>
              <div className="info-card">
                <span className="info-label">Category</span>
                <strong>{selectedNode.category}</strong>
              </div>
              <div className="info-card info-card-wide">
                <span className="info-label">Path</span>
                <code>{selectedNode.path}</code>
              </div>
              <div className="info-card info-card-wide">
                <span className="info-label">Why it matters</span>
                <p>{selectedNode.detail}</p>
              </div>
              {selectedNode.attributes?.length ? (
                <div className="info-card info-card-wide">
                  <span className="info-label">Attributes</span>
                  <ul className="attribute-list">
                    {selectedNode.attributes.map((attribute) => (
                      <li key={`${selectedNode.id}-${attribute.name}`}>
                        <code>{attribute.name}</code>:{" "}
                        {attribute.value || <em>(empty)</em>}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedNode.textContent ? (
                <div className="info-card info-card-wide">
                  <span className="info-label">Text content</span>
                  <p>{selectedNode.textContent}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-state">
              Click any node in the tree to inspect it.
            </div>
          )}
        </section>

        <section className="panel preview-panel gsap-panel">
          <div className="panel-header panel-header-stacked">
            <div>
              <p className="eyebrow">Browser preview</p>
              <h2>Rendered output</h2>
            </div>
          </div>

          <iframe
            title="HTML preview"
            className="preview-frame"
            srcDoc={`<style>
button {
  border: none;
  border-radius: 14px;
  padding: 0.7rem 1.1rem;
  background: linear-gradient(135deg, #34d45a, #22b84a);
  color: #ffffff;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(34, 184, 74, 0.28);
  transition: background 0.22s ease, transform 0.15s ease;
}
button:hover {
  background: linear-gradient(135deg, #3b9eff, #1a6fd4);
  transform: translateY(-2px);
}
button:active { transform: translateY(0); }
</style>${committedHtml}`}
            sandbox="allow-same-origin"
          />
        </section>

        <section className="panel learning-panel gsap-panel">
          <div className="panel-header panel-header-stacked">
            <div>
              <p className="eyebrow">Learning notes</p>
              <h2>What to look for in both views</h2>
            </div>
          </div>

          <div className="lesson-grid">
            <article className="lesson-card">
              <h3>HTML vs DOM</h3>
              <p>
                The HTML you type is just text. The browser parses that text and
                creates a DOM tree of nodes.
              </p>
            </article>
            <article className="lesson-card">
              <h3>Whitespace matters</h3>
              <p>
                Text nodes can appear between tags. Turn text nodes on and off
                to see how much invisible structure exists.
              </p>
            </article>
            <article className="lesson-card">
              <h3>Comments are nodes too</h3>
              <p>
                HTML comments do not render, but they still exist in the DOM and
                can be discovered by scripts.
              </p>
            </article>
            <article className="lesson-card">
              <h3>Browsers are forgiving</h3>
              <p>
                Even imperfect HTML is often repaired automatically. That makes
                this tool handy for learning what the browser actually kept.
              </p>
            </article>
            <article className="lesson-card">
              <h3>Diagram vs tree</h3>
              <p>
                The tree view is great for reading markup like code, while the
                line diagram makes parent-child relationships easier to spot at
                a glance.
              </p>
            </article>
          </div>
        </section>

        <section className="panel coach-panel gsap-panel">
          <div className="panel-header panel-header-stacked">
            <div>
              <p className="eyebrow">Learning chat</p>
              <h2>Ask the DOM coach</h2>
            </div>
          </div>

          <DomCoach
            tree={result.tree}
            stats={result.stats}
            selectedNode={selectedNode}
          />
        </section>
      </main>

      <footer className="site-footer">
        <p>
          © {new Date().getFullYear()} Squid Consultancy Group Ltd. All rights
          reserved.
        </p>
        <p className="site-footer-sub">
          DomTreeView — A DOM learning playground. Built for education purposes.
        </p>
      </footer>
    </div>
  );
}
