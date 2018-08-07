import React, {Component} from 'react'

import {Map} from 'immutable'

import sigma from 'sigma'

import {
  DEFAULT_SETTINGS,
  RENDERER_TYPE,
  PRESET_COLORS,
  PRESET_GRAPH_SIZE,
  SIZE_SENSITIVE_RENDERING_OPT
} from './SigmaConfig'

import CXStyleUtil from './CXStyleUtil'

import {addCustomMethods} from './customMethods'
import {SigmaCommandExecutor} from './SigmaCommandHandler'

// Renderer types supported by Sigma.js
const DEF_EDGE_WIDTH = 0.01


let globalCounter = 0
let globalFlag = false


class SigmaRenderer extends Component {
  constructor (props, context) {
    super(props, context)

    this.state = {
      nodeColors: {},
      edgeColors: {},
      flip: false,
      originalNodes: {},
      rootId: null
    }
  }


  /*
   * Update is always controlled by componentWillReceiveProps(),
   * so base tag never been updated
   */
  shouldComponentUpdate(nextProps, nextState) {
    return false
  }


  /**
   * Commands will be executed through this mechanism.
   * All others will be updated by event handlers
   */
  componentWillReceiveProps(nextProps) {
    if(nextProps.rendererOptions !== undefined &&
      nextProps.rendererOptions.sigmaOptions !== undefined &&
      this.props.rendererOptions.sigmaOptions !== nextProps.rendererOptions.sigmaOptions
    ) {

      const state1 = Map(this.props.rendererOptions.sigmaOptions)
      const state2 = Map(nextProps.rendererOptions.sigmaOptions)

      if(!state1.equals(state2)) {
        this.setRenderingOptions(nextProps.rendererOptions.sigmaOptions)
        this.s.refresh()
      }
    }

    const command = nextProps.command
    const commandName = command.command
    const params = command.parameters

    let result = null

    if (command !== this.props.command) {

      if(params === undefined) {

        // Execute command without any parameters
        result = SigmaCommandExecutor(commandName, [this.cam, this.s.graph])
      } else {
        this.s.settings('minEdgeSize', 0.35)
        this.s.settings('maxEdgeSize', 1)
        result = SigmaCommandExecutor(commandName, [this.cam, this.s.graph, params])
      }

      this.s.refresh()

      // Run function for post processing
      this.props.eventHandlers.commandFinished(command.command, result)
    }
  }


  buildNetworkView = () => {

    const elements = this.props.network.elements
    const graph = {}

    graph['nodes'] = this.getSigmaNodes(elements.nodes)
    graph['edges'] = this.getSigmaEdges(elements.edges)

    return graph
  }

  getSigmaNodes = nodes => {
    const nodesLen = nodes.length
    const colors = {}
    const sigmaNodes = []

    const originalNodes = this.state.originalNodes

    let rootId = null

    let i = nodesLen
    while(i--) {
      const node = nodes[i]
      const nodeData = node.data

      const originalName = nodeData.Original_Name
      const name = nodeData.name

      if(nodeData.isRoot) {
        rootId = nodeData.id
      }


      // Generate map of nodes
      let label = nodeData.Label
      let aliases = originalNodes[label]

      if(aliases === undefined || aliases === null) {
        aliases = []
      }

      aliases.push(nodeData.id)

      originalNodes[label] = aliases


      // if(originalName === undefined) {
      //   // This is the original node
      //   originalNodes[name] = nodeData.id
      // }

      if(originalName !== undefined && originalName !== null) {
        label = label + ' \uD83D\uDD17'
      }

      const sigmaNode = {
        id: nodeData.id,
        label: (nodeData.isRoot) ? label + ' (root)'  :label,
        x: node.position.x,
        y: node.position.y,
        size: nodeData.Size,
        props: nodeData,
        color: this.styleUtil.getNodeColor(nodeData)
      }

      sigmaNodes.push(sigmaNode)

      if(sigmaNode.color === '#FFFFFF') {
        sigmaNode.color = '#aaaaaa'
      }

      colors[nodeData.id] = sigmaNode.color
    }

    // Store original colors as state
    this.setState({
      nodeColors: colors,
      originalNodes: originalNodes,
      rootId: rootId
    })

    return sigmaNodes
  }

  getSigmaEdges = edges => {
    const hiddenEdges = {}
    const sigmaEdges = []

    edges.forEach((edge) => {

      const ed = edge.data
      const newEdge = {
        'id': ed.id,
        'source': ed.source,
        'target': ed.target,
        'size': DEF_EDGE_WIDTH,
        type: 'arrow',
        // type: 'curve',
        color: PRESET_COLORS.DARK
        // 'hover_color': this.styleUtil.getEdgeSelectedColor()
      }

      if(ed[this.props.edgeTypeTagName] !== 'Tree') {
        newEdge.color = '#FFAA00'

        const source = hiddenEdges[ed.source]
        const target = hiddenEdges[ed.target]

        if(source === undefined) {
          hiddenEdges[ed.source] = [newEdge]
        } else {
          source.push(newEdge)
        }

        if(target === undefined) {
          hiddenEdges[ed.target] = [newEdge]
        } else {
          target.push(newEdge)
        }
      } else {
        sigmaEdges.push(newEdge)
      }

    })

    this.hiddenEdges = hiddenEdges

    return sigmaEdges
  }


  componentDidMount () {

    const cxData = this.props.network.cxData
    let cyVS = null
    if(cxData !== undefined) {
      cyVS = cxData.cyVisualProperties
    }

    if(cyVS !== null) {
      this.styleUtil = new CXStyleUtil(this.props.network, cyVS)
    } else {
      this.styleUtil = new CXStyleUtil(this.props.network)

    }

    const graph = this.buildNetworkView()
    const settings = DEFAULT_SETTINGS

    // Add custom methods for neighbours
    addCustomMethods()

    // Create new instance of renderer with new camera
    this.s = new sigma({
      graph: graph,
      'settings': settings
    })
    this.cam = this.s.addCamera({isAnimated: true});

    const numNodes = this.s.graph.nodes().length

    if(numNodes < PRESET_GRAPH_SIZE.SMALL) {
      this.setRenderingOptions(SIZE_SENSITIVE_RENDERING_OPT.SMALL)
    } else {
      this.setRenderingOptions(SIZE_SENSITIVE_RENDERING_OPT.LARGE)
      this.bindCameraEventHandler(numNodes)
    }

    this.addEventHandlers()


    if(numNodes < PRESET_GRAPH_SIZE.SMALL) {
      this.s.addRenderer({
        'container': this.sigmaView,
        'type': RENDERER_TYPE.CANVAS,
        'camera': this.cam
      })
    } else {
      this.s.addRenderer({
        'container': this.sigmaView,
        'type': RENDERER_TYPE.WEBGL,
        'camera': this.cam
      })

    }

    // CustomShapes.init(this.s)
    this.s.refresh()

  }

  setRenderingOptions(opts) {
    const optKeys = Object.keys(opts)
    optKeys.forEach(key => {
      this.s.settings(key, opts[key])
    })
  }

  bindCameraEventHandler = (numNodes) => {
    this.setState({th: numNodes * 0.15})
    this.setState({th2: numNodes * 0.9})

    this.cam.bind('coordinatesUpdated', () => {

      // Rough estimate for number of nodes in current view
      const viewportSize = this.cam.quadtree._cache.result.length


      // Test code to check viewport objects
      //
      // if(globalFlag === false) {
      //   globalFlag = true
      //
      //   setTimeout(() => {
      //     const iw = window.innerWidth
      //     const ih = window.innerHeight
      //     console.log(iw, ih)
      //     const rect1 = this.cam.getRectangle(iw, ih)
      //     console.log("**Camera: ", rect1)
      //
      //     console.log(this.cam.quadtree.area(rect1))
      //     globalFlag = false
      //     globalCounter++
      //   }, 1000)
      // }


      if (viewportSize <= this.state.th) {
        if (!this.flip) {
          this.s.settings('minNodeSize', 0.5);
          this.s.settings('maxNodeSize', 20);
          this.s.settings('labelThreshold', 2);
          this.s.settings('labelSizeRatio', 3)

          this.s.refresh()
          this.flip = true
          console.log("refresh zoom in refresh")
        }
      } else if (viewportSize > this.state.th && viewportSize <= this.state.th2) {
        if (this.flip) {
          this.s.settings('minNodeSize', 0.1);
          this.s.settings('maxNodeSize', 20);
          this.s.settings('labelThreshold', 5);
          this.s.settings('labelSizeRatio', 1.4)
          // this.lastZoonLevel = ratio
          this.s.refresh()
          this.flip = false
          console.log("refresh out zoom in refresh")
        }
      }
    });

  }


  addEventHandlers = () => {

    this.s.bind('clickNode', e => {

      this.resetView()

      const node = e.data.node
      const nodeId = node.id
      const nodeProps = {}

      const result = SigmaCommandExecutor('findPath', [this.cam, this.s.graph, [nodeId, this.state.rootId]])

      const label = node.props.Label
      const aliases = this.state.originalNodes[label]

      if( aliases !== undefined) {

        const links = []
        aliases.forEach(id => {

          const linkEdgeId = nodeId + '-hidden-' + id
          const linkToOriginal = {
            id: linkEdgeId,
            source: nodeId,
            target: id,
            size: 10,
            edgeType: 'link'

          }

          this.s.graph.addEdge(linkToOriginal)
          links.push(linkEdgeId)
        })

        this.setState({links: links})

        // This is a link node
        // const originalId = this.state.originalNodes[originalName]

      }

      nodeProps[nodeId] = node

      const neighbours = this.s.graph.adjacentNodes(nodeId)
      const connectingEdges = this.s.graph.adjacentEdges(nodeId)

      // Special case: Link node
      // if(connectingEdges !== undefined) {
      //
      //   const targetNodeId = connectingEdges[0].target
      //   const targetNode = this.s.graph.nodes(targetNodeId)
      //
      //   if(targetNode.props.Label.startsWith('Hidden')) {
      //     this.props.eventHandlers.selectNodes([nodeId], nodeProps)
      //     return
      //   }
      //
      // }


      this.s.settings('labelColor', 'node');
      this.s.settings('minEdgeSize', 0.3);
      this.s.settings('maxEdgeSize', 5);

      connectingEdges.forEach(edge => {
        const sourceId = edge.source
        const targetId = edge.target
        const sourceNode = this.s.graph.nodes(sourceId)
        const targetNode = this.s.graph.nodes(targetId)

        if(edge.source === nodeId) {
          // Out edge
          // edge.color = PRESET_COLORS.SELECT
          edge.color = '#FF0000'
          edge.size = 900
        } else if (sourceNode.props.Label.startsWith('Hidden')) {
          edge.color = PRESET_COLORS.BLACK
          edge.size = 3
        } else if (sourceNode.props.NodeType !== 'Gene') {
          edge.color = PRESET_COLORS.SELECT
          edge.size = 3
        } else {
          edge.color = PRESET_COLORS.LIGHT
          edge.size = 3
        }


        if(edge.edgeType === 'link') {
          edge.color = '#FF7700'
          edge.type = 'arrow'
          edge.size = 10
          if(!targetNode.props.Hidden) {
            edge.color= '#304FFE'
          }
        }
      })

      this.nodeSelected(node)

      neighbours.forEach(node => {
        const nodeData = node.props
        if(nodeData.NodeType === 'Gene') {
          node.color = PRESET_COLORS.LIGHT
        } else if (nodeData.Label.startsWith('Hidden')) {

          // This is a special case.
          const linkNodes = this.s.graph.adjacentNodes(node.id)
          linkNodes.forEach(linkNode => {
            linkNode.color = PRESET_COLORS.BLACK
          })
          const linkEdges = this.s.graph.adjacentEdges(node.id)
          linkEdges.forEach(linkEdge => {
            linkEdge.color = PRESET_COLORS.BLACK
            linkEdge.type = 'fast'
          })

          node.size = 0.1
          node.color = PRESET_COLORS.BLACK
        } else {
          node.color = PRESET_COLORS.SELECT
        }
      })

      node.color = PRESET_COLORS.SELECT


      // Move camera to node
      // SigmaCommandExecutor('zoomToNode', [this.cam, node, 0.02])
      // const result = SigmaCommandExecutor('findPath', [this.cam, this.s.graph, [nodeId, this.state.rootId]])


      result.forEach(node => {
        node.color = "#FF0000";
      });

      this.props.eventHandlers.commandFinished('findPath', result)

      this.props.eventHandlers.selectNodes([nodeId], nodeProps)

      this.s.refresh()
    })


    this.s.bind('doubleClickStage', (e) => {

      this.s.settings('labelColor', 'default')
      this.s.settings('minEdgeSize', 0.001);
      this.s.settings('maxEdgeSize', 0.3);


      this.resetView()
      this.resetNodePositions()

      const currentHidden = this.state.currentHiddenEdges

      if(currentHidden !== undefined) {
        currentHidden.forEach(hiddenEdge => {
          this.s.graph.dropEdge(hiddenEdge.id)
        })
      }

      this.setState({currentHiddenEdges: undefined})
      this.s.refresh()
    });


    this.s.bind('overNode', (e) => {
      this.props.eventHandlers.hoverOnNode(e.data.node.id, e.data.node.props)
    })

    this.s.bind('outNode', (e) => {
      this.props.eventHandlers.hoverOutNode(e.data.node.id, e.data.node.props)
    })
  }


  resetView = () => {
    // Delete links
    const links = this.state.links

    if(links !== undefined) {

      links.forEach(link => {
        this.s.graph.dropEdge(link)

      })

      this.setState({
        links: undefined
      })
    }

    // Get sigma nodes and edges
    const nodes = this.s.graph.nodes()
    const edges = this.s.graph.edges()

    // This loop is for performance
    let i = nodes.length
    while(i--) {
      const node = nodes[i]
      node.color = this.state.nodeColors[node.id]
    }

    let j = edges.length
    while(j--) {
      edges[j].color = PRESET_COLORS.BLACK
      edges[j].size = DEF_EDGE_WIDTH
    }


  }

  nodeSelected = node => {

    const currentHidden = this.state.currentHiddenEdges

    if(currentHidden !== undefined) {
      currentHidden.forEach(hiddenEdge => {
        this.s.graph.dropEdge(hiddenEdge.id)
      })
    }
    this.setState({currentHiddenEdges: undefined})

    const nodes = this.s.graph.nodes()
    const edges = this.s.graph.edges()

    this.resetNodePositions()


    let i = nodes.length

    while(i--) {
      nodes[i].color = PRESET_COLORS.GRAY
    }

    let j = edges.length

    // while(j--) {
    //   edges[j].color = FADED_EDGE_COLOR
    // }

    // Highlight
    node.color = PRESET_COLORS.SELECT

    const hidden = this.hiddenEdges[node.id]

    const hiddenNodes = {}

    if(hidden !== undefined) {
      this.setState({currentHiddenEdges: hidden})

      let count = 0

      let circleCount = 0

      hidden.forEach(hiddenEdge => {
        this.s.graph.addEdge(hiddenEdge)

        const source = hiddenEdge.source
        const target = hiddenEdge.target
        const sn = this.s.graph.nodes(source)
        const tn = this.s.graph.nodes(target)
        hiddenNodes[sn.id] = [sn.x, sn.y]
        hiddenNodes[tn.id] = [tn.x, tn.y]


        let nNode = null
        if(source.id !== node.id) {
          nNode = this.s.graph.nodes(source)
        }else {
          nNode = this.s.graph.nodes(target)
        }


        // const radius = circleCount * 2 + 9
        // const newPos = project(count + circleCount*2, radius)
        // count = count + 10
        // if(count%36 === 0) {
        //   circleCount++
        // }
        //
        // nNode.x = newPos[0] + node.x
        // nNode.y = newPos[1] + node.y


        nNode.color = '#FF7700'
      })


      // Move camera
      sigma.misc.animation.camera(
        this.cam,
        {
          x: node[this.cam.readPrefix + 'x'],
          y: node[this.cam.readPrefix + 'y'],
          ratio: 0.02
        },
        {
          duration: 450
        }
      );
    }

    this.setState({currentHiddenNodes: hiddenNodes})


  }

  resetNodePositions = () => {
    const hiddenNodes = this.state.currentHiddenNodes

    if(hiddenNodes !== undefined) {
      const hiddenIds = Object.keys(hiddenNodes)
      console.log(hiddenIds)
      hiddenIds.forEach(key=> {
        this.s.graph.nodes(key).x = hiddenNodes[key][0]
        this.s.graph.nodes(key).y = hiddenNodes[key][1]
      })
    }

    this.setState({currentHiddenNodes: undefined})

  }

  edgeSelected = (edge) => {

    console.log('Edge Selected: ')
    console.log(edge)

  }

  render () {
    return (
      <div
        ref={sigmaView => this.sigmaView = sigmaView}
        style={this.props.style}
      />
    )
  }

}



SigmaRenderer.defaultProps = {

  edgeTypeTagName: 'Is_Tree_Edge',

  networkStyle: {

  },

  rendererOptions: {

    settings: DEFAULT_SETTINGS,

    rendererType: RENDERER_TYPE.CANVAS,
  }
}


const project = (x, y) => {
  const angle = (x - 90) / 180 * Math.PI
  const radius = y
  return [
    radius * Math.cos(angle),
    radius * Math.sin(angle)
  ];
}


export default SigmaRenderer
