import React, { useEffect, useRef, useState } from 'react'
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
  const [initialized, setInitialized] = useState(false)

  // For initialization
  useEffect(() => {
    if (!initialized) {
      CirclePacking(
        props.tree,
        treeRef.current,
        props.width,
        props.height,
        props
      )
      console.log('CP initialized!')
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
    highlightNode(props.highlight)
  }, [props.highlight])


  return <div ref={treeRef} />
}

export default CirclePackingRenderer
