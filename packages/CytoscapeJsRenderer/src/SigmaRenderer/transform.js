export const toSigma = (cyjs, visualStyle = {}) => {
  const nodes = cyjs.elements.nodes;
  const edges = cyjs.elements.edges;

  const graph = {
    nodes: [],
    edges: []
  };

  const nodesLen = nodes.length;

  const colors = new Array(nodesLen);

  let i = nodesLen;
  while (i--) {
    const node = nodes[i];
    const nodeData = node.data;
    const sigmaNode = {
      id: nodeData.id,
      label: nodeData.name,
      x: node.position.x,
      y: node.position.y,
      size: nodeData.Size * 2,
      color: styleUtil.getNodeColor(nodeData)
    };

    graph.nodes.push(sigmaNode);

    colors[i] = node.color;
  }

  const hiddenEdges = {};

  edges.forEach(edge => {
    const ed = edge.data;
    const newEdge = {
      id: ed.id,
      source: ed.source,
      target: ed.target,
      size: 1,
      type: "curve",
      color: this.styleUtil.getEdgeColor(ed.Data),
      hover_color: this.styleUtil.getEdgeSelectedColor()
    };

    if (ed[this.props.edgeTypeTagName] !== "Tree") {
      newEdge.color = "#FFAA00";

      const source = hiddenEdges[ed.source];
      const target = hiddenEdges[ed.target];

      if (source === undefined) {
        hiddenEdges[ed.source] = [newEdge];
      } else {
        source.push(newEdge);
      }

      if (target === undefined) {
        hiddenEdges[ed.target] = [newEdge];
      } else {
        target.push(newEdge);
      }
    } else {
      graph.edges.push(newEdge);
    }
  });

  this.hiddenEdges = hiddenEdges;
};
