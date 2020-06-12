import * as d3Hierarchy from 'd3-hierarchy'

/**
 * Generate Circle Packing
 *
 * @param tree
 * @param diameter
 * @param margin
 * @returns {*}
 */
const layoutTree = (tree, diameter, margin) => {
  const newTree = d3Hierarchy
    .hierarchy(tree)
    .count()
    .sort((a, b) => {
      return b.value - a.value
    })

  const size = diameter - margin
  return d3Hierarchy
    .pack()
    .size([size, size])
    .padding(0.1)(newTree)
}

export default layoutTree
