import * as d3Hierarchy from 'd3-hierarchy'

const getRoot = tree =>
  d3Hierarchy
    .hierarchy(tree)
    .sum(d => {
      const value = d.data.data.props.downstream_clusters
      if (value !== undefined) {
        console.log('VAL = ', value)
        return value * 10
      } else {
        console.log('VALNOT = ', value)
        return 10
      }
    })
    .sort((a, b) => b.value - a.value)

export default getRoot
