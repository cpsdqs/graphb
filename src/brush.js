const Tool = require('./tool')
const Bitmap = require('./bitmap')

module.exports = class Brush extends Tool {
  constructor (...args) {
    super(...args)

    this.points = []

    this.size = 10
    this.flow = 1
    this.spacing = 1
  }

  stamp (ctx, x, y, radius) {
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, 2 * Math.PI)
    ctx.fill()
  }

  stroke () {
    const imageCtx = this.editor.currentLayer.ctx

    const strokeLayer = new Bitmap(this.editor.currentLayer.width, this.editor.currentLayer.height)
    const ctx = strokeLayer.ctx

    const opaqueColor = this.editor.color.clone()
    opaqueColor.alpha = this.flow
    ctx.fillStyle = opaqueColor.toCSS()

    const spacing = this.spacing
    let lastPoint = null
    for (let point of this.points) {
      let radius = (point.left + point.right) / 2

      // interpolate line
      if (lastPoint) {
        let length = Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y)
        let angle = Math.atan2(point.y - lastPoint.y, point.x - lastPoint.x)
        let cosAngle = Math.cos(angle)
        let sinAngle = Math.sin(angle)
        let lastRadius = (lastPoint.left + lastPoint.right) / 2

        for (let x = 0; x < length; x += spacing) {
          this.stamp(
            ctx,
            lastPoint.x + cosAngle * x,
            lastPoint.y + sinAngle * x,
            lastRadius + (radius - lastRadius) * (x / length)
          )
        }
      }

      this.stamp(ctx, point.x, point.y, radius)
      lastPoint = point
    }

    imageCtx.globalAlpha = this.editor.color.alpha
    imageCtx.drawImage(strokeLayer.image, 0, 0)
    imageCtx.globalAlpha = 1

    this.editor.currentLayer.dirty = true
  }

  strokeStart (x, y, left, right, length) {
    this.points = []
    this.points.push({ x, y, left, right, length })
  }

  strokeMove (x, y, left, right, length) {
    let lastPoint = this.points[this.points.length - 1]
    if (lastPoint.x === x && lastPoint.y === y) {
      Object.assign(lastPoint, { left, right })
    } else {
      this.points.push({ x, y, left, right, length })
    }
  }

  strokeEnd (x, y, left, right, length) {
    this.strokeMove(x, y, left, right, length)

    this.stroke()
  }

  get previewColor () {
    return this.editor.color
  }

  get previewSize () {
    return this.size
  }
}
