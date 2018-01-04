const { vec3, mat4 } = require('gl-matrix')
const Tool = require('./tool')
const Color = require('./color')

module.exports = class Eraser extends Tool {
  constructor (...args) {
    super(...args)

    this.points = []

    this.size = 30
  }

  erase () {
    // bitmap
    const ctx = this.editor.currentLayer.ctx
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = this.editor.backgroundColor.toCSS()

    let makeCircle = (x, y, r) => {
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fill()
    }

    let spacing = 1
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
          makeCircle(
            lastPoint.x + cosAngle * x,
            lastPoint.y + sinAngle * x,
            lastRadius + (radius - lastRadius) * (x / length)
          )
        }
      }

      makeCircle(point.x, point.y, radius)
      lastPoint = point
    }

    ctx.globalCompositeOperation = 'source-over'
    this.editor.currentLayer.dirty = true
  }

  strokeStart (x, y, left, right, length) {
    this.points = []
    this.points.push({ x, y, left, right, length })
  }

  strokeMove (x, y, left, right, length) {
    this.points.push({ x, y, left, right, length })
  }

  strokeEnd (x, y, left, right, length) {
    this.points.push({ x, y, left, right, length })
    this.erase()
  }

  get previewSize () {
    return this.size
  }

  get previewColor () {
    return this.editor.backgroundColor
  }
}
