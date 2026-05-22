import { useMemo, useState } from "react";
import { flattenTree } from "../lib/domTree";

const STARTER_QUESTIONS = [
  "Summarize this DOM",
  "Explain the selected node",
  "Which tags appear most?",
  "What are text nodes doing here?",
];

function countTags(nodes) {
  const counts = new Map();

  nodes.forEach((node) => {
    if (node.kind !== "element") return;
    counts.set(node.tagName, (counts.get(node.tagName) ?? 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function formatTopTags(nodes) {
  const topTags = countTags(nodes).slice(0, 5);

  if (topTags.length === 0) {
    return "I don't see any element tags yet.";
  }

  return topTags.map(([tag, count]) => `<${tag}> × ${count}`).join(", ");
}

function findMentionedTag(question, nodes) {
  const tags = new Set(
    nodes.filter((node) => node.kind === "element").map((node) => node.tagName),
  );

  return [...tags].find((tag) => question.includes(tag));
}

function explainSelectedNode(selectedNode) {
  if (!selectedNode) {
    return "No node is selected right now. Click a node in the tree or line diagram and I’ll explain it.";
  }

  const parts = [
    `You selected ${selectedNode.label || selectedNode.tagName || selectedNode.kind}.`,
    `Kind: ${selectedNode.kind}.`,
    `Category: ${selectedNode.category}.`,
    `Path: ${selectedNode.path}.`,
  ];

  if (selectedNode.attributes?.length) {
    parts.push(
      `Attributes: ${selectedNode.attributes.map((attribute) => `${attribute.name}="${attribute.value}"`).join(", ")}.`,
    );
  }

  if (selectedNode.textContent) {
    parts.push(`Text content: “${selectedNode.textContent}”.`);
  }

  parts.push(selectedNode.detail);
  return parts.join(" ");
}

function generateReply(question, context) {
  const normalized = question.trim().toLowerCase();
  const { nodes, stats, selectedNode } = context;

  if (!normalized) {
    return "Ask me about the DOM, the selected node, text nodes, comments, or which tags appear most often.";
  }

  if (
    normalized.includes("selected") ||
    normalized.includes("this node") ||
    normalized.includes("current node") ||
    normalized.includes("explain")
  ) {
    return explainSelectedNode(selectedNode);
  }

  if (
    normalized.includes("summary") ||
    normalized.includes("summarize") ||
    normalized.includes("overview")
  ) {
    return `This DOM currently has ${stats.totalNodes} total nodes: ${stats.elements} element nodes, ${stats.textNodes} text nodes, ${stats.commentNodes} comment nodes, and a maximum depth of ${stats.maxDepth}. The most common tags are ${formatTopTags(nodes)}.`;
  }

  if (normalized.includes("text node") || normalized.includes("whitespace")) {
    return `Text nodes hold the raw text between elements. Right now I can see ${stats.textNodes} text node${stats.textNodes === 1 ? "" : "s"}. Toggle “Show text nodes” to reveal or hide them, which is a neat way to spot whitespace and inline content.`;
  }

  if (normalized.includes("comment")) {
    return `Comment nodes are hidden from the rendered page but they still exist in the DOM. I currently see ${stats.commentNodes} comment node${stats.commentNodes === 1 ? "" : "s"}. Turn on “Show comments” to inspect them in the structure.`;
  }

  if (normalized.includes("depth") || normalized.includes("deep")) {
    return `The deepest branch in this DOM reaches depth ${stats.maxDepth}. Deep nesting can make markup harder to scan, so it is often worth checking whether any wrappers are unnecessary.`;
  }

  if (normalized.includes("tag") || normalized.includes("most")) {
    return `The most common tags right now are ${formatTopTags(nodes)}.`;
  }

  const mentionedTag = findMentionedTag(normalized, nodes);
  if (mentionedTag) {
    const matches = nodes.filter(
      (node) => node.kind === "element" && node.tagName === mentionedTag,
    );
    return `I found ${matches.length} <${mentionedTag}> element${matches.length === 1 ? "" : "s"}. Example path: ${matches[0]?.path ?? "not available"}. These nodes are classified as ${matches[0]?.category ?? "other"}.`;
  }

  return `Here’s a quick read: the DOM has ${stats.elements} elements and ${stats.maxDepth} levels of nesting. If you want, ask me to summarize the DOM, explain the selected node, list common tags, or talk about text nodes and comments.`;
}

export default function DomCoach({ tree, stats, selectedNode }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      text: "Hi! I’m your local DOM coach. Ask me about the current structure, the selected node, common tags, comments, or text nodes. No external AI setup needed.",
    },
  ]);

  const nodes = useMemo(() => flattenTree(tree), [tree]);

  function submitQuestion(question) {
    const trimmed = question.trim();
    if (!trimmed) return;

    const reply = generateReply(trimmed, {
      nodes,
      stats,
      selectedNode,
    });

    setMessages((current) => [
      ...current,
      { id: current.length + 1, role: "user", text: trimmed },
      { id: current.length + 2, role: "assistant", text: reply },
    ]);
    setInput("");
  }

  return (
    <div className="coach-shell">
      <div className="coach-intro">
        <p>
          This is a built-in learning chat. It responds from your parsed DOM and
          selected node, so you can practice without wiring an API key.
        </p>
      </div>

      <div className="coach-suggestions">
        {STARTER_QUESTIONS.map((question) => (
          <button
            type="button"
            key={question}
            className="ghost-button coach-chip"
            onClick={() => submitQuestion(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="coach-messages">
        {messages.map((message) => (
          <article
            key={message.id}
            className={`coach-message coach-message-${message.role}`}
          >
            <span className="coach-role">
              {message.role === "assistant" ? "DOM Coach" : "You"}
            </span>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      <form
        className="coach-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitQuestion(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about the current DOM..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
