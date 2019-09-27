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
        const value = d.data.props.downstream_tips
        if (value !== undefined) {
          return value
        } else {
          return 1
        }
      })
      .sort((a, b) => b.value - a.value)
  )
}


export default layoutTree
