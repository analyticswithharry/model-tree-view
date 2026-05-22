const GROUPS = {
  metadata: new Set([
    "head",
    "title",
    "base",
    "link",
    "meta",
    "style",
    "script",
  ]),
  sections: new Set([
    "body",
    "main",
    "article",
    "section",
    "nav",
    "aside",
    "header",
    "footer",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
  ]),
  text: new Set([
    "p",
    "span",
    "a",
    "strong",
    "em",
    "small",
    "mark",
    "code",
    "time",
    "abbr",
    "label",
  ]),
  grouping: new Set([
    "div",
    "ul",
    "ol",
    "li",
    "figure",
    "figcaption",
    "blockquote",
    "pre",
  ]),
  forms: new Set([
    "form",
    "input",
    "button",
    "select",
    "option",
    "textarea",
    "fieldset",
    "legend",
    "datalist",
  ]),
  media: new Set([
    "img",
    "video",
    "audio",
    "picture",
    "source",
    "canvas",
    "svg",
    "iframe",
  ]),
  table: new Set([
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
    "caption",
  ]),
};

function truncate(value, max = 48) {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function classifyTag(tagName) {
  const tag = tagName.toLowerCase();

  if (GROUPS.metadata.has(tag)) return "metadata";
  if (GROUPS.sections.has(tag)) return "sectioning";
  if (GROUPS.text.has(tag)) return "text";
  if (GROUPS.grouping.has(tag)) return "grouping";
  if (GROUPS.forms.has(tag)) return "forms";
  if (GROUPS.media.has(tag)) return "media";
  if (GROUPS.table.has(tag)) return "table";
  return "other";
}

function describeElement(tagName, attributes) {
  const idAttr = attributes.find((attribute) => attribute.name === "id");
  const classAttr = attributes.find((attribute) => attribute.name === "class");

  if (idAttr?.value) {
    return `${tagName}#${idAttr.value}`;
  }

  if (classAttr?.value) {
    const className = classAttr.value.split(/\s+/).filter(Boolean)[0];
    if (className) {
      return `${tagName}.${className}`;
    }
  }

  return tagName;
}

function createStats() {
  return {
    elements: 0,
    textNodes: 0,
    commentNodes: 0,
    doctypeNodes: 0,
    maxDepth: 0,
  };
}

function createIdFactory() {
  let count = 0;
  return () => `node-${++count}`;
}

function buildNodeMap(root) {
  const nodeMap = new Map();

  function walk(node) {
    nodeMap.set(node.id, node);
    node.children.forEach(walk);
  }

  walk(root);
  return nodeMap;
}

function convertDoctype(doctype, nextId) {
  if (!doctype) {
    return null;
  }

  return {
    id: nextId(),
    kind: "doctype",
    label: `<!DOCTYPE ${doctype.name}>`,
    category: "document",
    path: "#document > doctype",
    depth: 1,
    children: [],
    detail: `Document type declaration: ${doctype.name}`,
  };
}

function convertNode(node, options, nextId, stats, depth, parentPath) {
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (node.nodeType === Node.TEXT_NODE) {
    const value = normalizeWhitespace(node.textContent ?? "");
    if (!value || !options.showTextNodes) {
      return null;
    }

    stats.textNodes += 1;

    return {
      id: nextId(),
      kind: "text",
      label: `"${truncate(value, 60)}"`,
      category: "text",
      path: `${parentPath} > #text`,
      depth,
      textContent: value,
      children: [],
      detail: "Text nodes store the text between HTML tags.",
    };
  }

  if (node.nodeType === Node.COMMENT_NODE) {
    const value = normalizeWhitespace(node.textContent ?? "");
    if (!options.showCommentNodes) {
      return null;
    }

    stats.commentNodes += 1;

    return {
      id: nextId(),
      kind: "comment",
      label: `<!-- ${truncate(value || "comment", 60)} -->`,
      category: "comment",
      path: `${parentPath} > comment()`,
      depth,
      textContent: value,
      children: [],
      detail:
        "Comment nodes are ignored visually by the browser, but they still exist in the DOM tree.",
    };
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  stats.elements += 1;

  const tagName = node.tagName.toLowerCase();
  const attributes = Array.from(node.attributes).map((attribute) => ({
    name: attribute.name,
    value: attribute.value,
  }));
  const descriptor = describeElement(tagName, attributes);
  const path = `${parentPath} > ${descriptor}`;
  const normalizedText = normalizeWhitespace(node.textContent ?? "");
  const inlinePreview =
    node.childNodes.length === 1 && node.firstChild?.nodeType === Node.TEXT_NODE
      ? truncate(normalizedText, 42)
      : "";

  const children = Array.from(node.childNodes)
    .map((child) => convertNode(child, options, nextId, stats, depth + 1, path))
    .filter(Boolean);

  return {
    id: nextId(),
    kind: "element",
    tagName,
    label: `<${tagName}>`,
    closingLabel: `</${tagName}>`,
    category: classifyTag(tagName),
    path,
    depth,
    attributes,
    inlinePreview,
    childCount: children.length,
    textPreview: truncate(normalizedText, 72),
    children,
    detail: `The <${tagName}> element belongs to the ${classifyTag(tagName)} group.`,
  };
}

export function parseHtmlToTree(html, options = {}) {
  const trimmed = html.trim();

  if (!trimmed) {
    return {
      tree: null,
      nodeMap: new Map(),
      stats: {
        totalNodes: 0,
        elements: 0,
        textNodes: 0,
        commentNodes: 0,
        doctypeNodes: 0,
        maxDepth: 0,
      },
      error: "Paste some HTML to generate the DOM tree.",
    };
  }

  try {
    const parser = new DOMParser();
    const documentNode = parser.parseFromString(trimmed, "text/html");
    const nextId = createIdFactory();
    const stats = createStats();

    const children = [];
    const doctype = convertDoctype(documentNode.doctype, nextId);
    if (doctype) {
      stats.doctypeNodes += 1;
      children.push(doctype);
    }

    const htmlElement = convertNode(
      documentNode.documentElement,
      options,
      nextId,
      stats,
      1,
      "#document",
    );
    if (htmlElement) {
      children.push(htmlElement);
    }

    const tree = {
      id: "document-root",
      kind: "document",
      label: "#document",
      category: "document",
      path: "#document",
      depth: 0,
      children,
      detail:
        "The document node is the root container for the entire parsed page.",
    };

    const nodeMap = buildNodeMap(tree);

    return {
      tree,
      nodeMap,
      stats: {
        totalNodes: nodeMap.size,
        elements: stats.elements,
        textNodes: stats.textNodes,
        commentNodes: stats.commentNodes,
        doctypeNodes: stats.doctypeNodes,
        maxDepth: stats.maxDepth,
      },
      error: "",
    };
  } catch (error) {
    return {
      tree: null,
      nodeMap: new Map(),
      stats: {
        totalNodes: 0,
        elements: 0,
        textNodes: 0,
        commentNodes: 0,
        doctypeNodes: 0,
        maxDepth: 0,
      },
      error:
        error instanceof Error
          ? error.message
          : "Unable to parse the HTML input.",
    };
  }
}

export function collectInitialExpandedIds(node, maxDepth = 2) {
  const ids = [];

  function walk(current) {
    if (current.children.length > 0 && current.depth < maxDepth) {
      ids.push(current.id);
    }
    current.children.forEach(walk);
  }

  walk(node);
  return ids;
}

export function collectExpandableIds(node) {
  const ids = [];

  function walk(current) {
    if (current.children.length > 0) {
      ids.push(current.id);
      current.children.forEach(walk);
    }
  }

  walk(node);
  return ids;
}

export function flattenTree(node) {
  const nodes = [];

  function walk(current) {
    nodes.push(current);
    current.children.forEach(walk);
  }

  if (node) {
    walk(node);
  }

  return nodes;
}

export function computeDiagramLayout(tree, options = {}) {
  if (!tree) {
    return {
      nodes: [],
      edges: [],
      width: 0,
      height: 0,
    };
  }

  const direction = options.direction ?? "vertical";

  const siblingGap = 52;
  const verticalGap = 138;
  const marginX = 88;
  const marginY = 72;
  const nodes = [];
  const edges = [];

  function getDiagramLabel(node) {
    if (node.kind === "element") {
      return `<${node.tagName}>`;
    }

    if (node.kind === "document") {
      return "#document";
    }

    const maxLength = node.kind === "text" ? 26 : 22;
    return truncate(node.label ?? node.kind, maxLength);
  }

  function measureLabel(node) {
    const label = getDiagramLabel(node);

    if (node.kind === "element") {
      return Math.min(Math.max(116, label.length * 9 + 34), 190);
    }

    if (node.kind === "text") {
      return Math.min(Math.max(150, label.length * 8 + 34), 260);
    }

    return Math.min(Math.max(116, label.length * 8 + 34), 220);
  }

  function buildLayout(node) {
    const children = node.children.map(buildLayout);
    const width = measureLabel(node);
    const childrenWidth = children.reduce((sum, child, index) => {
      const gap = index === 0 ? 0 : siblingGap;
      return sum + gap + child.subtreeWidth;
    }, 0);

    return {
      id: node.id,
      width,
      height: 46,
      label: getDiagramLabel(node),
      node,
      children,
      subtreeWidth: Math.max(width + 40, childrenWidth),
    };
  }

  function assignPositions(layoutNode, left, depth) {
    const centerX = left + layoutNode.subtreeWidth / 2;
    const primary = marginY + depth * verticalGap;
    const positionedNode = {
      id: layoutNode.id,
      x: direction === "horizontal" ? primary : centerX,
      y: direction === "horizontal" ? centerX : primary,
      width: layoutNode.width,
      height: layoutNode.height,
      label: layoutNode.label,
      node: layoutNode.node,
    };

    nodes.push(positionedNode);

    if (layoutNode.children.length === 0) {
      return positionedNode;
    }

    let cursor =
      left +
      (layoutNode.subtreeWidth -
        layoutNode.children.reduce((sum, child, index) => {
          const gap = index === 0 ? 0 : siblingGap;
          return sum + gap + child.subtreeWidth;
        }, 0)) /
        2;

    layoutNode.children.forEach((childLayout, index) => {
      if (index > 0) {
        cursor += siblingGap;
      }
      const childNode = assignPositions(childLayout, cursor, depth + 1);
      edges.push({
        id: `${layoutNode.id}-${childLayout.id}`,
        from: positionedNode,
        to: childNode,
      });
      cursor += childLayout.subtreeWidth;
    });

    return positionedNode;
  }

  const rootLayout = buildLayout(tree);
  assignPositions(rootLayout, marginX, 0);

  return {
    nodes,
    edges,
    width:
      direction === "horizontal"
        ? Math.max(
            marginY * 2 + Math.max(...nodes.map((node) => node.x), 0) + 220,
            860,
          )
        : Math.max(rootLayout.subtreeWidth + marginX * 2, 860),
    height:
      direction === "horizontal"
        ? Math.max(rootLayout.subtreeWidth + marginX * 2, 520)
        : Math.max(
            marginY * 2 + Math.max(...nodes.map((node) => node.y), 0) + 150,
            520,
          ),
  };
}
