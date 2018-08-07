import * as d3Selection from 'd3-selection'

const getLabels = (textElement, data, fontSize) => {
  console.log("FONT*********, ", data, textElement)

  textElement
    .selectAll('tspan')
    .data(function(d, i, nodes) {
      const labelText = d.data.data.Label
      // return labelText.split(/ /g)
      return labelText
    })
    .enter()
    .append('tspan')
    // .attr('x', 0)
    // .attr('y', (d, i, nodes) => {
    //   return 20+ (i - nodes.length / 2 - 0.5) * 17
    // })
    .text(d => d)

  // textElement.each(function() {
  //   const text = d3Selection.select(this)
  //
  //   const labelText = text.data()[0].data.data.Label
  //   const words = labelText.split(/\s+/)
  //
  //   let lineNumber = 0
  //   const lineHeight = 4
  //
  //   const data = text.data()[0]
  //
  //   let word
  //   let line = []
  //
  //   const wordCount = words.length
  //   // Case 1: single word
  //
  //   if (wordCount === 1 || wordCount === 2) {
  //     text.text(labelText)
  //     return
  //   }
  //
  //   // Case 2: multiple words
  //
  //   // let tspan = text.text(null).append('tspan')
  //
  //   let tspan
  //   // while ((word = words.pop())) {
  //   for (let i = 0; i < wordCount - 1; i = i + 2) {
  //     const word1 = words[i]
  //     const word2 = words[i + 1]
  //
  //     const word = word1 + ' ' + word2
  //     tspan = text
  //       .append('tspan')
  //       .attr('x', 0)]
  //       .attr('y', -data.r / 2)
  //       .attr('dy', lineNumber * 1.1 + 'em')
  //       .text(word)
  //
  //     lineNumber++
  //   }
  // })
}

export default getLabels
