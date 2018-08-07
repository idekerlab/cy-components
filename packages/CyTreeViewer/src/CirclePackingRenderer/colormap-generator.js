import * as d3Scale from 'd3-scale'
import * as d3Color from 'd3-color'
import * as d3Interpolate from 'd3-interpolate'

const COLOR_RANGE = [d3Color.hsl('steelblue'), d3Color.hsl('#00C8F4')]
const DEF_DOMAIN = [-1, 5]

const getColorMap = (
  rootColor,
  leafColor,
  domain = DEF_DOMAIN,
  range = COLOR_RANGE
) => {
  range = [d3Color.hsl(rootColor), d3Color.hsl(leafColor)]

  return d3Scale
    .scaleLinear()
    .domain(domain)
    .range(range)
    .interpolate(d3Interpolate.interpolateHcl)
}
export default getColorMap
