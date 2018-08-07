const SQRT3 = Math.sqrt(3)

const leftTriangle = {
  draw: function(context, size) {
    const y = -Math.sqrt(size / (SQRT3 * 3))
    context.moveTo(0, y * 2)
    context.lineTo(-SQRT3 * y, -y)
    context.lineTo(SQRT3 * y, -y)
    context.closePath()
  }
}

export default leftTriangle
