import * as d3Hierarchy from 'd3-hierarchy'

const cyjs2tree = cyjs => {
  if (cyjs === undefined || cyjs === null) {
    // Return empty
    return null
  }

  const edges = elements.edges

  const table = transform(edges)

  return d3Hierarchy
    .stratify()
    .id(function(d) {
      return d.name
    })
    .parentId(function(d) {
      return d.parent
    })(table)
}

const transform = edges => {
  let len = edges.length

  const table = new Array(len)
  while (len--) {
    const edge = edges[i]
    table[i] = {
      name: edge.data.source,
      parent: edge.data.target
    }
  }

  return table
}

export default cyjs2tree
