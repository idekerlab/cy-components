import sigma from 'sigma'
import {addAstar} from './plugins/sigma.astar'

export const addCustomMethods = () => {
  if(!sigma.classes.graph.hasMethod('adjacentNodes')) {
    sigma.classes.graph.addMethod('adjacentNodes', function (id) {
      if (typeof id !== 'string')
        throw 'adjacentNodes: the node id must be a string.';

      console.log(this)
      let target
      const nodes = []

      for (target in this.allNeighborsIndex[id]) {
        nodes.push(this.nodesIndex[target]);
      }
      return nodes;
    })
  }

  if(!sigma.classes.graph.hasMethod('adjacentEdges')) {
    sigma.classes.graph.addMethod('adjacentEdges', function (id) {
      if (typeof id !== 'string')
        throw 'adjacentNodes: the node id must be a string.'

      const connectingEdges = this.allNeighborsIndex[id]
      const nodeIds = Object.keys(connectingEdges)

      const edges = []
      nodeIds.map(nodeId => {
        const adjEdges = connectingEdges[nodeId]
        const adjEdgeIds = Object.keys(adjEdges)

        adjEdgeIds.forEach(edgeId => {
          edges.push(adjEdges[edgeId])
        })
      })
      return edges
    })
  }

  if(!sigma.classes.graph.hasMethod('getEdge')) {
    sigma.classes.graph.addMethod('getEdge', function (source, target) {
      const connectingEdges = this.allNeighborsIndex[source]
      const targetEdge = connectingEdges[target]
      const edgeIds = Object.keys(targetEdge)
      return targetEdge[edgeIds[0]]
    })
  }

  if(!sigma.classes.graph.hasMethod('astar')) {
    addAstar()
  }
}
