import * as d3Scale from 'd3-scale'
import * as d3Color from 'd3-color'
import * as d3Interpolate from 'd3-interpolate'
import * as d3ScaleChromatic from 'd3-scale-chromatic'

const COLOR_RANGE = [d3Color.hsl('#FAFAFA'), d3Color.hsl('#AAAAAA')]
// const COLOR_RANGE = [d3Color.hsl('steelblue'), d3Color.hsl('#00C8F4')]
const DEF_DOMAIN = [0, 7]

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
    .range(COLOR_RANGE)
    .interpolate(d3Interpolate.interpolateHcl)

  // return d3Scale.scaleSequential(d3ScaleChromatic.interpolateGreys).domain(domain)
}

const redMap = domain =>
  d3Scale.scaleSequential(d3ScaleChromatic.interpolateReds).domain([-1, 5])
const blueMap = domain =>
  d3Scale.scaleSequential(d3ScaleChromatic.interpolateBlues).domain([-1, 5])

export { blueMap, redMap }

export default getColorMap
