const { vec2, mat2d } = require('gl-matrix')
const arc = require('arc-to')
const Bitmap = require('./bitmap')
const Color = require('./color')
const Brush = require('./brush')
const Eraser = require('./eraser')

const distanceTo = function distanceToVector2D (b) {
  return Math.hypot(b[0] - this[0], b[1] - this[1])
}

module.exports = class Editor {
  constructor (canvas) {
    this.canvas = canvas

    this.down = false
    this.previewMaxWidth = null
    this.previewStroke = null
    this.lastPoint = null

    this.tools = {
      brush: new Brush(this),
      eraser: new Eraser(this)
    }

    this.color = new Color(0, 0, 0, 1)
    this.backgroundColor = new Color(1, 1, 1, 1)
    this.pressureSensitive = true
    this.tool = this.tools.brush
    this.resolvedTool = null
    this.cursorSize = null

    this.currentLayer = canvas.image.children[0]
    this.tiltAmount = 0.3

    this.lastMouse = [0, 0]

    this.canvas.node.addEventListener('image-change', e => {
      this.currentLayer = canvas.image.children[0]
    })

    this.canvas.node.style.cursor = 'none'

    if (typeof this.canvas.node.onpointermove !== 'undefined') {
      this.canvas.node.addEventListener('pointerdown', this.onPointerDown)
      this.canvas.node.addEventListener('pointermove', this.onPointerMove)
      this.canvas.node.addEventListener('pointerup', this.onPointerUp)
      this.canvas.node.addEventListener('pointerout', this.onPointerOut)
    } else {
      this.canvas.node.addEventListener('mousedown', this.onMouseDown)
      this.canvas.node.addEventListener('mousemove', this.onMouseMove)
      this.canvas.node.addEventListener('mouseup', this.onMouseUp)
      this.canvas.node.addEventListener('mouseout', this.onPointerOut)

      // TODO: touch
    }

    this.canvas.node.addEventListener('wheel', e => {
      e.preventDefault()
      if (e.ctrlKey) {
        this.scaleCanvas(1 - (e.deltaY / 100), this.screenToGL(this.lastMouse))
      } else {
        let transform = this.canvas.context.transform
        transform[4] -= e.deltaX
        transform[5] -= e.deltaY
      }
      this.canvas.render()
    })

    let lastGestureScale = 0
    let lastGestureRotation = 0
    this.canvas.node.addEventListener('gesturestart', e => {
      e.preventDefault()
      lastGestureScale = e.scale
      lastGestureRotation = e.rotation
    })
    this.canvas.node.addEventListener('gesturechange', e => {
      e.preventDefault()

      let deltaScale = e.scale - lastGestureScale
      this.scaleCanvas(1 + deltaScale, this.screenToGL(this.lastMouse))

      let transform = this.canvas.context.transform
      let inverted = mat2d.create()
      mat2d.invert(inverted, transform)

      let pivot = this.screenToGL(this.lastMouse)
      vec2.transformMat2d(pivot, pivot, inverted)

      mat2d.translate(transform, transform, pivot)
      let deltaRotZ = e.rotation - lastGestureRotation
      mat2d.rotate(transform, transform, deltaRotZ / 180 * Math.PI)
      mat2d.translate(transform, transform, vec2.scale(pivot, pivot, -1))

      lastGestureScale = e.scale
      lastGestureRotation = e.rotation
    })
    this.canvas.node.addEventListener('gestureend', e => {
      e.preventDefault()
    })
  }

  scaleCanvas (factor, pivot) {
    let transform = this.canvas.context.transform
    let inverted = mat2d.create()
    mat2d.invert(inverted, transform)

    pivot = pivot || [0, 0]
    vec2.transformMat2d(pivot, pivot, inverted)

    mat2d.translate(transform, transform, pivot)
    mat2d.scale(transform, transform, [factor, factor])
    mat2d.translate(transform, transform, vec2.scale(pivot, pivot, -1))
    this.canvas.render()
  }

  updateImage () {
    this.currentLayer = canvas.image.children[0]
  }

  screenToGL (point) {
    return [
      point[0],
      point[1]
    ]
  }

  glToScreen (point) {
    return [
      point[0],
      point[1]
    ]
  }

  projectPoint (point) {
    let transform = this.canvas.context.transform
    let inverted = mat2d.create()
    mat2d.invert(inverted, transform)

    let glPoint = this.screenToGL(point)
    vec2.transformMat2d(glPoint, glPoint, inverted)
    return glPoint
  }

  getCursorSize () {
    if (this.resolvedTool) {
      return this.cursorSize
    } else {
      return this.pressureSensitive ? this.tool.size / 2 : this.tool.size
    }
  }

  renderCursor (x, y, dx, dy) {
    const ctx = this.canvas.overlayCtx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.overlay.width, this.canvas.overlay.height)
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    if (x < 0 || y < 0) return

    ctx.translate(x, y)

    ctx.save()
    ctx.rotate(-Math.atan2(dx, -dy))

    let scaleY = 1 + Math.hypot(dx, dy) / 40

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.beginPath()

    let radius = this.getCursorSize() / 2
    let points = arc(0, 0, radius, 0, Math.PI * 2)
    let first = true
    for (let point of points) {
      let [x, y] = point

      if (first) ctx.moveTo(x, y * scaleY + (scaleY - 1) * radius)
      else ctx.lineTo(x, y * scaleY + (scaleY - 1) * radius)

      first = false
    }

    ctx.stroke()

    ctx.restore()
  }

  createPreviewStroke () {
    this.previewStroke = new Bitmap(this.canvas.image.width, this.canvas.image.height)
    this.previewStroke.isPreview = true

    this.previewMaxWidth = this.resolvedTool.previewSize

    const roughColor = this.resolvedTool.previewColor.clone()
    this.previewStroke.opacity = roughColor.alpha
    roughColor.alpha = this.resolvedTool.flow || 1
    this.previewStroke.roughColor = roughColor.toCSS()

    this.canvas.image.appendChild(this.previewStroke)
  }

  getPressureForDelta (a, b) {
    let delta = Math.hypot(a[0] - b[0], a[1] - b[1])
    return 1 - 1 / (delta / 50 + 1.4)
  }

  onPointerDown = e => {
    this.down = 'pointer'

    if (this.tool === this.tools.brush && (e.altKey || e.pointerType === 'pen' && e.button === 5)) {
      this.resolvedTool = this.tools.eraser
    } else {
      this.resolvedTool = this.tool
    }

    this.previewStrokes = []
    this.createPreviewStroke()

    this.cursorSize = e.pointerType === 'mouse'
      ? this.previewMaxWidth
      : e.pressure * this.previewMaxWidth
    this.renderCursor(e.offsetX, e.offsetY, e.tiltX, e.tiltY)

    let [x, y] = this.projectPoint([e.offsetX, e.offsetY])

    let pressure = e.pointerType === 'mouse' ? 0 : e.pressure
    if (!this.pressureSensitive) pressure = 1

    let left = pressure * this.previewMaxWidth / 2
    let right = pressure * this.previewMaxWidth / 2
    this.previewStroke.addRoughPoint(x, y, left, right, true)

    this.lastPoint = [x, y]
    this.roughLength = 0

    this.resolvedTool.strokeStart(x, y, left, right, this.roughLength, e)
    this.lastMouse = [e.offsetX, e.offsetY]
    this.canvas.render()
  }

  handleSinglePointerMove (e) {
    let pressure = e.pointerType === 'mouse'
      ? this.getPressureForDelta([e.offsetX, e.offsetY], this.lastMouse)
      : e.pressure
    if (!this.pressureSensitive) pressure = 1

    this.cursorSize = pressure * this.previewMaxWidth
    this.renderCursor(e.offsetX, e.offsetY, e.tiltX, e.tiltY)

    if (this.down !== 'pointer') return

    // TODO: deduplicate points

    let [x, y] = this.projectPoint([e.offsetX, e.offsetY])

    let vec = [x, y].map((x, i) => x - this.lastPoint[i])
    let angle = Math.atan2(...vec)

    // angles:
    //        pi
    // -pi/2      pi/2
    //        0

    let tiltAngle = Math.atan2(e.tiltX, -e.tiltY)
    let tiltLength = Math.hypot(e.tiltX, e.tiltY) / 100

    // left normal vector
    let vecLeft = [Math.cos(angle + Math.PI / 2), Math.sin(angle + Math.PI / 2)]
    // right normal vector
    let vecRight = [Math.cos(angle - Math.PI / 2), Math.sin(angle - Math.PI / 2)]

    let tiltVector = [Math.cos(tiltAngle), Math.sin(tiltAngle)]

    let left = pressure * this.previewMaxWidth / 2
    let right = pressure * this.previewMaxWidth / 2

    // dot left normal with tilt vector to get amount
    left += this.tiltAmount * Math.abs(vecLeft.map((x, i) => x * tiltVector[i]).reduce((a, b) => a + b, 0) * this.previewMaxWidth * tiltLength)
    right += this.tiltAmount * Math.abs(vecRight.map((x, i) => x * tiltVector[i]).reduce((a, b) => a + b, 0) * this.previewMaxWidth * tiltLength)

    if (!e.isCoalescedEvent) {
      this.previewStroke.addRoughPoint(x, y, left, right)
      this.cursorSize = left + right
    }

    this.roughLength += this.lastPoint::distanceTo([x, y])

    this.lastPoint = [x, y]

    this.resolvedTool.strokeMove(x, y, left, right, this.roughLength, e)
  }

  onPointerMove = e => {
    let events = [e]
    if (e.getCoalescedEvents) events.unshift(...e.getCoalescedEvents().map(e => {
      e.isCoalescedEvent = true
      return e
    }))

    for (let event of events) this.handleSinglePointerMove(event)

    this.lastMouse = [e.offsetX, e.offsetY]
    this.canvas.render()
  }

  onPointerUp = e => {
    if (this.down !== 'pointer') return
    this.down = null

    let pressure = e.pointerType === 'mouse'
      ? this.getPressureForDelta([e.offsetX, e.offsetY], this.lastMouse)
      : e.pressure
    if (!this.pressureSensitive) pressure = 1

    let left = pressure * this.previewMaxWidth / 2
    let right = pressure * this.previewMaxWidth / 2

    this.previewStroke.parentNode.removeChild(this.previewStroke)
    this.previewStroke = null

    let [x, y] = this.projectPoint([e.offsetX, e.offsetY])

    this.renderCursor(e.offsetX, e.offsetY, e.tiltX, e.tiltY)
    this.resolvedTool.strokeEnd(x, y, left, right, this.roughLength, e)
    this.resolvedTool = null
    this.lastMouse = [e.offsetX, e.offsetY]
    this.canvas.render()
  }

  onPointerOut = e => {
    this.onPointerUp(e)
    this.renderCursor(-1, -1, 0, 0)
  }

  onMouseDown = e => {
    this.onPointerDown({
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    })
  }
  onMouseMove = e => {
    this.onPointerMove({
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      pressure: this.getPressureForDelta([e.offsetX, e.offsetY], this.lastMouse),
      tiltX: 0,
      tiltY: 0,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    })
  }
  onMouseUp = e => {
    this.onPointerUp({
      offsetX: e.offsetX,
      offsetY: e.offsetY,
      pressure: this.getPressureForDelta([e.offsetX, e.offsetY], this.lastMouse),
      tiltX: 0,
      tiltY: 0,
      shiftKey: e.shiftKey,
      altKey: e.altKey
    })
  }
}
