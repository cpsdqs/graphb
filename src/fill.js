const Tool = require('./tool')
const Bitmap = require('./bitmap')

const getColor = function getImageDataColor (x, y) {
  const index = 4 * (this.width * y + x)
  return [
    this.data[index],
    this.data[index + 1],
    this.data[index + 2],
    this.data[index + 3]
  ]
}

const setColor = function setImageDataColor (x, y, r, g, b, a) {
  const index = 4 * (this.width * y + x)
  this.data[index] = r
  this.data[index + 1] = g
  this.data[index + 2] = b
  this.data[index + 3] = a
}

if (!Number.EPSILON) Number.EPSILON = 2.220446049250313e-16

module.exports = class Fill extends Tool {
  constructor (...args) {
    super(...args)

    this.size = 1
    this.wantsContinuous = true
    this.wantsPreviewLayer = true

    this.previewFillGeneratorPos = null
    this.previewFillGenerator = null
  }

  floodFill (x, y, imageData, ctx) {
    const cx = Math.round(x)
    const cy = Math.round(y)

    const { width, height } = imageData

    const sampleColor = imageData::getColor(cx, cy)

    const mixForPixel = (x, y) => {
      const color = imageData::getColor(x, y)
      const delta = color.map((x, i) => sampleColor[i] - x).reduce((a, b) => a + b) / 4
      return Math.max(0, 1 - 0.015 * delta * delta)
    }

    let { red: r, green: g, blue: b, alpha: a } = this.editor.color
    r = Math.floor(r * 255)
    g = Math.floor(g * 255)
    b = Math.floor(b * 255)

    const mixColorForMix = mix => {
      return `rgba(${r}, ${g}, ${b}, ${a * mix})`
    }

    const queue = [[cx, cy]]
    const queued = {}
    const floodFillLine = (fx, fy, initialMix = 1, endX) => {
      fx = Math.round(((endX || fx) - fx) / 2) + fx
      let mixAmount = initialMix
      let mixForX = {}
      for (let x = fx; x < width; x++) {
        mixAmount *= mixForPixel(x, fy)
        if (mixAmount < Number.EPSILON) break

        ctx.fillStyle = mixColorForMix(mixAmount)
        ctx.fillRect(x, fy, 1, 1)

        mixForX[x] = mixAmount
      }

      mixAmount = initialMix
      for (let x = fx; x >= 0; x--) {
        mixAmount *= mixForPixel(x, fy)
        if (mixAmount < Number.EPSILON) break

        ctx.fillStyle = mixColorForMix(mixAmount)
        ctx.fillRect(x, fy, 1, 1)

        mixForX[x] = mixAmount
      }

      const keys = Object.keys(mixForX).map(x => +x).sort((a, b) => a - b)

      let spanAbove = false
      let spanBelow = false

      for (let x of keys) {
        if (fy > 0) {
          const mixAbove = mixForPixel(x, fy - 1)
          if (!spanAbove && mixAbove > Number.EPSILON) {
            const key = x + ',' + (fy - 1)
            if (!queued[key]) {
              queue.push(spanAbove = [x, fy - 1, mixAbove, x])
              queued[key] = true
            } else spanAbove = true
          } else if (spanAbove && mixAbove <= Number.EPSILON) {
            spanAbove = false
          } else if (spanAbove && spanAbove !== true) {
            spanAbove[2] = Math.max(spanAbove[2], mixAbove)
            spanAbove[3] = x
          }
        }

        if (fy + 1 < height) {
          const mixBelow = mixForPixel(x, fy + 1)
          if (!spanBelow && mixBelow > Number.EPSILON) {
            const key = x + ',' + (fy + 1)
            if (!queued[key]) {
              queue.push(spanBelow = [x, fy + 1, mixBelow, x])
              queued[key] = true
            } else spanBelow = true
          } else if (spanBelow && mixBelow <= Number.EPSILON) {
            spanBelow = false
          } else if (spanBelow && spanBelow !== true) {
            spanBelow[2] = Math.max(spanBelow[2], mixBelow)
            spanBelow[3] = x
          }
        }
      }
    }

    const floodFill = function* floodFillGenerator () {
      while (queue.length) {
        floodFillLine(...queue.shift())
        yield
      }
    }

    return floodFill()
  }

  previewFillStep (x, y, imageData, ctx, width, height) {
    if (!this.previewFillGeneratorPos ||
        this.previewFillGeneratorPos[0] !== x || this.previewFillGeneratorPos[1] !== y) {
      ctx.clearRect(0, 0, width, height)
      this.previewFillGeneratorPos = [x, y]
      this.previewFillGenerator = this.floodFill(x, y, imageData, ctx)
    }

    if (this.previewFillGenerator) {
      for (let i = 0; i < 100; i++) {
        if (this.previewFillGenerator.next().done) return
      }
    }
  }

  strokeStart (x, y, left, right, length) {
    this.radius = 0
    this.lastTime = Date.now()

    const ctx = this.editor.currentLayer.ctx
    const { width, height } = this.editor.currentLayer.image
    const imageData = ctx.getImageData(0, 0, width, height)

    const previewCtx = this.previewLayer.ctx

    this.previewFillStep(x, y, imageData, previewCtx, width, height)
  }

  strokeMove (x, y, left, right, length) {
    const dt = (Date.now() - this.lastTime) / 1000
    this.lastTime = Date.now()

    this.radius++

    const ctx = this.editor.currentLayer.ctx
    const { width, height } = this.editor.currentLayer.image
    const imageData = ctx.getImageData(0, 0, width, height)

    const previewCtx = this.previewLayer.ctx

    this.previewFillStep(x, y, imageData, previewCtx, width, height)
  }

  strokeEnd (x, y, left, right, length) {
    const ctx = this.editor.currentLayer.ctx
    const { width, height } = this.editor.currentLayer.image
    const imageData = ctx.getImageData(0, 0, width, height)

    let generator = this.floodFill(x, y, imageData, ctx)
    let loop = () => {
      for (let i = 0; i < 100; i++) {
        if (generator.next().done) {
          this.editor.canvas.render()
          return
        }
      }

      window.requestAnimationFrame(loop)
      this.editor.canvas.render()
    }
    loop()
  }

  get previewColor () {
    return this.editor.color
  }

  get previewSize () {
    return this.size
  }
}
