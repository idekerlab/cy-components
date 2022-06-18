import React, { Component } from 'react'
import cytoscape from 'cytoscape'
import popper from 'cytoscape-popper'
import regCose from 'cytoscape-cose-bilkent'
import * as config from './CytoscapeJsConfig'
import tippy from 'tippy.js'
// import 'tippy.js/dist/tippy.css'

regCose(cytoscape)
// Extension for tooltip
cytoscape.use(popper)

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
      networkData: null,
      visualStyle: null,
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

    this.setState({ networkData: network.data })
    cy.minZoom(0.001)
    cy.maxZoom(40)

    cy.removeAllListeners()

    const nodes = network.elements.nodes
    const nodeCount = nodes.length
    cy.add(nodes)

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
      if (network.elements.nodes[0].position === undefined) {
        this.applyLayout('grid')
      }
    }

    setTimeout(() => {
      cy.add(network.elements.edges)
      cy.elements('edge')
        .on('mouseover', evt => {
          const edge = evt.target
          edge.style('text-opacity', 1)
        })
        .on('mouseout', evt => {
          const edge = evt.target
          edge.style('text-opacity', 0)
        })
    }, 5)

    setTimeout(() => {
      cy.style(this.state.visualStyle)
      this.setPrimaryEdgeStatus(this.props.hidePrimary)
      this.setEventListener(cy)
      this.setState({ rendered: true })
      console.log('### CYJS INIT2', cy)
    }, 12)
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
        layout: {
          name: config.DEF_LAYOUT,
        },
      }),
    )

    // If setter is provided from user, pass cy instance
    if (this.props.setRendererReference !== null) {
      this.props.setRendererReference(cy)
    }

    this.state.cyjs = cy

    this.setState({
      visualStyle,
    })

    // For resize
    const parentElm = this.cyjs.current

    if (parentElm !== undefined) {
      parentElm.addEventListener('resize', ev => {
        console.log('CYJS+++++++++++++++++++ resize called', ev)
      })
    }

    // Render actual network
    this.updateCyjsInternal(this.props.network, cy)
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Update is controlled by componentWillReceiveProps()
    return false
  }

  simpleSelect(selected) {
    const t0 = performance.now()
    console.log('*** !!!Simple SELECT start::::', selected)
    // Turn off event handlers for performance
    const cy = this.state.cyjs

    cy.off(config.SUPPORTED_EVENTS)

    try {
      const idList = selected.nodes

      if (idList.length === 0) {
        cy.startBatch()
        const elements = cy.elements()
        elements.removeClass('members')
        cy.endBatch()
        console.log('# Clear done. ', performance.now() - t0)
        return
      }

      cy.startBatch()
      const elements = cy.elements()
      elements.removeClass('members')
      cy.edges().toggleClass('hidden', true)
      console.log('# toggle done. ', performance.now() - t0)

      const t2 = performance.now()
      const selected2 = idList.map(id => '#' + id)
      const strVal = selected2.toString()
      const targets = cy.elements(strVal)

      targets.toggleClass('members', true)
      console.log('PICKING & select nodes::', performance.now() - t2)
      cy.endBatch()
      console.log('CYJS Selection DONE::', performance.now() - t0)
    } catch (ex) {
      console.warn('WNG')
    }
    cy.on(config.SUPPORTED_EVENTS, this.cyEventHandler)
  }

  select(selected) {
    const t0 = performance.now()

    if (selected === undefined || selected === null) {
      return
    }

    const idList = selected.nodes
    if (!idList) {
      return
    }

    // Turn off event handlers for performance
    const cy = this.state.cyjs

    if (cy.edges().length >= 10000) {
      return this.simpleSelect(selected)
    }

    cy.off(config.SUPPORTED_EVENTS)

    try {
      const elements = cy.elements()

      if (idList.length === 0) {
        cy.startBatch()
        elements.removeClass('members')
        cy.edges().removeClass('hidden')
        this.setPrimaryEdgeStatus(this.props.hidePrimary)
        cy.endBatch()
        console.log('# Clear done. ', performance.now() - t0)
        return
      }

      cy.startBatch()
      elements.removeClass('members')
      cy.edges().removeClass('hidden')
      console.log('# toggle done. ', performance.now() - t0)

      const t2 = performance.now()
      const selected2 = idList.map(id => '#' + id)
      const strVal = selected2.toString()
      const targets = cy.elements(strVal)

      targets.toggleClass('members', true)
      console.log('PICKING & select nodes::', performance.now() - t2)

      // cy.startBatch();
      cy.nodes().removeStyle()
      // elements.unselect();

      console.log('Unselect done. ', performance.now() - t0)

      // const idListPermanent = [...selected.nodesPerm]

      // Styling for permanent selection
      // if (idListPermanent && idListPermanent.length !== 0) {
      //   cy.startBatch()
      //   const permSelected = idListPermanent.map(id => '#' + id)
      //   const permSelectedStr = permSelected.toString()
      //   const permanentNodes = cy.elements(permSelectedStr)
      //
      //   permanentNodes.style({
      //     'background-color': 'green'
      //   })
      //   permanentNodes.select()
      //
      //   cy.endBatch()
      // }

      if (targets) {
        // Fade all nodes and edges first.
        const connectingEdges = targets.connectedEdges()
        const allNodes = connectingEdges.connectedNodes()
        const diff = allNodes.diff(targets)
        const toBeRemoved = diff.left.edgesWith(targets)
        const edgeDiff = connectingEdges.diff(toBeRemoved)
        const internalEdges = edgeDiff.left

        if (internalEdges) {
          cy.edges().addClass('hidden')
          // targets.removeClass("hidden").select();
          internalEdges.removeClass('hidden')
        }
      }

      // Remove all if hidden
      this.setPrimaryEdgeStatus(this.props.hidePrimary)
      cy.endBatch()

      console.log('CYJS Selection DONE::', performance.now() - t0)
    } catch (ex) {
      console.warn('WNG')
    }
    cy.on(config.SUPPORTED_EVENTS, this.cyEventHandler)
  }

  hidePrimaryEdges = () => {
    this.state.cyjs.edges('[!subEdge]').addClass('hidden')
  }
  showPrimaryEdges = () => {
    this.state.cyjs.edges('[!subEdge]').removeClass('hidden')
  }

  setPrimaryEdgeStatus = hidePrimary => {
    if (hidePrimary) {
      this.hidePrimaryEdges()
    } else {
      this.showPrimaryEdges()
    }
  }

  /**
   * This is the main function to determine
   * whether update is necessary or not.
   */
  componentWillReceiveProps(nextProps) {
    if (this.props.style !== nextProps.style) {
      this.state.cyjs.resize()
    }

    // Check status of network data
    if (!nextProps.network) {
      return
    }

    const hidePrimary = nextProps.hidePrimary
    this.setPrimaryEdgeStatus(hidePrimary)

    const currentSelection = this.props.selected
    const nextSelection = nextProps.selected
    if (currentSelection.nodes !== nextSelection.nodes) {
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

    if (!newVs) {
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
    if (nextLayout !== undefined && nextLayout !== null && layout !== nextLayout) {
      this.applyLayout(nextLayout)
    }

    if (nextProps.network === this.props.network) {
      return
    }

    if (this.props.networkId === nextProps.networkId) {
      return
    }

    try {
      this.updateCyjs(nextProps.network)
    } catch (e) {
      console.warn('Error in Cyjs renderer:', e)
    }
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
    } else if (commandName === 'fitSelected') {
      const selectedNodes = cy.nodes(':selected')
      cy.animate({
        fit: {
          eles: selectedNodes,
        },
        duration: 800,
      })
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
              y: sourcePos.y + idx * 30,
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
          'background-color': commandParams.selectedColor,
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
              'background-opacity': 0,
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
            lastFilter: range,
          })

          toBeRemoved.remove()
          if (this.props.hidePrimary) {
            cy.edges().addClass('hidden')
          }
        } else {
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
            [targetType]: toBeRemoved,
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
        const newEdges = this.expandEdges(edgeType, cy.edges(), mainEdgeType, edgeColor)
        if (newEdges.length !== 0) {
          const added = cy.add(newEdges)
          added.style({
            width: 5,
            'line-style': 'dashed',
            'line-opacity': 1,
            'z-index': 5000,
            opacity: 1
            // 'line-cap': 'round'
          })
          // added.style('line-color', edgeColor)
          added.on('mouseover', evt => {
            const edge = evt.target
            edge.style('text-opacity', 1)
          })
          added.on('mouseout', evt => {
            const edge = evt.target
            edge.style('text-opacity', 0)
          })
          this.setState({
            [edgeType]: added,
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
  expandEdges = (edgeType, edges, primaryEdgeType = 'RF_score', edgeColor) => {
    let i = edges.length
    const newEdges = []

    while (i--) {
      const edge = edges[i]
      const value = edge.data(edgeType)
      if (value) {
        const newEdge = {
          data: {
            id: edge.data('id') + '-' + edgeType,
            source: edge.data('source'),
            target: edge.data('target'),
            interaction: edgeType,
            color: edgeColor,
            zIndex: 0,
            subEdge: true,
            [primaryEdgeType]: edge.data(primaryEdgeType),
            [edgeType]: edge.data(edgeType),
          },
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
          idealEdgeLength: 300,
        }
        layoutAlgorithm = cy.layout(layoutOptions)
      } else {
        layoutAlgorithm = cy.layout({
          name: layout,
        })
      }

      if (layoutAlgorithm !== undefined) {
        layoutAlgorithm.run()
        this.setState({ currentLayout: layout })
      }
    }
  }

  findPath = (s, g) => {
    const aStar = this.state.cyjs.elements().aStar({ root: '#' + s, goal: '#' + g })
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
      case config.CY_EVENTS.click:
        if (!this.state.boxSelection) {
          if (target.isNode()) {
            const nodeData = target.data()
            const nodeId = nodeData.id

            const {rendererOptions} = this.props
            const {tooltipKeys} = rendererOptions

            // !! This is a hack. Should be removed
            if (tooltipKeys.length !== 0) {
              const contentText = tooltipKeys.map(key => (nodeData[key]))
              
              let htmlText = `<ul><h5>Name: ${nodeData['name']}</h5>`
              tooltipKeys.forEach(key => {
                htmlText = htmlText + `<li>${key}: ${nodeData[key]}</li>`
              })
              htmlText = htmlText + '</ul>'
              
              let tippyRef = target.popperRef()
              let dummyDomEle = document.createElement('div')
              let tip = new tippy(dummyDomEle, {
                // tippy props:
                getReferenceClientRect: tippyRef.getBoundingClientRect,
                trigger: 'manual',
                placement: 'bottom-end',
                maxWidth: '15em',
                duration: [100, 0],
                allowHTML: true,
                content: () => {
                  let content = document.createElement('div')
                  content.style.cssText =
                    'overflow-wrap: break-word;background:rgba(255,255,255,0.9);' +
                    'padding: 0.1em;padding-right: 0.2em;border-radius:0.5em;'
                  content.innerHTML = htmlText
                  return content
                },
              })

              tip.show()
            }
            nodeProps[nodeId] = nodeData
            this.props.eventHandlers.selectNodes([nodeId], nodeProps, event)
          } else {
            const edgeData = target.data()
            const edgeId = edgeData.id
            edgeProps[edgeId] = edgeData
            this.props.eventHandlers.selectEdges([edgeId], edgeProps, event)
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
    // cy.on(config.SUPPORTED_EVENTS, this.cyEventHandler);

    // TODO: this is only for Anton's use case.  Need to generalize this
    cy.on('select unselect click tap', 'node', this.cyEventHandler)
    cy.on('select unselect click tap', 'edge', this.cyEventHandler)

    cy.on('tap', function(e) {
      if (e.target === cy) {
        cy.elements().removeClass('faded focused')
      }
    })
  }

  render() {
    const baseStyle = this.props.style
    return <div ref={cyjs => (this.cyjs = cyjs)} style={baseStyle} />
  }
}

export default CytoscapeJsRenderer
