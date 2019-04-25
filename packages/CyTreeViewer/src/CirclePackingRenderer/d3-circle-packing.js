import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'

import getColorMap from './colormap-generator'
import getSvg from './svg-container-factory'
import getTooltip from './tooltip-factory'
import layoutTree from './layout-tree'

let colorMapper = null
const MARGIN = 50
const MAX_DEPTH = 3

// TODO: Manage these states in React way
let currentDepth = 0

let g

let props
let focus
let view

let node

let diameter

let circle

let circleNodes
let labels

let root

let subSelected = new Map()
let selectedSubsystem = null

let nodeCount = 0

let sizeTh = 0

const labelSizeMap = new Map()

let svg = null
let tooltip = null
let zoom2 = null

let currentNodes = []
let d3circles = null


let selectedCircles = []

/**
 * Main function to generate circle packing
 *
 */
const CirclePacking = (tree, svgTree, w, h, originalProps) => {
  const t0 = performance.now()
  console.log('============ D3 CC start======================:')

  props = originalProps

  colorMapper = getColorMap(
    props.rendererOptions.rootColor,
    props.rendererOptions.leafColor
  )

  tooltip = getTooltip()
  svg = getSvg(svgTree, w, h).style('background', '#FFFFFF')

  diameter = +svg.attr('height')

  const t01 = performance.now()

  root = layoutTree(tree, diameter, MARGIN)
  let nodes = root.children
  nodeCount = nodes.length

  currentNodes = nodes
  focus = root

  console.log('@Calc packing:', performance.now() - t01)

  // Base setting.
  g = svg.append('g')

  const t02 = performance.now()
  const zoomed2 = () => {
    g.attr('transform', d3Selection.event.transform)
  }

  zoom2 = d3Zoom
    .zoom()
    .scaleExtent([1 / 10, 500])
    .on('zoom', zoomed2)

  svg.call(zoom2).on('dblclick.zoom', null)

  console.log('* Zoom time:', performance.now() - t02)

  // Now label map is available.
  const labelSizes = [...labelSizeMap.values()]
  const sorted = labelSizes.sort((a, b) => a - b)

  sizeTh = sorted[Math.floor(sorted.length * 0.85)]

  const labelTargets = selectCurrentNodes(root.children, 'l')

  labelTargets
    .style('display', d => {
      const size = labelSizeMap.get(d.data.id)

      if (size > sizeTh) {
        return 'inline'
      } else {
        return 'none'
      }
    })
    .style('font-size', d => labelSizeMap.get(d.data.id))

  node = g.selectAll('circle,text')
  circleNodes = g.selectAll('circle')
  labels = g.selectAll('.label')

  const t04 = performance.now()
  expand(root)
  console.log('* EXPAND time:', performance.now() - t04)

  console.log('D3 Initial layout total:', performance.now() - t0)
}

const getFontSize = d => {
  const txt = d.data.data.Label
  const textLen = txt.length

  let size = 10
  if (textLen <= 5) {
    size = (d.r * 2) / textLen
  } else {
    size = (d.r * 3) / textLen
  }

  return size
}

const createSizeMap = d => {
  const size = getFontSize(d)
  labelSizeMap.set(d.data.id, size)
  return size
}

const addLabels = (container, data, newFocus) => {
  // Remove everything first
  g.selectAll('text')
    .data([])
    .exit()
    .remove()

  // Size filter: do not show small labels
  const filtered = data.filter(d => {
    const labelSize = getFontSize(d)
    // console.log(labelSize)

    if (
      d.parent !== null &&
      selectedSubsystem !== null &&
      d.parent === selectedSubsystem
    ) {
      // console.log('parent and selected system = ', d.parent, selectedSubsystem)
      if (d !== selectedSubsystem && labelSize > 0.6) {
        return true
      } else if (d.parent === selectedSubsystem) {
        return true
      }
    }

    if (labelSize < 4) {
      return false
    } else {
      if (d.depth === 1) {
        // Check direct parent or not
        const allChilsren = new Set(d.descendants())

        if (allChilsren.has(newFocus)) {
          return false
        } else {
          return true
        }
      }
    }

    return false
  })
  const currentLabels = container.selectAll('text').data(filtered)

  return currentLabels
    .enter()
    .append('text')
    .attr('id', d => 'l' + d.data.id)
    .attr('class', 'label')
    .style('fill', d => getLabelColor(d))
    .style('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .text(d => d.data.data.Label)
    .style('font-size', d => createSizeMap(d))
}

const getLabelColor = d => {
  const data = d.data.data

  if (data.NodeType === 'Gene') {
    return '#222222'
  }
  // This is a hidden node.
  if (data.props.Hidden === true) {
    return '#222222'
  } else if (d.depth > 3) {
    return '#393939'
  } else {
    return '#FFFFFF'
  }
}

const buildData = d => {

  let newNodes = root.descendants().filter(node => {
    if (node.depth < 2) {
      return true
    }

    if(node.parent !== null && d.parent !== null) {
      if(d.parent === node.parent) {
        return true
      }

      if(node === d.parent) {
        return true
      }
    }

    return false
  })
  newNodes.push(d)

  if (d.children !== undefined) {
    d.children.forEach(child => {
      newNodes.push(child)
    })
  }

  // if (d.parent !== null && d.parent.parent !== null) {
  //   d.parent.parent.children.forEach(child => {
  //     newNodes.push(child)
  //   })
  // }


  return newNodes
}

const expand = (d, i, nodes) => {
  selectedSubsystem = d

  console.log('*** Expand start ***')
  const t002 = performance.now()

  const newNodes = buildData(d)
  addCircles(g, newNodes, d)
  addLabels(g, newNodes, d)

  // Reset sub-selection
  // subSelected.forEach(v => {
  //   v.classed('node-selected-sub', false)
  // })
  // subSelected.clear()

  console.log('* AddLabel and circle:', performance.now() - t002)

  if (focus !== d || !focus.parent) {
    zoom(d)
    if (d3Selection.event !== undefined && d3Selection.event !== null) {
      d3Selection.event.stopPropagation()
    }
  }
}

const expandSearchResult = (results) => {

  // let newNodes = root.descendants()
  const newNodes = addSearchResults(results, root)
  // newNodes = newNodes.concat(extra)

  addCircles(g, newNodes, root)
  addLabels(g, newNodes, root)

  // Reset sub-selection
  // subSelected.forEach(v => {
  //   v.classed('node-selected-sub', false)
  // })
  // subSelected.clear()


  // if (focus !== d || !focus.parent) {
  //   zoom(selectedSubsystem)
  //   if (d3Selection.event !== undefined && d3Selection.event !== null) {
  //     d3Selection.event.stopPropagation()
  //   }
  // }
}

const addSearchResults = (results) => {

  const selectedSet = new Set(results)

  const allNodes = root.descendants()
  let idx = allNodes.length
  let newNodes = []
  newNodes.push(root)


  while(idx--) {
    const node = allNodes[idx]
    if (node.depth === 1) {
      newNodes.push(node)
    }
  }

  // Add selected ones
  newNodes.push(selectedSubsystem)
  if (selectedSubsystem.children !== undefined) {
    selectedSubsystem.children.forEach(child => {
      newNodes.push(child)
    })
  }

  idx = allNodes.length
  while(idx--) {
    const node = allNodes[idx]
    const nodeId = node.data.data.id
    if (selectedSet.has(nodeId)) {
      // console.log('Found:', nodeId)
      newNodes.push(node)
    }
  }
  return newNodes
}

const addCircles = (container, data, newFocus) => {
  g.selectAll('circle')
    .data([])
    .exit()
    .remove()

  d3circles = svg
    .select('g')
    .selectAll('circle')
    .data(data)

  d3circles
    .enter()
    .append('circle')
    .attr('id', d => 'c' + d.data.id)
    .attr('class', d => {
      return d.parent ? (d.children ? 'node' : 'node node--leaf') : 'node'
    })
    .classed('node-selected', d => {
      return d === newFocus
    })
    .on('click', (d, i, nodes) => {
      if (d === undefined) {
        return
      }
      hideTooltip(tooltip)
    })
    .on('dblclick', (d, i, nodes) => {
      if (d === undefined) {
        return
      }
      hideTooltip(tooltip)
      expand(d, i, nodes)
    })
    .on('mouseover', (d, i, nodes) => {
      showTooltip(tooltip, d)
      handleMouseOver(d, i, nodes, props)
    })
    .on('mouseout', (d, i, nodes) => {
      hideTooltip(tooltip)
      handleMouseOut(d, props)
    })
    .on('contextmenu', (d, i, nodes) => {
      if (d === undefined) {
        return
      }

      if (d3Selection.event.ctrlKey) {
        d3Selection.event.preventDefault()

        // CTR-Click means multiple selection in the current circle.
        const newSelection = d3Selection.select(nodes[i])

        // ID of new Circle (subsystem)
        const newId = d.data.id

        // Toggle selection.
        if (subSelected.has(newId)) {
          subSelected.delete(newId)

          newSelection.classed('node-selected-sub', false)
          props.eventHandlers.deselectNode(newId, d.data.data.props)

          return
        } else {
          // New selection
          subSelected.set(newId, newSelection)
          newSelection.classed('node-selected-sub', true)

          // Call action to select nodes in the view

          // props.eventHandlers.selectNode(d.data.id, d.data.data.props, false)
        }

        props.eventHandlers.selectNodes(d.data.id, d.data.data.props)
      }
    })
    .style('fill', function(d) {
      const data = d.data.data
      return colorMapper(d.depth)
      if (d.children) {
        return colorMapper(d.depth)
      } else {
        if (data.NodeType !== 'Gene') {
          return colorMapper(d.depth)
        }
        return 'rgba(255, 255, 255, 0.8)'
      }
    })
    .attr('r', d => d.r)
    .attr('cx', d => d.x)
    .attr('cy', d => d.y)

  return d3circles
}

const selectCurrentNodes = (nodes, type) => {
  const nodeIds = nodes.map(node => '#' + type + node.data.id).join(', ')
  return d3Selection.selectAll(nodeIds)
}

const zoom = d => {
  // Update current focus
  focus = d
  if (d !== root) {
    setTimeout(() => {
      props.eventHandlers.selectNode(d.data.id, d.data.data.props, true)
    }, 2)
  }
}

const zoomTo = v => {
  const k = diameter / v[2]

  view = v
  node.attr(
    'transform',
    d => 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')'
  )

  circle.attr('r', d => d.r * k)
}

let running = false
const handleMouseOver = (d, i, nodes, props) => {
  const parent = d.parent

  if (parent === selectedSubsystem) {
    setTimeout(() => {
      if (running) {
        return
      } else {
        running = true
        props.eventHandlers.hoverOnNode(d.data.id, d.data.data, d.parent)
        running = false
      }
    }, 2)
  }
}

const handleMouseOut = (d, props) => {
  const parent = d.parent

  if (parent === selectedSubsystem) {
    setTimeout(() => {
      if (running) {
        return
      } else {
        running = true
        props.eventHandlers.hoverOutNode(d.data.id, d.data.data.props)
        running = false
      }
    }, 2)
  }
}

const showTooltip = (div, node) => {
  // console.log('TP active:', node)
  const label = node.data.data.Label
  let parentNode = node.parent

  let parent = 'N/A'
  if (parentNode) {
    parent = parentNode.data.data.Label
  }

  div.style('opacity', 0.9)
  div
    .html(
      '<div style="font-size: 1.3em; padding-bottom: 0.5em; line-height: 1.1em; color: #222222">' +
        label +
        '</div>'
    )
    .style('left', d3Selection.event.pageX + 30 + 'px')
    .style('top', d3Selection.event.pageY - 30 + 'px')
}

const hideTooltip = div => {
  div.style('opacity', 0)
}

let selectedGroups = null

/**
 * Show selection by changing color and size
 *
 * @param selected
 * @param fillColor
 */
export const selectNodes = (selected, fillColor = 'red') => {
  if (selected === null || selected === undefined || selected.length === 0) {
    return
  }

  const selectedCircles = selected
    .map(id => '#c' + id)
    .reduce(
      (previousValue, currentValue, index, array) =>
        previousValue + ', ' + currentValue
    )

  expandSearchResult(selected)

  selectedGroups = d3Selection.selectAll(selectedCircles)

  selectedGroups
    .style('fill', fillColor)
    .style('display', 'inline')
    .attr('r', d => {
      const radius = d.r
      if (radius < 6) {
        return 6
      } else {
        return radius
      }
    })

  // Show labels
  const selectedLabels = selected
    .map(id => '#l' + id)
    .reduce(
      (previousValue, currentValue, index, array) =>
        previousValue + ', ' + currentValue
    )
  d3Selection
    .selectAll(selectedLabels)
    .style('font-size', 9)
    .style('display', 'inline')
    .style('fill', '#FFFFFF')
}

let lastHighlight = null

export const highlightNode = (selected, fillColor = 'yellow') => {
  if (selected === null || selected === undefined) {
    return
  }

  if(lastHighlight) {
    lastHighlight
      .style('fill', 'red')
      .style('display', 'inline')
      .attr('r', d => {
        const radius = d.r
        if (radius < 6) {
          return 6
        } else {
          return radius
        }
      })
  }

  const selectedCircle = '#c' + selected
  const highlight = d3Selection.selectAll(selectedCircle)

  if(!highlight) {
    return
  }

  highlight
    .style('fill', fillColor)
    .style('display', 'inline')
    .attr('r', d => {
      const radius = d.r
      if (radius < 6) {
        return 10
      } else {
        return radius * 1.5
      }
    })
  lastHighlight = highlight
}

export const fit = () => {
  currentDepth = MAX_DEPTH
  const trans = d3Zoom.zoomIdentity.translate(0, 0).scale(1)

  svg.call(zoom2.transform, trans)

  zoom(root)
}

export const clear = () => {
  if (selectedGroups === null) {
    return
  }

  selectedGroups.style('fill', function(d) {
    const data = d.data.data

    // This is a hidden node.
    if (data.props.Hidden === true) {
      if (data.NodeType !== 'Gene') {
        return '#DDDDDD'
      }
    }

    if (d.children) {
      return colorMapper(d.depth)
    } else {
      if (data.NodeType !== 'Gene') {
        return colorMapper(d.depth)
      }
      return 'rgba(255, 255, 255, 0.3)'
    }
  })
}

export default CirclePacking
