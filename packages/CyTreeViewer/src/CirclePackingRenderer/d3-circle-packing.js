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

let node

let diameter

let circle

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

let lastRootColor = '#CCCCCC'
let lastLeafColor = '#FFFFFF'

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

  props = originalProps
  const leafColor = props.rendererOptions.leafColor
  const rootColor = props.rendererOptions.rootColor
  lastRootColor = rootColor
  lastLeafColor = leafColor

  initializeColorMaps(rootColor, leafColor)

  tooltip = getTooltip()
  svg = getSvg(svgTree, w, h).style('background', '#FFFFFF')

  diameter = +svg.attr('height')

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
  // circleNodes = g.selectAll('circle')
  // labels = g.selectAll('.label')

  expand(root)
}

const getFontSize = d => {
  const txt = d.data.data.Label
  const textLength = txt.length
  const words = txt.split(' ')
  const numWords = words.length
  const radius = d.r
  const width = radius * 2

  if(numWords === 1) {
    return (width / textLength) * 1.3
  } else if(numWords < 4) {
    return (width / textLength) * 3
  } else {
    return (width / textLength) * 5.5
  }
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

  const isPath = (d, selected) => {
    if (d.depth > selected.depth + 1) {
      return false
    }

    const parent = selected.parent
  }
  const filtered = root.children.filter(d => {
    const labelSize = getFontSize(d)

    if (d.parent !== null && selectedSubsystem !== null && d.parent === selectedSubsystem) {
      if (d !== selectedSubsystem) {
        return true
      } else if (d.parent === selectedSubsystem) {
        return true
      }
      // } else if(d.parent !== null &&
      //   selectedSubsystem !== null && d.parent === selectedSubsystem.parent) {
      //   // const allChildren = new Set(selectedSubsystem.parent.descendants())
      //   // return allChildren.has(d)
      //   return true
    }

    // if (labelSize < 3) {
    //   return false
    // } else {
    if (d.depth === 1) {
      // Special case: showing search result
      if (searchResults.length !== 0 && checkParents(selectedSubsystem, d)) {
        return false
      }
      // Check direct parent or not
      const allChildren = new Set(d.descendants())
      return !allChildren.has(newFocus)
    }
    // }

    return false
  })

  // Add direct children and neighbors
  const LABEL_TH = 200

  const pathNodes = new Set()
  const scan = (ancestors, node) => {
    if (node === null || node === undefined) {
      return ancestors
    }
    const parent = node.parent
    if (parent === root || parent === null) {
      return ancestors
    }

    const { children } = parent
    const childrenCount = children.length
    children.forEach(child => {
      if (node !== child && childrenCount < LABEL_TH) {
        filtered.push(child)
      } else if (node !== child && child.height !== 0) {
        filtered.push(child)
      }
    })

    return scan(ancestors, parent)
  }

  scan(pathNodes, selectedSubsystem)

  const children = selectedSubsystem.children
  if (children !== undefined) {
    children.forEach(child => {
      filtered.push(child)
    })
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

  const WORD_SPLIT = /[\s-]/
  const getText = (d, lineNumber = 1) => {
    const label = d.data.data.Label
    const words = label.split(WORD_SPLIT)
    const numWords = words.length

    // Special cases: for better layout
    if(numWords === 1) {
      if(lineNumber === 1 || lineNumber === 3) {
        return ''
      } else {
        return label
      }
    }

    if(numWords === 2) {
      if(lineNumber === 1) {
        return words[0]
      } else if (lineNumber === 2) {
        return words[1]
      } else {
        return ''
      }
    }
    
    if(numWords === 3) {
      if(lineNumber === 1) {
        return words[0]
      } else if (lineNumber === 2) {
        return words[1]
      } else {
        return words[2]
      }
    }

    const targetWords = Math.floor(numWords/3)
    let text = ''
    if(lineNumber === 1) {
      text = words.slice(0, targetWords).join(' ')
    } else if(lineNumber === 2) {
      text = words.slice(targetWords, targetWords*2+1).join(' ')
    } else {
      text = words.slice(targetWords*2+1, numWords).join(' ')
    }
    return text
  }

  // Lines
  const currentLabels = container.selectAll('text').data(filtered)
  const currentLabels2 = container.selectAll('text').data(filtered)
  const currentLabels3 = container.selectAll('text').data(filtered)
  
  currentLabels
    .enter()
    .append('text')
    .attr('id', d => 'l' + d.data.id)
    .attr('class', 'label')
    .style('fill', d => getLabelColor(d))
    .style('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y - createSizeMap(d)/2)
    .text(d => getText(d, 1))
    .style('font-size', d => createSizeMap(d))
    .style('font-weight', 700)
  
  currentLabels2.enter()
    .append('text')
    .attr('id', d => 'l2' + d.data.id)
    .attr('class', 'label')
    .style('fill', d => getLabelColor(d))
    .style('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y + createSizeMap(d)* 0.46)
    .text(d => getText(d, 2))
    .style('font-size', d => createSizeMap(d))
    .style('font-weight', 700)

    return currentLabels3.enter()
    .append('text')
    .attr('id', d => 'l3' + d.data.id)
    .attr('class', 'label')
    .style('fill', d => getLabelColor(d))
    .style('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y + createSizeMap(d)*1.4)
    .text(d => getText(d, 3))
    .style('font-size', d => createSizeMap(d))
    .style('font-weight', 700)

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
  // Special case: root node is the target
  if (dOriginal === root) {
    return root.descendants().filter(node => node.depth < expandDepth + 1)
  }

  // This is the starting point (selected subsystem)
  const d = dOriginal
  let nextP = d.parent
  const pList = []
  const parents = new Set()
  while (nextP !== undefined && nextP !== root) {
    parents.add(nextP)
    pList.push(nextP)
    nextP = nextP.parent
  }

  // Filter higher level terms
  //    - Add only to the specified depth
  let newNodes = root.descendants().filter(child => {

    // System higher than expand depth
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

    if (parents.has(child)) {
      return true
    }
    return false
  })

  const rList = pList.reverse()
  rList.forEach(p => {
    if (p.height !== 0) {
      p.children.forEach(child => {
        if(child.depth < expandDepth) {
          newNodes.push(child)
        }
      })
    }
  })

  const currentDepth = d.depth

  // Add all others from here to depth n
  const addChildren = (node, nodes) => {
    
    // Leaf node
    if (node.height === 0 || (node.depth > d.depth && node.depth > expandDepth) ) {
      return
    }

    const children = node.children
    children.forEach(c => {
      nodes.push(c)
      addChildren(c, nodes)
    })
  }
  addChildren(d, newNodes)

  const pathToRoot = []
  const traverse = node => {
    const parent = node.parent
    if (parent === root) {
      return
    }
    pathToRoot.push(parent)
    traverse(parent)
  }
  traverse(d)

  // Add all nodes to 
  pathToRoot.forEach(node => {
    if (node !== d) {
      addChildren(node, newNodes)
    }
  })

  // System in the same level
  // if(d.parent !== root) {
  //   const sameLevel = d.parent.children
  //   sameLevel.forEach(c => {
  //     if(c.height !== 0 && c.depth < expandDepth + 1) {
  //       addChildren(c, newNodes)
  //     }
  //   })
  // }

  return newNodes
}

const expand = d => {
  selectedSubsystem = d
  const newNodes = buildData(d)

  addCircles(g, newNodes, d)
  addLabels(g, newNodes, d)

  if (focus !== d || !focus.parent) {
    zoom(d)
    if (d3Selection.event !== undefined && d3Selection.event !== null) {
      d3Selection.event.stopPropagation()
    }
  }

  restoreHighlight()
}

const expandSearchResult = results => {
  const newNodes = addSearchResults(results)
  addCircles(g, newNodes, root)
  addLabels(g, newNodes, root)
}

const getParents = node => {
  let nextP = node.parent
  const pList = []
  while (nextP !== undefined && nextP !== root) {
    pList.push(nextP)
    nextP = nextP.parent
  }
  return pList
}

// Expand
const addSearchResults = results => {
  const selectedSet = new Set(results)

  const allNodes = root.descendants()
  let idx = allNodes.length
  let newNodes = []

  // 1. Add root (base circle)
  newNodes.push(root)

  // 2. Add depth 1 nodes
  const selectedParents = []

  while (idx--) {
    const node = allNodes[idx]
    const nodeId = node.data.data.id

    if (node.depth === 1) {
      newNodes.push(node)
    }

    if (selectedSet.has(nodeId)) {
      // This is one of the selected node
      const parents = getParents(node)
      const rList = parents.reverse()
      parents.forEach(p => {
        newNodes.push(p)
        if (p.children !== undefined) {
          p.children.forEach(child => {
            newNodes.push(child)
          })
        }
      })

      // selectedParents.push(parents)
    }
  }

  // 3. Add all parents of selected nodes
  // selectedParents.forEach(parents => {
  //   const rList = parents.reverse()
  //   rList.forEach(p => {
  //     if (p.depth !== 1) {
  //       newNodes.push(p)
  //       console.log('Addig parents!!!', p)
  //     }
  //   })
  // })

  // 4. Add current selected nodes
  // newNodes.push(selectedSubsystem)
  // if (selectedSubsystem.children !== undefined) {
  //   selectedSubsystem.children.forEach(child => {
  //     newNodes.push(child)
  //   })
  // }

  idx = allNodes.length
  while (idx--) {
    const node = allNodes[idx]
    const nodeId = node.data.data.id
    if (selectedSet.has(nodeId)) {
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

      if(data !== undefined && data.props !== undefined) {
        if (data.props.BlueNodes) {
          return blueMapper(d.depth)
        } else if (data.props.RedNodes) {
          return redMapper(d.depth)
        }

      }
      return colorMapper(d.depth)

      // if (d.children) {
      //   return colorMapper(d.depth)
      // } else {
      //   if (data.NodeType !== 'Gene') {
      //     return colorMapper(d.depth)
      //   }
      //   return 'rgba(255, 255, 255, 0.8)'
      // }
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
  node.attr('transform', d => 'translate(' + (d.x - v[0]) * k + ',' + (d.y - v[1]) * k + ')')

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
    .html('<div style="font-size: 1em; padding-bottom: 0.5em; line-height: 1.1em; color: #222222">' + text + '</div>')
    .style('left', d3Selection.event.pageX + 30 + 'px')
    .style('top', d3Selection.event.pageY - 30 + 'px')
}

const hideTooltip = div => {
  div.style('opacity', 0)
}

const expandSearch = d => {
  selectedSubsystem = d
  const newNodes = buildData(d)

  addCircles(g, newNodes, d)
  addLabels(g, newNodes, d)

  if (focus !== d || !focus.parent) {
    zoom(d)
    if (d3Selection.event !== undefined && d3Selection.event !== null) {
      d3Selection.event.stopPropagation()
    }
  }

  restoreHighlight()
}

let selectedGroups = null
let highlightMap = null

/**
 * Show selection by changing color and size
 *
 * @param selected
 * @param fillColor
 */
export const selectNodes = id2color => {
  if (id2color === null || id2color === undefined || id2color.size === 0 || id2color.get === undefined) {
    return
  }

  const selected = Array.from(id2color.keys())
  searchResults = selected
  const selectedCircles = selected
    .map(id => '#c' + id)
    .reduce((previousValue, currentValue, index, array) => previousValue + ', ' + currentValue)

  // lastDepth = expandDepth
  expandDepth = 10

  // expand(selectedSubsystem)
  expandSearch(root)

  selectedGroups = d3Selection.selectAll(selectedCircles)

  console.log('------------> selected2', searchResults, selectedGroups, selectedCircles)
  selectedGroups
    .style('fill', d => id2color.get(d.data.id))
    .style('display', 'inline')
    .attr('r', d => (trans.k > ZOOM_TH_1 ? d.r : calcRadius(d)))

  // Show labels
  const selectedLabels = selected
    .map(id => '#l' + id)
    .reduce((previousValue, currentValue, index, array) => previousValue + ', ' + currentValue)

  const labelTargets = d3Selection.selectAll(selectedLabels)

  labelTargets
    .enter()
    .append('text')
    .attr('id', d => 'l' + d.data.id)
    .attr('class', 'label')
    .style('fill', d => getLabelColor(d))
    .style('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .text(d => d.data.data.Label)
    // .style("font-size", (d) => createSizeMap(d));
    .style('font-size', d => labelSizeMap.get(d.data.id))
  // .style("display", "inline")
  // .style("fill", "#FFFFFF");

  highlightMap = id2color
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
  console.log('---------------------HL Color:')
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
  console.log('---------------------C Color:')
  if (d3Selection.event !== undefined && d3Selection.event !== null) {
    d3Selection.event.stopPropagation()
  }
}

const restoreHighlight = () => {
  if (highlightMap === null || highlightMap === undefined) {
    return
  }

  const selected = Array.from(highlightMap.keys())
  const selectedCircles = selected
    .map(id => '#c' + id)
    .reduce((previousValue, currentValue, index, array) => previousValue + ', ' + currentValue)

  const searchResultNodes = d3Selection.selectAll(selectedCircles)
  searchResultNodes
    .style('fill', d => highlightMap.get(d.data.id))
    .style('display', 'inline')
    .attr('r', d => (trans.k > ZOOM_TH_1 ? d.r : calcRadius(d)))
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
  highlightMap = null
  changeDepth(1)
}

export default CirclePacking
