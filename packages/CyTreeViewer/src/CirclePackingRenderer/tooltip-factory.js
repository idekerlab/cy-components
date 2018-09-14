import * as d3Selection from 'd3-selection'

const COMPONENT_ID = 'tooltip'
const COMPONENT_CLASS = 'tooltip-circle-packing'

const getTooltip = () => {
  // Clear current tag
  d3Selection.select('#' + COMPONENT_ID).remove()

  return d3Selection
    .select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .attr('class', COMPONENT_CLASS)
    .attr('id', COMPONENT_ID)
}

export default getTooltip
