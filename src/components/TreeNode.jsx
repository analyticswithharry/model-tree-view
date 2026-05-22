function NodeContent({ node, isExpanded }) {
  if (node.kind === "document") {
    return <span className="node-code node-document">#document</span>;
  }

  if (node.kind === "doctype") {
    return <span className="node-code node-doctype">{node.label}</span>;
  }

  if (node.kind === "text") {
    return <span className="node-code node-text">{node.label}</span>;
  }

  if (node.kind === "comment") {
    return <span className="node-code node-comment">{node.label}</span>;
  }

  return (
    <>
      <span className="node-code">&lt;</span>
      <span className="tag-name">{node.tagName}</span>
      {node.attributes?.map((attribute) => (
        <span className="node-attribute" key={`${node.id}-${attribute.name}`}>
          {" "}
          <span className="attribute-name">{attribute.name}</span>
          <span className="node-code">=</span>
          <span className="attribute-value">&quot;{attribute.value}&quot;</span>
        </span>
      ))}
      <span className="node-code">&gt;</span>
      {!isExpanded && node.inlinePreview ? (
        <span className="inline-preview"> {node.inlinePreview}</span>
      ) : null}
      {!isExpanded && node.childCount > 0 ? (
        <span className="collapsed-meta">
          {" "}
          … {node.childCount} child{node.childCount === 1 ? "" : "ren"}
        </span>
      ) : null}
      {!isExpanded && node.childCount > 0 ? (
        <span className="node-code closing-tag"> {node.closingLabel}</span>
      ) : null}
    </>
  );
}

export default function TreeNode({
  node,
  depth,
  expandedIds,
  selectedId,
  onToggle,
  onSelect,
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div className="tree-branch">
      <div
        className={`tree-row ${isSelected ? "tree-row-selected" : ""}`}
        style={{ paddingLeft: `${depth * 18}px` }}
        onClick={() => onSelect(node.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node.id);
          }
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            aria-label={isExpanded ? "Collapse node" : "Expand node"}
            onClick={(event) => {
              event.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? "▾" : "▸"}
          </button>
        ) : (
          <span className="tree-toggle-spacer" />
        )}

        <span className={`node-pill node-pill-${node.kind}`}>{node.kind}</span>
        <div className="tree-line">
          <NodeContent node={node} isExpanded={isExpanded} />
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              selectedId={selectedId}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}

          {node.kind === "element" ? (
            <div
              className="tree-row tree-row-closing"
              style={{ paddingLeft: `${depth * 18}px` }}
            >
              <span className="tree-toggle-spacer" />
              <span className="node-pill node-pill-closing">end</span>
              <div className="tree-line">
                <span className="node-code closing-tag">
                  {node.closingLabel}
                </span>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
