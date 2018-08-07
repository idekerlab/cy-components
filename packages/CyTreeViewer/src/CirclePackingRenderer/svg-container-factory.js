import * as d3Selection from 'd3-selection'

const COMPONENT_ID = 'circle-main'
const COMPONENT_CLASS = 'circle-packing'


const getSvg = (parentTag, width, height) => {

  // Clear current tag
  d3Selection.select('#' + COMPONENT_ID).remove()

  return d3Selection
    .select(parentTag)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('class', COMPONENT_CLASS)
    .attr('id', COMPONENT_ID)
}

export default getSvg