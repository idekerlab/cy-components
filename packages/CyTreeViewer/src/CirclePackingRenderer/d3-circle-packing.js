import * as d3Selection from 'd3-selection'
import * as d3Zoom from 'd3-zoom'

import getColorMap, { blueMap, redMap } from './colormap-generator'
import getSvg from './svg-container-factory'
import getTooltip from './tooltip-factory'
import layoutTree from './layout-tree'

let colorMapper = null
const MARGIN = 50
const MAX_DEPTH = 3
const ZOOM_TH_1 = 4.0

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

let searchResults = []
let blueMapper = null
let redMapper = null

let expandDepth = 1

let trans = {}

let lastHighlight = null

const MIN_RADIUS = 4
const DEF_SCALE_FACTOR = 1.0

const initializeColorMaps = (rootColor, leafColor) => {
  colorMapper = getColorMap(rootColor, leafColor)

  // Optional mappers
  blueMapper = blueMap()
  redMapper = redMap()
}

/**
 * Main function to generate circle packing
 *
 */
const CirclePacking = (tree, svgTree, w, h, originalProps) => {
  if (tree === null || tree === undefined) {
    return
  }

  const t0 = performance.now()
  props = originalProps
  const leafColor = props.rendererOptions.leafColor
  const rootColor = props.rendererOptions.rootColor
  initializeColorMaps(rootColor, leafColor)

  tooltip = getTooltip()
  svg = getSvg(svgTree, w, h).style('background', '#FFFFFF')

  diameter = +svg.attr('height')

  const t01 = performance.now()

  root = layoutTree(tree, diameter, MARGIN)
  props.setHierarchy(root)

  let nodes = root.children
  nodeCount = nodes.length

  currentNodes = nodes
  focus = root

  // Base setting.
  g = svg.append('g')

  const zoomed2 = () => {
    trans = d3Selection.event.transform

    if (selectedGroups) {
      if (trans.k > ZOOM_TH_1) {
        selectedGroups.attr('r', d => d.r)
      } else {
        selectedGroups.attr('r', d => calcRadius(d))
      }
    }
    g.attr('transform', trans)
  }

  zoom2 = d3Zoom
    .zoom()
    .scaleExtent([1 / 10, 500])
    .on('zoom', zoomed2)

  svg.call(zoom2).on('dblclick.zoom', null)

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

  expand(root)
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

  const filtered = root.children.filter(d => {
    const labelSize = getFontSize(d)

    if (
      d.parent !== null &&
      selectedSubsystem !== null &&
      d.parent === selectedSubsystem
    ) {
      if (d !== selectedSubsystem && labelSize > 3) {
        return true
      } else if (d.parent === selectedSubsystem) {
        return true
      }
    }

    if (labelSize < 3) {
      return false
    } else {
      if (d.depth === 1) {
        // Special case: showing search result
        if (searchResults.length !== 0 && checkParents(selectedSubsystem, d)) {
          return false
        }
        // Check direct parent or not
        const allChildren = new Set(d.descendants())
        return !allChildren.has(newFocus)
      }
    }

    return false
  })

  // Add direct children
  const children = selectedSubsystem.children

  if (children !== undefined) {
    const numChildren = children.length
    children.forEach(child => {
      if (child.height !== 0) {
        filtered.push(child)
      } else if (numChildren < 100) {
        filtered.push(child)
      }
    })
    // const parent = selectedSubsystem.parent
    // if (parent !== undefined && parent !== null) {
    //   const children = parent.children
    //   children.forEach(child => {
    //     if (child !== selectedSubsystem && child !== parent) {
    //       if (child.height !== 0) {
    //         filtered.push(child)
    //       } else if (numChildren < 100) {
    //         filtered.push(child)
    //       }
    //     }
    //   })
    // }
  } else {
    // Leaf node
    const parent = selectedSubsystem.parent
    if (parent !== undefined) {
      const children = parent.children
      children.forEach(child => {
        if (child !== selectedSubsystem && child !== parent) {
          filtered.push(child)
        }
      })
    }
  }
  if (selectedSubsystem.height === 0) {
    filtered.push(selectedSubsystem)
  }

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

/**
 * Check path to the target node.
 * If there is one, return true.
 *
 * @param current
 * @param target
 * @returns {boolean}
 */
const checkParents = (current, target) => {
  if (current === target) {
    return true
  }

  const parent = current.parent
  if (parent === undefined || parent === null) {
    return false
  }

  return checkParents(parent, target)
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

const buildData = dOriginal => {
  if (dOriginal === root) {
    return root.descendants().filter(node => node.depth < expandDepth + 1)
  }

  let d = dOriginal

  // Filter higher level terms
  //    - Add only to the specified depth
  let newNodes = root.descendants().filter(child => {
    if (child.depth < expandDepth + 1) {
      return true
    }
    if (child.parent !== null && d.parent !== null) {
      if (d.parent === child.parent) {
        return true
      }
      if (child === d.parent) {
        return true
      }
    }
    return false
  })

  if (d.children === undefined) {
    // Special case: leaf nodes (no children)
    // For these, add parent and grand parent
    const parent = d.parent
    const grandParent = parent.parent
    if (grandParent !== undefined && grandParent !== null) {
      newNodes.push(grandParent)
      grandParent.children.forEach(child => newNodes.push(child))
    }
    newNodes.push(parent)

    // Add subsystems in the same group
    parent.children.forEach(child => newNodes.push(child))
  }
  // Add self
  newNodes.push(d)

  // Add all direct children
  if (d.children !== undefined) {
    d.children.forEach(child => {
      newNodes.push(child)
    })
  }

  return newNodes
}

const expand = (d, i, nodes) => {
  selectedSubsystem = d
  const t002 = performance.now()
  const newNodes = buildData(d)

  addCircles(g, newNodes, d)
  addLabels(g, newNodes, d)

  // Reset sub-selection
  // subSelected.forEach(v => {
  //   v.classed('node-selected-sub', false)
  // })
  // subSelected.clear()

  if (focus !== d || !focus.parent) {
    zoom(d)
    if (d3Selection.event !== undefined && d3Selection.event !== null) {
      d3Selection.event.stopPropagation()
    }
  }
}

const expandSearchResult = results => {
  // let newNodes = root.descendants()
  const newNodes = addSearchResults(results, root)
  // newNodes = newNodes.concat(extra)

  addCircles(g, newNodes, root)
  addLabels(g, newNodes, root)

  //////////////////TEST TODO: remove this
  // paintSelectedNodes(selectedGroups)

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

const addSearchResults = results => {
  const selectedSet = new Set(results)

  const allNodes = root.descendants()
  let idx = allNodes.length
  let newNodes = []
  newNodes.push(root)

  while (idx--) {
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
  while (idx--) {
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

      // Repaint selected
      selectNodes(searchResults)
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

      if (data.props.BlueNodes) {
        return blueMapper(d.depth)
      } else if (data.props.RedNodes) {
        return redMapper(d.depth)
      }
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
  props.eventHandlers.selectNode(d.data.id, d.data.data.props, true, d)
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

const handleMouseOver = (d, i, nodes, props) => {
  const parent = d.parent
  if (parent === selectedSubsystem) {
    props.eventHandlers.hoverOnNode(d.data.id, d.data.data, d.parent)
  }
}

const handleMouseOut = (d, props) => {
  const parent = d.parent

  if (parent === selectedSubsystem) {
    props.eventHandlers.hoverOutNode(d.data.id, d.data.data.props)
  }
}

const showTooltip = (div, node) => {
  const label = node.data.data.Label
  const name = node.data.data.props.name
  let parentNode = node.parent

  let parent = null
  if (parentNode) {
    parent = parentNode.data.data.Label
  }

  let text = name + '</br><strong>' + label + '</strong>'
  if (parent !== null) {
    text = text + '</br>(Child of ' + parent + ')'
  }

  div.style('opacity', 0.9)
  div
    .html(
      '<div style="font-size: 1em; padding-bottom: 0.5em; line-height: 1.1em; color: #222222">' +
        text +
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
export const selectNodes = (id2color, fillColor = 'red') => {
  if (id2color === null || id2color === undefined || id2color.size === 0) {
    return
  }

  const selected = Array.from(id2color.keys())
  searchResults = selected
  const selectedCircles = selected
    .map(id => '#c' + id)
    .reduce(
      (previousValue, currentValue, index, array) =>
        previousValue + ', ' + currentValue
    )

  expandSearchResult(selected)

  selectedGroups = d3Selection.selectAll(selectedCircles)

  selectedGroups
    .style('fill', d => id2color.get(d.data.id))
    .style('display', 'inline')
    .attr('r', d => (trans.k > ZOOM_TH_1 ? d.r : calcRadius(d)))

  // Show labels
  const selectedLabels = selected
    .map(id => '#l' + id)
    .reduce(
      (previousValue, currentValue, index, array) =>
        previousValue + ', ' + currentValue
    )
  d3Selection
    .selectAll(selectedLabels)
    .style('font-size', d => labelSizeMap.get(d.data.id))
    .style('display', 'inline')
    .style('fill', '#FFFFFF')
}

const calcRadius = (d, scaleFactor = DEF_SCALE_FACTOR) => {
  const radius = d.r

  if (radius < MIN_RADIUS) {
    return MIN_RADIUS * scaleFactor
  } else {
    return radius * scaleFactor
  }
}

const clearHighlight = id2color => {
  if (lastHighlight) {
    lastHighlight
      .style('fill', d => id2color.get(d.data.id))
      .style('display', 'inline')
      .attr('r', d => (trans.k > ZOOM_TH_1 ? d.r : calcRadius(d)))
  }
}

export const highlightNode = (selected, id2color) => {
  // Set back to original selected color
  clearHighlight(id2color)

  if (selected === null || selected === undefined) {
    // Null means no highlight is necessary
    return
  }

  let selectedCircle = '#c' + selected
  if (selected instanceof Array) {
    selectedCircle = selected.map(id => '#c' + id).join(',')
  }

  const highlight = d3Selection.selectAll(selectedCircle)

  if (!highlight) {
    return
  }

  highlight
    .style('fill', d => id2color.get(d.data.id))
    .style('display', 'inline')
    .attr('r', d => (trans.k > ZOOM_TH_1 ? d.r : calcRadius(d, 2)))
  lastHighlight = highlight
}

export const fit = () => {
  currentDepth = MAX_DEPTH
  const trans = d3Zoom.zoomIdentity.translate(0, 0).scale(1)
  svg.call(zoom2.transform, trans)
  zoom(root)
}

export const changeDepth = depth => {
  expandDepth = depth
  expand(root)
  zoom(root)
  if (d3Selection.event !== undefined && d3Selection.event !== null) {
    d3Selection.event.stopPropagation()
  }
}

export const changeColor = (rootColor, leafColor) => {
  initializeColorMaps(rootColor, leafColor)
  expand(root)
  zoom(root)
  if (d3Selection.event !== undefined && d3Selection.event !== null) {
    d3Selection.event.stopPropagation()
  }
}

/**
 * Clear extra circles and highlights
 */
export const clear = () => {
  if (selectedGroups === null) {
    return
  }
  selectedGroups
    .data([])
    .exit()
    .remove()
  selectedGroups = null
  searchResults = []
}

export default CirclePacking
