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
  // const root = getRoot(tree)

  // Get all children

  const size = diameter - margin
  return d3Hierarchy
    .pack()
    .size([size, size])
    .padding(1)(
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
  )

  // return pack(root.sum(d => d.data.value))
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
