import * as d3Selection from 'd3-selection'
// import * as d3Hierarchy from './CustomCirclePacking'
import * as d3Hierarchy from 'd3-hierarchy'
import * as d3Zoom from 'd3-zoom'

import getColorMap from './colormap-generator'
import getSvg from './svg-container-factory'
import getRoot from './hierarchy-factory'

let colorMapper = null
const MARGIN = 50
const MAX_DEPTH = 3
const TRANSITION_DURATION = 400

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

let selectedCircle
let subSelected = new Map()

const currentSet = new Set()

let nodeCount = 0

let sizeTh = 0

const labelSizeMap = new Map()

let svg = null
let zoom2 = null


const CirclePacking = (tree, svgTree, width1, height1, originalProps) => {
  props = originalProps

  colorMapper = getColorMap(
    props.rendererOptions.rootColor,
    props.rendererOptions.leafColor
  )

  svg = getSvg(svgTree, width1, height1)

  width = width1
  height = height1

  diameter = +svg.attr('height')

  // Base setting.
  g = svg.append('g')
  // .attr('transform', 'translate(' + diameter / 2 + ',' + diameter / 2 + ')')

  const zoomed2 = () => {
    g.attr('transform', d3Selection.event.transform)
  }

  // Generate tree and get the root node
  root = getRoot(tree)

  // This is the height of the main tree
  treeHeight = root.height

  // Set initial focus to the root
  focus = root

  // Get all children
  const pack = d3Hierarchy
    .pack()
    .size([diameter - MARGIN, diameter - MARGIN])
    .padding(1)

  let rootNode = pack(root)
  let nodes = rootNode.descendants()

  nodeCount = nodes.length

  zoom2 = d3Zoom
    .zoom()
    .scaleExtent([1 / 10, 500])
    .on('zoom', zoomed2)

  svg.call(zoom2)
  zoom2.translateBy(svg, width / 2, height / 2)

  svg.on('dblclick.zoom', null)

  circle = addCircles(g, nodes)
  addLabels(g, nodes)

  // Now label map is available.
  const labelSizes = [...labelSizeMap.values()]
  const sorted = labelSizes.sort((a, b) => a - b)

  sizeTh = sorted[Math.floor(sorted.length * 0.85)]

  const labelTargets = selectCurrentNodes(root.children, 'l')
  const th = getLabelThreshold(root.children)

  labelTargets
    .style('display', d => {
      const size = labelSizeMap.get(d.data.id)

      if (size > sizeTh) {
        return 'inline'
      } else {
        return 'none'
      }

      // if (d !== root && d.value > th) {
      //   return 'inline'
      // }
    })
    .style('font-size', d => labelSizeMap.get(d.data.id))

  node = g.selectAll('circle,text')
  circleNodes = g.selectAll('circle')
  labels = g.selectAll('.label')
  svg.style('background', '#FFFFFF')

  const initialPosition = [root.x, root.y, root.r * 2 + MARGIN]
  zoomTo(initialPosition)
}

const getLabelThreshold = nodes => {
  const thPoint = Math.floor(nodes.length * 0.8)
  const values = nodes.map(child => child.value).sort((a, b) => a - b)

  return values[thPoint]
}

const getFontSize = d => {
  const txt = d.data.data.Label
  const textLen = txt.length

  let size = 10
  if (textLen <= 5) {
    size = d.r * 2 / textLen
  } else {
    size = d.r * 3 / textLen
  }

  return size
}

// Determine which labels should be displayed or not
const showLabelOrNot = (d, th) => {
  if ((d.parent === focus || d === focus) && d.value > th && d !== root) {
    return 'inline'
  } else {
    return 'none'
  }
}

const createSizeMap = d => {
  const size = getFontSize(d)
  labelSizeMap.set(d.data.id, size)
  return size
}

const addLabels = (container, data) => {
  // const firstChildren = root.children
  // const thPoint = Math.floor(firstChildren.length * 0.8)

  // const values = firstChildren.map(child => child.value).sort((a, b) => a - b)

  // const th = values[thPoint]

  return container
    .selectAll('text')
    .data(data)
    .enter()
    .append('text')
    .attr('id', d => 'l' + d.data.id)
    .style('fill', d => getLabelColor(d))
    .style('text-anchor', 'middle')
    .attr('class', 'label')
    .text(d => d.data.data.Label)
    .style('font-size', d => createSizeMap(d))
    .style('display', 'none')
  // .call(getLabels)
}

const getLabelColor = d => {
  const data = d.data.data

  if (data.NodeType === 'Gene') {
    return '#222222'
  }
  // This is a hidden node.
  if (data.props.Hidden === true) {
    return '#222222'
  } else {
    return '#FFFFFF'
  }
}


const expand = (d, i, nodes) => {
  if (selectedCircle !== undefined) {
    selectedCircle.classed('node-selected', false)
  }

  // Reset sub-selection
  subSelected.forEach(v => {
    v.classed('node-selected-sub', false)
  })
  subSelected.clear()


  // Change border
  selectedCircle = d3Selection.select(nodes[i])
  selectedCircle.classed('node-selected', true)


  if (focus !== d || !focus.parent) {
    zoom(d)
    d3Selection.event.stopPropagation()
  }
}

const addCircles = (container, data) => {
  return container
    .selectAll('circle')
    .data(data)
    .enter()
    .append('circle')
    .attr('id', d => 'c' + d.data.id)
    .attr('class', function(d) {
      return d.parent
        ? d.children
          ? 'node'
          : 'node node--leaf'
        : 'node'
    })
    .style('display', function(d) {

      if (d.parent === focus) {
        currentSet.add(d)
      }

      if (d === root || (d.depth < MAX_DEPTH && d.parent === root)) {
        return 'inline'
      } else {
        return 'none'
      }
    })
    .style('fill', function(d) {
      const data = d.data.data

      // This is a hidden node.
      if (data.props.Hidden === true) {
        if (data.NodeType !== 'Gene') {
          return 'orange'
        // } else {
        //   return '#238b45'
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
    .on('dblclick', (d, i, nodes) => {
      if (d === undefined) {
        return
      }

      expand(d, i, nodes)
    })
    .on('mouseover', (d, i, nodes) => handleMouseOver(d, i, nodes, props))
    .on('mouseout', (d, i, nodes) => {
      props.eventHandlers.hoverOutNode(d.data.id, d.data.data.props)
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
}

const selectCurrentNodes = (nodes, type) => {
  const nodeIds = nodes.map(node => '#' + type + node.data.id).join(', ')
  return d3Selection.selectAll(nodeIds)
}

const zoom = d => {
  // Update current focus
  focus = d

  labels
    .attr('y', d => getFontSize(d) / 2)
    .style('display', d => {
      // Avoid showing
      if (d === focus && d.height !== 0) {
        return 'none'
      }

      if (d === focus || d.parent === focus.parent) {
        return 'inline'
      }

      if (focus.children !== undefined && focus.children.length < 100) {
        if (
          d.parent === focus ||
          (focus.parent === d.parent && d.parent.depth === focus.parent.depth)
        ) {
          return 'inline'
        } else {
          return 'none'
        }
      } else {
        const size = labelSizeMap.get(d.data.id)
        if (
          size > sizeTh &&
          (d.parent === focus ||
            (focus.parent === d.parent &&
              d.parent.depth === focus.parent.depth))
        ) {
          return 'inline'
        } else {
          return 'none'
        }
      }

      // if (d.parent !== focus) {
      //   return 'none'
      // }
    })
    .style('font-size', d => getFontSize(d))

  circleNodes.style('display', d => {
    // Set current depth for later use
    currentDepth = focus.depth

    // Case 1: Genes or Hidden
    if (d === focus) {
      return 'inline'
    }

    if (
      focus.parent === d ||
      (focus.parent === d.parent && d.parent.depth === focus.parent.depth)
      // (d.parent === lastFocus && d.depth === lastFocus.depth)
    ) {
      return 'inline'
    }

    if (d.parent === focus || (currentDepth >= d.depth && d.height >= 1)) {
      return 'inline'
    } else {
      return 'none'
    }
  })

  props.eventHandlers.selectNode(d.data.id, d.data.data.props, true)
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
  props.eventHandlers.hoverOnNode(d.data.id, d.data.data, d.parent)
}


let selectedGroups = null

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
  selectedGroups.style('fill', fillColor).style('display', 'inline')
}


export const fit = () => {
  currentDepth = MAX_DEPTH

  const trans = d3Zoom.zoomIdentity
    .translate(width / 2, height / 2)
    .scale(1)

  svg.call(zoom2.transform, trans)

  zoom(root)
}

export const clear = () => {
  if(selectedGroups === null) {
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
