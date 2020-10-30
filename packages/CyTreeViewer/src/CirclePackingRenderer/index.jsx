import React, { useEffect, useRef, useState } from 'react'
import CirclePacking, {
  selectNodes,
  highlightNode,
  fit,
  clear,
  changeDepth,
  changeColor
} from './d3-circle-packing'

/**
 * React component version of circle packing
 */
const CirclePackingRenderer = props => {
  const treeRef = useRef()
  const [initialized, setInitialized] = useState(false)

  // For initialization
  useEffect(() => {
    if (!initialized) {
    console.log(
      '--------------------GOT tree--Search result given -----------------------', props
    )
      CirclePacking(
        props.tree,
        treeRef.current,
        props.width,
        props.height,
        props
      )
      setInitialized(true)
    }
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
    highlightNode(props.highlight, props.selected)
  }, [props.highlight])

  useEffect(() => {
    changeDepth(props.depth)
  }, [props.depth])

  useEffect(() => {
    changeColor(
      props.rendererOptions.rootColor,
      props.rendererOptions.leafColor
    )
  }, [props.rendererOptions.leafColor, props.rendererOptions.rootColor])

  return <div ref={treeRef} />
}

export default CirclePackingRenderer
