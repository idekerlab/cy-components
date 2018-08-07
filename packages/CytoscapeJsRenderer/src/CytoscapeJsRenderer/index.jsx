import React, { Component } from 'react'
import cytoscape from 'cytoscape'
import regCose from 'cytoscape-cose-bilkent'
import * as config from './CytoscapeJsConfig'

const EDGE_TYPE_TAG = 'interaction'

// Register optional layout plugin
regCose(cytoscape)

/**
 * Renderer using Cytoscape.js
 */
class CytoscapeJsRenderer extends Component {
  constructor(props) {
    super(props)

    this.state = {
      cyjs: null,
      rendered: false,
      currentLayout: null,
      networkData: null
    }
  }

  updateCyjs = network => {
    this.updateCyjsInternal(network, null)
  }

  updateCyjsInternal = (network, cyjs) => {
    // React only when network data is available.
    if (network === undefined || network === null) {
      return
    }

    if (network.elements.nodes.length === 0) {
      return
    }

    let cy = null
    if (cyjs === null) {
      cy = this.state.cyjs
    } else {
      cy = cyjs
    }

    this.setState({networkData: network.data})

    cy.startBatch()

    cy.remove(cy.elements('node'))
    cy.remove(cy.elements('edge'))
    cy.add(network.elements.nodes)
    cy.add(network.elements.edges)

    cy.endBatch()

    // Apply optional filter if available
    const command = this.props.rendererOptions.defaultFilter
    if (command !== undefined && this.state.rendered === false) {
      this.runCommand(command)
    }

    // Name of layout algorithm
    const layout = this.props.rendererOptions.layout
    if (layout !== undefined && layout !== null) {
      this.applyLayout(layout)
    } else {
      this.applyLayout('grid')
    }

    cy.fit()
    this.setEventListener(cy)

    // At least executed one time.
    this.setState({ rendered: true })
  }

  componentDidMount() {
    // Create Cytoscape.js instance here, only once!
    const netStyleProp = this.props.networkStyle

    let visualStyle = null

    if (netStyleProp === undefined) {
      visualStyle = config.DEF_VS
    } else {
      visualStyle = netStyleProp.style
    }

    // Use default visual style if not available.
    if (visualStyle === undefined || visualStyle === null) {
      visualStyle = config.DEF_VS
    }

    const cy = cytoscape(
      Object.assign({
        container: this.cyjs,
        elements: [],
        style: visualStyle,
        layout: {
          name: config.DEF_LAYOUT
        }
      })
    )
    this.state.cyjs = cy

    // Render actual network
    this.updateCyjsInternal(this.props.network, cy)
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Update is controlled by componentWillReceiveProps()
    return false
  }


  select(selected) {

    const cy = this.state.cyjs
    cy.off(config.SUPPORTED_EVENTS)

    cy.startBatch()

    const idList = selected.nodes
    const idListPermanent = [...selected.nodesPerm]


    if(idListPermanent.length === 0) {
      cy.nodes().removeStyle()
    } else {
      cy.nodes().removeStyle()
      const permSelected = idListPermanent.map(id => '#' + id)
      const permSelectedStr = permSelected.toString()
      cy.elements(permSelectedStr).style({
        'background-color': 'green'
      })
    }

    if(idList.length === 0) {
      cy.nodes().unselect()
    } else {
      const selected2 = idList.map(id => '#' + id)
      const strVal = selected2.toString()
      cy.elements(strVal).select()
    }

    cy.endBatch()
    cy.on(config.SUPPORTED_EVENTS, this.cyEventHandler)
  }

  /**
   * This is the main function to determine
   * whether update is necessary or not.
   */
  componentWillReceiveProps(nextProps) {
    if (this.props.style !== nextProps.style) {
      this.state.cyjs
        .container()
        .setAttribute('style', 'width: ' + nextProps.style.width)
      this.state.cyjs
        .container()
        .setAttribute('style', 'height: ' + nextProps.style.height)
      this.state.cyjs.resize()
    }

    // Check status of network data
    if (nextProps.network === undefined) {
      return
    }

    if(nextProps.selected !== this.props.selected) {
      this.select(nextProps.selected)
    }

    const command = nextProps.command
    if (command !== this.props.command) {
      this.runCommand(command)
      return
    }

    // Check visual style
    const newVs = nextProps.networkStyle
    const currentVs = this.props.networkStyle

    if (newVs !== undefined && newVs !== null) {
      if (currentVs === null || currentVs === undefined) {
        this.state.cyjs.style(newVs.style)
      } else {
        const name = currentVs.name
        const newName = newVs.name
        if (name !== newName) {
          this.state.cyjs.style(newVs.style)
        }
      }
    }

    // Apply layout only when necessary
    const layout = this.props.rendererOptions.layout
    const nextLayout = nextProps.rendererOptions.layout
    if (
      nextLayout !== undefined &&
      nextLayout !== null &&
      layout !== nextLayout
    ) {
      this.applyLayout(nextLayout)
    }

    if (nextProps.network === this.props.network) {
      return
    }

    if (this.props.networkId === nextProps.networkId) {
      return
    }

    this.updateCyjs(nextProps.network)
  }

  runCommand = command => {
    // Execute Cytoscape command
    if (command === null) {
      return
    }

    // Disable handler
    this.state.cyjs.off(config.SUPPORTED_EVENTS)

    const cy = this.state.cyjs
    const commandName = command.command
    const commandParams = command.parameters

    if (commandName === 'fit') {
      cy.fit()
    } else if (commandName === 'zoomIn') {
      cy.zoom(cy.zoom() * 1.2)
    } else if (commandName === 'zoomOut') {
      cy.zoom(cy.zoom() * 0.8)
    } else if (commandName === 'findPath') {
      const startId = commandParams.startId
      const endId = commandParams.endId
      this.findPath(startId, endId)

      // Select neighbour
      const sourceNode = cy.$('#' + startId)
      const sourcePos = sourceNode.position()
      let idx = 0

      sourceNode
        .incomers()
        .select()
        .nodes()
        .forEach(node => {
          if (node.data('Gene_or_Term') === 'Gene') {
            node.position({
              x: 1600,
              y: sourcePos.y + idx * 30
            })
            idx++
          }
        })
    } else if (commandName === 'select') {

      // Clear
      cy.startBatch()

      // const allNodes = cy.nodes()
      // allNodes.unselect()
      // allNodes.removeStyle()

      const idList = commandParams.idList

      let selected = idList.map(id => id.replace(/\:/, '\\:'))
      selected = selected.map(id => '#' + id)

      const strVal = selected.toString()
      const target = cy.elements(strVal)


      target.select()
      if (commandParams.selectedColor !== undefined) {
        target.style({
          'background-color': commandParams.selectedColor
        })

        cy.endBatch()
        return
      }

      cy.endBatch()

      // Multiple colors
      const colorMap = commandParams.groupColors
      if (colorMap !== undefined) {
        target.forEach(node => {
          const colors = []

          const nodeData = node.data()
          const keys = Object.keys(nodeData)

          keys.forEach(key => {
            if (key.startsWith('Group')) {
              if (nodeData[key]) {
                const parts = key.split('_')
                const groupName = parts[1] + ':' + parts[2]
                const color = colorMap.get(groupName)
                colors.push(color)
              }
            }
          })

          if (colors.size === 1) {
            node.style({ 'background-color': colors[0] })
          } else {
            const colorCount = colors.length
            const size = 100.0 / colorCount
            const style = {
              'pie-size': '95%',
              'background-opacity': 0
            }

            for (let i = 0; i < colorCount; i++) {
              const index = i + 1
              style['pie-' + index + '-background-color'] = colors[i]
              style['pie-' + index + '-background-size'] = size
            }
            node.style(style)
          }
        })
      }
    } else if (commandName === 'unselect') {
      const idList = commandParams.idList

      let selected = idList.map(id => id.replace(/\:/, '\\:'))
      selected = selected.map(id => '#' + id)

      const strVal = selected.toString()

      cy.startBatch()
      const target = cy.elements(strVal)
      target.unselect()
      target.removeStyle()
      cy.endBatch()

    } else if (commandName === 'unselectAll') {

      cy.startBatch()
      const target = cy.nodes()
      target.unselect()
      target.removeStyle()
      cy.endBatch()

    } else if (commandName === 'focus') {
      const idList = commandParams.idList
      let selected = idList.map(id => id.replace(/\:/, '\\:'))
      selected = selected.map(id => '#' + id)
      const strVal = selected.toString()

      const target = cy.elements(strVal)
      cy.elements().addClass('faded')
      cy.elements().removeClass('focused')
      target.removeClass('faded')
      target.addClass('focused')

      cy.fit(target, 400)
    } else if (commandName === 'filter') {
      const options = commandParams.options
      const filterType = options.type
      const isPrimary = options.isPrimary
      const range = options.range
      const targetType = options.targetType

      if (filterType === 'numeric') {

        cy.startBatch()

        if (isPrimary) {
          // Before filtering, restore all original edges
          const hiddenEdges = this.state.hiddenEdges
          if (hiddenEdges !== undefined) {
            hiddenEdges.restore()
          }

          // Apply filter.  This result returns edges to be REMOVED
          const toBeRemoved = cy.elements(range)

          // Save this removed
          this.setState({
            hiddenEdges: toBeRemoved,
            lastFilter: range
          })

          toBeRemoved.remove()
        } else {
          console.log('======NON-primary')
          // Before filtering, restore all original edges
          const hiddenEdges = this.state[targetType]
          if (hiddenEdges !== undefined) {
            hiddenEdges.restore()
          }

          // Current edges
          const edges = cy.edges()

          // const allEdges = this.state[targetType]
          // if(allEdges !== undefined) {
          //   allEdges.restore()
          // }
          const toBeRemoved = edges.filter(range)

          this.setState({
            [targetType]: toBeRemoved
          })
          toBeRemoved.remove()

          if (this.state.lastFilter !== undefined) {
            const unnecessary = cy.elements(this.state.lastFilter)
            unnecessary.remove()
          }
        }
        cy.endBatch()
      }
    } else if (commandName === 'expandEdges') {
      // Use edge attributes to create individual edges
      const edgeType = commandParams.edgeType
      const edgeColor = commandParams.edgeColor

      if (edgeType !== undefined) {
        cy.startBatch()

        const mainEdgeType = this.state.networkData['Main Feature'].replace(/ /g, '_')
        const newEdges = this.expandEdges(edgeType, cy.edges(), mainEdgeType)
        if (newEdges.length !== 0) {
          const added = cy.add(newEdges)
          added.style({
            'line-color': edgeColor,
            width: 3,
            opacity: 0.95
          })
          this.setState({
            [edgeType]: added
          })
        }
        cy.endBatch()
      }
    } else if (commandName === 'collapseEdges') {
      // Use edge attributes to create individual edges
      const edgeType = commandParams

      if (edgeType !== undefined) {
        cy.startBatch()

        const toBeRemoved = this.collapseEdges(edgeType, cy.edges())
        cy.remove(cy.collection(toBeRemoved))
        cy.endBatch()
      }
    } else if (commandName === 'layout') {
      const name = commandParams.name
      this.applyLayout(name)
    }

    // Callback
    this.props.eventHandlers.commandFinished(command)

    // Enable it again
    this.state.cyjs.on(config.SUPPORTED_EVENTS, this.cyEventHandler)
  }

  /*
    Using data type to add more edges to the primary one
   */
  expandEdges = (edgeType, edges, primaryEdgeType='RF_score') => {
    let i = edges.length
    const newEdges = []

    while (i--) {
      const edge = edges[i]
      const value = edge.data(edgeType)
      if (value) {
        const newEdge = {
          data: {
            id: edge.data('id') + '-' + edgeType,
            // id: Math.floor(Math.random() * 100000) + '-' + edgeType,
            source: edge.data('source'),
            target: edge.data('target'),
            interaction: edgeType,
            [primaryEdgeType]: edge.data(primaryEdgeType),
            [edgeType]: edge.data(edgeType)
          }
        }
        newEdges.push(newEdge)
      }
    }
    return newEdges
  }

  collapseEdges = (edgeType, edges) => {
    let i = edges.length
    const toBeRemoved = []

    while (i--) {
      const edge = edges[i]
      const interactionType = edge.data('interaction')
      if (interactionType === edgeType) {
        toBeRemoved.push(edge)
      }
    }
    return toBeRemoved
  }

  applyLayout = layout => {
    const cy = this.state.cyjs

    if (layout !== undefined) {
      let layoutAlgorithm = null

      if (layout === 'cose-bilkent') {
        const layoutOptions = {
          name: 'cose-bilkent',
          animate: 'end',
          nodeDimensionsIncludeLabels: true,
          animationEasing: 'ease-out',
          animationDuration: 1500,
          randomize: true,
          idealEdgeLength: 300
        }
        layoutAlgorithm = cy.layout(layoutOptions)
      } else {
        layoutAlgorithm = cy.layout({
          name: layout
        })
      }

      if (layoutAlgorithm !== undefined) {
        layoutAlgorithm.run()
        this.setState({ currentLayout: layout })
      }
    }
  }

  findPath = (s, g) => {
    const aStar = this.state.cyjs
      .elements()
      .aStar({ root: '#' + s, goal: '#' + g })
    aStar.path.select()
  }

  cyEventHandler = event => {
    this.state.cyjs.off(config.SUPPORTED_EVENTS)

    const cy = this.state.cyjs
    // const eventType = event.originalEvent.type;
    const target = event.target
    const eventType = event.type

    if (target === undefined || target === null) {
      return
    }

    const nodeProps = {}
    const edgeProps = {}

    switch (eventType) {
      case config.CY_EVENTS.boxstart:
        this.setState({ boxSelection: true })
        break

      case config.CY_EVENTS.boxselect:
        // Handle multiple selection
        if (this.state.boxSelection) {
          const nodes = cy.$('node:selected').map(node => {
            const nodeData = node.data()
            nodeProps[nodeData.id] = nodeData

            return nodeData.id
          })
          const edges = cy.$('edge:selected').map(edge => edge.data().id)

          this.props.eventHandlers.selectNodes(nodes, nodeProps)
          this.props.eventHandlers.selectEdges(edges)
          this.setState({ boxSelection: false })
        }
        break
      case config.CY_EVENTS.select:
        if (!this.state.boxSelection) {
          if (target.isNode()) {
            const nodeData = target.data()
            const nodeId = nodeData.id
            nodeProps[nodeId] = nodeData
            this.props.eventHandlers.selectNodes([nodeId], nodeProps)
          } else {
            const edgeData = target.data()
            const edgeId = edgeData.id
            edgeProps[edgeId] = edgeData
            this.props.eventHandlers.selectEdges([edgeId], edgeProps)
          }
        }
        break
      case config.CY_EVENTS.unselect:
        if (target.isNode()) {
          this.props.eventHandlers.deselectNodes([target.data().id])
        } else {
          this.props.eventHandlers.deselectEdges([target.data().id])
        }
        break

      default:
        break
    }
    this.state.cyjs.on(config.SUPPORTED_EVENTS, this.cyEventHandler)
  }

  /**
   * Translate Cytoscape.js events into action calls
   */
  setEventListener(cy) {
    cy.on(config.SUPPORTED_EVENTS, this.cyEventHandler)

    cy.on('tap', function(e) {
      if (e.target === cy) {
        cy.elements().removeClass('faded focused')
      }
    })
  }

  render() {
    return <div ref={cyjs => (this.cyjs = cyjs)} style={this.props.style} />
  }
}

export default CytoscapeJsRenderer
