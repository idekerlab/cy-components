import * as d3Selection from 'd3-selection'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Zoom from 'd3-zoom'

import getColorMap from './colormap-generator'
import getSvg from './svg-container-factory'
import getTooltip from './tooltip-factory'
import getRoot from './hierarchy-factory'

let colorMapper = null
const MARGIN = 50
const MAX_DEPTH = 3

// TODO: Manage these states in React way
let currentDepth = 0

let height = 0
let width = 0
let g
let treeHeight = 0

let props
let focus
let view

let node

let diameter

let circle

let circleNodes
let labels

let root
let rootNode

let selectedCircle
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

/**
 * Main function to generate circle packing
 *
 */
const CirclePacking = (tree, svgTree, width1, height1, originalProps) => {
  // For performance checking
  const t0 = performance.now()
  console.log('============ D3 CC start======================:')

  props = originalProps

  colorMapper = getColorMap(
    props.rendererOptions.rootColor,
    props.rendererOptions.leafColor
  )

  tooltip = getTooltip()
  svg = getSvg(svgTree, width1, height1).style('background', '#FFFFFF')

  width = width1
  height = height1

  diameter = +svg.attr('height')

  const t01 = performance.now()
  // Generate tree and get the root node
  root = getRoot(tree)
  console.log('@GetRoot:', performance.now() - t01)

  // This is the height of the main tree
  treeHeight = root.height

  // Set initial focus to the root
  focus = root

  // Get all children
  const pack = d3Hierarchy
    .pack()
    .size([diameter - MARGIN, diameter - MARGIN])
    .padding(1)

  // Perform Circle Packing layout
  // TODO: externalize this (Node.js Server)
  const t03 = performance.now()
  rootNode = pack(root.sum(d => d.data.value))
  console.log('@Calc packing:', performance.now() - t03)

  // Filter nodes: pick only 1st children
  let nodes = rootNode.children

  // let nodes = rootNode.children
  console.log('* D3 prepare & layout total:', performance.now() - t0)
  nodeCount = nodes.length

  currentNodes = nodes
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
  expand(rootNode)
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

const addLabels = (container, data) => {
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
      }
    }

    if (labelSize < 4) {
      return false
    } else {
      if (d.depth === 1) {
        return true
      }
    }

    return false
  })
  const currentLabels = container.selectAll('text').data(filtered)

  currentLabels.exit().remove()

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

const expand = (d, i, nodes) => {
  selectedSubsystem = d

  const t001 = performance.now()

  console.log('*** Expand start:')
  if (selectedCircle !== undefined) {
    selectedCircle.classed('node-selected', false)
  }

  // Reset sub-selection
  subSelected.forEach(v => {
    v.classed('node-selected-sub', false)
  })
  subSelected.clear()

  // Change border
  if (nodes !== undefined) {
    selectedCircle = d3Selection.select(nodes[i])
    selectedCircle.classed('node-selected', true)
  }
  console.log('* Expand add class:', performance.now() - t001)

  g.selectAll('circle')
    .data([])
    .exit()
    .remove()
  g.selectAll('text')
    .data([])
    .exit()
    .remove()

  const t002 = performance.now()
  let newNodes = rootNode.descendants().filter(node => {
    if(node.depth < 2) {
      return true
    }
    return false
  })
  newNodes.push(d)

  d.children.forEach(child => {
    newNodes.push(child)
  })

  addCircles(g, newNodes)
  addLabels(g, newNodes)
  console.log('* AddLabel and circle:', performance.now() - t002)

  if (focus !== d || !focus.parent) {
    focus = d


    if(d !== rootNode) {
      props.eventHandlers.selectNode(d.data.id, d.data.data.props, true)
    }

    if (d3Selection.event !== undefined && d3Selection.event !== null) {
      d3Selection.event.stopPropagation()
    }
  }
}

const addCircles = (container, data) => {
  d3circles = g.selectAll('circle').data(data)
  const result = d3circles
    .enter()
    .append('circle')
    .attr('id', d => 'c' + d.data.id)
    .attr('class', d => {
      return d.parent ? (d.children ? 'node' : 'node node--leaf') : 'node'
    })
    // .attr('r', function(d) {
    //   return d.r
    // })
    // .attr('cx', d => d.x)
    // .attr('cy', d => d.y)
    // .style('fill', function (d) {
    //   const data = d.data.data
    //
    //   // // This is a hidden node.
    //   // if (data.props.Hidden === true) {
    //   //   if (data.NodeType !== 'Gene') {
    //   //     return 'orange'
    //   //     // } else {
    //   //     //   return '#238b45'
    //   //   }
    //   // }
    //
    //   if (d.children) {
    //     return colorMapper(d.depth)
    //   } else {
    //     if (data.NodeType !== 'Gene') {
    //       return colorMapper(d.depth)
    //     }
    //
    //     return 'rgba(255, 255, 255, 0.8)'
    //   }
    // })
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

      console.log('DBL handler:', d)
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

  result
    .style('fill', function(d) {
      const data = d.data.data
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

  d3circles.exit().remove()

  console.log('d3c2:', result)

  return result
}

const selectCurrentNodes = (nodes, type) => {
  const nodeIds = nodes.map(node => '#' + type + node.data.id).join(', ')
  return d3Selection.selectAll(nodeIds)
}

const shouldDisplay = d => {
  currentDepth = focus.depth

  const nodeType = d.data.data.NodeType
  const dataDepth = d.depth

  // console.log('d and focus parent', d, focus.parent)
  if (
    d === focus ||
    focus === d.parent ||
    focus.parent === d.parent ||
    d === focus.parent
  ) {
    return 'inline'
  }

  if (dataDepth <= 1 && nodeType !== 'Gene') {
    return 'inline'
  }

  // if(currentDepth > dataDepth) {
  //   if(nodeType !== 'Gene' && dataDepth < 3) {
  //     return 'inline'
  //   }
  // }

  return 'none'
}

const zoom = d => {
  // Update current focus

  // labels
  //   .attr('y', d => getFontSize(d) / 2)
  //   .style('display', d => {
  //     const nodeType = d.data.data.NodeType
  //
  //     // Avoid showing
  //     // if (d === focus && d.height !== 0) {
  //     //   return 'none'
  //     // }
  //
  //     // if (d === focus) {
  //     //   return 'inline'
  //     // }
  //
  //     if (focus === d.parent || (focus.parent === d.parent && d !== focus)) {
  //       return 'inline'
  //     }
  //
  //     return 'none'
  //
  //     // if (focus.children !== undefined && focus.children.length < 100) {
  //     //   if (
  //     //     d.parent === focus ||
  //     //     (focus.parent === d.parent && d.parent.depth === focus.parent.depth)
  //     //   ) {
  //     //     return 'inline'
  //     //   } else {
  //     //     return 'none'
  //     //   }
  //     // } else {
  //     //   const size = labelSizeMap.get(d.data.id)
  //     //   if (
  //     //     size > sizeTh &&
  //     //     (d.parent === focus ||
  //     //       (focus.parent === d.parent &&
  //     //         d.parent.depth === focus.parent.depth))
  //     //   ) {
  //     //     return 'inline'
  //     //   } else {
  //     //     return 'none'
  //     //   }
  //     // }
  //
  //     // if (d.parent !== focus) {
  //     //   return 'none'
  //     // }
  //   })
  //   .style('font-size', d => getFontSize(d))
  //
  // circleNodes
  //   .style('display', 'inline')
  //   // .style('display', d => {
  //   //   return shouldDisplay(d)
  //   // })
  //   .attr('r', d => d.r)
  //
  // // if (
  // //   focus.parent === d ||
  // //   (focus.parent === d.parent && d.parent.depth === focus.parent.depth)
  // // ) {
  // //   return 'inline'
  // // }
  // //
  // // if (
  // //   d.parent === focus ||
  // //   (currentDepth >= d.depth && d.height >= 1 && d.depth <= 1)
  // // ) {
  // //   return 'inline'
  // // } else {
  // //   return 'none'
  // // }
  // // })

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
        console.log('FIRE##################,')
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
        console.log('FIRE##################out,')
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

  selectedGroups = d3Selection.selectAll(selectedCircles)
  selectedGroups
    .style('fill', fillColor)
    .style('display', 'inline')
    .attr('r', d => {
      const radius = d.r
      console.log('Selected radius = ', d.r)
      if (radius < 10) {
        return 10
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
