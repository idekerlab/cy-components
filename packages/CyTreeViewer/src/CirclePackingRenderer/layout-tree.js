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
  const root = getRoot(tree)

  // Get all children
  const pack = d3Hierarchy
    .pack()
    .size([diameter - margin, diameter - margin])
    .padding(1)

  return pack(root.sum(d => d.data.value))
}

const getRoot = tree =>
  d3Hierarchy
    .hierarchy(tree)
    .sum(d => {
      const value = d.data.value
      if (value !== undefined) {
        return value * 10
      } else {
        return 10
      }
    })
    .sort((a, b) => b.value - a.value)

export default layoutTree
