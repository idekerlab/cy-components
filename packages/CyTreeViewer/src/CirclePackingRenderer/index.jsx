import React, { useEffect, useRef } from 'react'
import CirclePacking, {
  selectNodes,
  highlightNode,
  fit,
  clear
} from './d3-circle-packing'

/**
 * React component version of circle packing
 */
const CirclePackingRenderer = props => {
  const treeRef = useRef()

  // For initialization
  useEffect(() => {
    CirclePacking(props.tree, treeRef.current, props.width, props.height, props)
    console.log('CP initialized!')
  }, [])

  useEffect(() => {
    const command = props.command
    if (command.command === 'fit') {
      fit()
    } else if (command.command === 'reset') {
      clear()
    }
  }, [props.command])

  useEffect(() => {
    selectNodes(props.selected)
  }, [props.selected])

  useEffect(() => {
    highlightNode(props.highlight)
  }, [props.highlight])

  useEffect(() => {
    CirclePacking(props.tree, treeRef.current, props.width, props.height, props)
  }, [
    props.rendererOptions.rootColor,
    props.rendererOptions.leafColor,
    props.height
  ])

  return <div ref={treeRef} />
}

export default CirclePackingRenderer
