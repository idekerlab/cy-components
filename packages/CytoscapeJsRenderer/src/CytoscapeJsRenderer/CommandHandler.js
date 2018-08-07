const fit = cy => {
  cy.fit()
}

const zoomIn = (cy, ratio = 1.2) => {
  cy.zoom(cy.zoom() * ratio)
}

const zoomOut = (cy, ratio = 0.8) => {
  cy.zoom(cy.zoom() * ratio)
}

/**
 * For each primary edge, add extra edge
 *
 * @param cy
 * @param edges
 * @param interactionType
 *
 */
const expandEdges = (cy, edges, interactionType, bypassColor) => {
  if (interactionType === undefined) {
    return
  }

  cy.startBatch()

  const newEdges = this.expand(interactionType, edges)
  if (newEdges.length !== 0) {

    const added = cy.add(newEdges)
    added.style({
      'line-color': edgeColor
    })
    this.setState({
      [edgeType]: added
    })
  }
  cy.endBatch()
}


const expand = (edgeType, edges) => {
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
          RF_score: edge.data('RF_score'),
          [edgeType]: edge.data(edgeType)
        }
      }
      newEdges.push(newEdge)
    }
  }
  return newEdges
}


/**
 * Generic filter function using Cytoscape.js selector
 *
 * This should return the subgraph with elements PASSING
 * given filter expression.
 *
 *
 */
const filter = (cy, filterType='numeric') => {

  const options = commandParams.options
  const filterType = options.type
  const isPrimary = options.isPrimary
  const range = options.range
  const targetType = options.targetType

  if (filterType === 'numeric') {
    cy.startBatch()

    if(isPrimary) {
      // Before filtering, restore all original edges
      const hiddenEdges = this.state.hiddenEdges
      if (hiddenEdges !== undefined) {
        hiddenEdges.restore()
      }

      // Apply filter.  This result returns edges to be REMOVED
      const toBeRemoved = cy.elements(range)

      // Save this removed
      this.setState({
        hiddenEdges: toBeRemoved
      })

      toBeRemoved.remove()
    } else {
      // All others
      console.log('-----------------STANDARD EDGE2-------------')
      console.log(commandParams)

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
    }
    cy.endBatch()
  }
}

const numericFilter = () => {

}

const commands = {
  fit,
  zoomIn,
  zoomOut,
  filter
}


const CommandExecutor = (commandName, options) => {
 const command = commands[commandName]

  if(command !== undefined) {

  }

}

export default CommandExecutor