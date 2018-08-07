import React, { Component } from 'react'
import * as d3Selection from 'd3-selection'
import * as d3Scale from 'd3-scale'
import * as d3Interpolate from 'd3-interpolate'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Transition from 'd3-transition'
import * as d3Color from 'd3-color'
import * as d3Array from 'd3-array'
import * as d3Shape from 'd3-shape'

const COLOR_RANGE = [d3Color.hsl('steelblue'), d3Color.hsl('darkturquoise')]

const HANDLE_COLOR = '#626262'

const FONT_SIZE = 20

class ColorBar extends Component {

  state = {
    step: 0
  }
  componentDidMount() {

    const treeHeight = this.props.tree.height
    const step = (this.props.height - (FONT_SIZE *4))/treeHeight

    console.log(step)
    Gradient(this.bar, this.props.width, this.props.height, step, this.props.depth)
  }


  render() {
    return <div ref={bar => (this.bar = bar)} />
  }
}

const Gradient = (tag, barWidth = 20, areaHeight = 800, step, currentDepth) => {
  const g = d3Selection
    .select(tag)
    .append('svg')
    .attr('width', 150)
    .attr('height', areaHeight)
    .attr('class', 'color-bar')
    .append('g')

  const barHeight = areaHeight - (FONT_SIZE * 4)

  const colorScale = d3Scale
    .scaleLinear()
    .domain([0, barHeight])
    .range(COLOR_RANGE)
    .interpolate(d3Interpolate.interpolateHcl)

  const bars = g
    .selectAll('.bars')
    .data(d3Array.range(barHeight), function(d) {
      return d
    })
    .enter()
    .append('rect')
    .attr('class', 'bars')
    .attr('y', function(d, i) {
      return i
    })
    .attr('x', 10)
    .attr('height', 1)
    .attr('width', barWidth)
    .attr('stroke', 0)
    .style('fill', function(d, i) {
      return colorScale(d)
    })
    .attr('transform', 'translate(0,' +(FONT_SIZE) + ')')

  const labels = ['Cell', 'Genes']
  const text = g
    .selectAll('text')
    .data(labels)
    .enter()
    .append('text')
    .style('fill', '#424242')
    .style('text-anchor', 'middle')
    .style('font-size', 14)

    .attr('class', 'legend-label')
    .attr('x', barWidth + 2)
    .attr('y', function(d, i) {
      console.log(i)
      if(i === 0) {
        return 12
      } else {
        return barHeight + (FONT_SIZE*2)
      }
    })
    .text(d => d)

  const handleShape = d3Shape.symbolTriangle
  const symbol = d3Shape.symbol().size([150])
  const handle = g
    .append('path')
    .attr('d', symbol.type(handleShape))
    .attr('transform', (shape, i) => 'translate(45,' + (currentDepth*step)+') rotate(-90)')
    .style("fill", HANDLE_COLOR)
    .attr('class', 'handle')

  const depthBar = g
    .append('rect')
    .attr('class', 'depth-bar')
    .attr('y', (currentDepth*step))
    .attr('x', 10)
    .attr('height', 3)
    .attr('width', barWidth)
    .style('fill', HANDLE_COLOR)
}

export default ColorBar
