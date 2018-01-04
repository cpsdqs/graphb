document.body.style.background = '#eee'

const canvasNode = document.createElement('div')
const canvas = new (window.graphb.Canvas)(canvasNode)
canvasNode.style.position = 'relative'
canvasNode.style.display = 'inline-block'
canvas.canvas.style.background = '#fff'
canvas.canvas.style.borderRadius = '4px'
canvas.overlay.style.position = 'absolute'
canvas.overlay.style.top = canvas.overlay.style.left = 0
document.body.appendChild(canvasNode)

const serialized = {
  version: '0.0.0',
  w: 500,
  h: 500,
  c: []
}

const image = canvas.image = window.graphb.Image.deserialize(serialized)

let bitmap = new graphb.Bitmap()
bitmap.width = 500
bitmap.height = 500
bitmap.ctx.font = '24px sans-serif'
bitmap.ctx.fillText('draw something', 10, 24)
image.appendChild(bitmap)

const editor = new (window.graphb.Editor)(canvas)

canvas.render()

const resetTrfBtn = document.createElement('button')
document.body.appendChild(resetTrfBtn)
resetTrfBtn.textContent = 'Reset Transform'
resetTrfBtn.addEventListener('click', e => {
    canvas.resetTransform()
    canvas.render()
})

const brushOptions = document.createElement('div')
{
    brushOptions.appendChild(new Text('Size: '))
    const size = document.createElement('input')
    brushOptions.appendChild(size)
    size.type = 'number'
    size.max = 200
    size.min = 1
    size.value = editor.tools.brush.size

    size.addEventListener('input', () => {
        editor.tools.brush.size = size.value
    })

    brushOptions.appendChild(new Text('r'))
    const r = document.createElement('input')
    brushOptions.appendChild(r)
    r.type = 'number'
    r.value = 0
    r.max = 1
    r.min = 0
    r.step = 0.05
    brushOptions.appendChild(new Text('g'))
    const g = document.createElement('input')
    brushOptions.appendChild(g)
    g.type = 'number'
    g.value = 0
    g.max = 1
    g.min = 0
    g.step = 0.05
    brushOptions.appendChild(new Text('b'))
    const b = document.createElement('input')
    brushOptions.appendChild(b)
    b.type = 'number'
    b.value = 0
    b.max = 1
    b.min = 0
    b.step = 0.05
    brushOptions.appendChild(new Text('opacity'))
    const a = document.createElement('input')
    brushOptions.appendChild(a)
    a.type = 'number'
    a.value = 1
    a.max = 1
    a.min = 0
    a.step = 0.05
    brushOptions.appendChild(new Text('flow'))
    const f = document.createElement('input')
    brushOptions.appendChild(f)
    f.type = 'number'
    f.value = 1
    f.max = 1
    f.min = 0
    f.step = 0.05

    let updateColor = () => {
        editor.color = new window.graphb.Color(r.value, g.value, b.value, a.value)
    }

    r.addEventListener('input', updateColor)
    g.addEventListener('input', updateColor)
    b.addEventListener('input', updateColor)
    a.addEventListener('input', updateColor)

    f.addEventListener('input', () => {
        editor.tools.brush.flow = +f.value
    })
}

const eraserOptions = document.createElement('div')
eraserOptions.style.display = 'none'
{
    eraserOptions.appendChild(new Text('Size: '))
    const size = document.createElement('input')
    eraserOptions.appendChild(size)
    size.type = 'number'
    size.max = 200
    size.min = 1
    size.value = editor.tools.eraser.size

    size.addEventListener('input', () => {
        editor.tools.eraser.size = size.value
    })
}

const toolSelect = document.createElement('select')
document.body.appendChild(toolSelect)
toolSelect.size = 2

const createOption = (value, label) => {
    const option = document.createElement('option')
    option.textContent = label
    option.value = value
    return option
}

toolSelect.appendChild(createOption('brush', 'Brush'))
toolSelect.appendChild(createOption('eraser', 'Eraser'))

toolSelect.addEventListener('change', () => {
    editor.tool = editor.tools[toolSelect.value]

    brushOptions.style.display = 'none'
    eraserOptions.style.display = 'none'

    if (toolSelect.value === 'brush') {
        brushOptions.style.display = ''
    } else if (toolSelect.value === 'eraser') {
        eraserOptions.style.display = ''
    }
})
toolSelect.value = 'brush'

let layerCounter = 2

const layers = document.createElement('select')
document.body.appendChild(layers)
layers.size = 10

image.children[0].__name = 'Layer 1'

const updateLayers = () => {
    layers.innerHTML = ''

    for (let layer of Object.keys(image.children).slice().reverse()) {
        if (image.children[layer].isPreview) continue
        layers.appendChild(createOption(layer, image.children[layer].__name))

        if (editor.currentLayer === image.children[layer]) {
            layers.value = layer
        }
    }

    canvas.render()
}
updateLayers()

layers.addEventListener('change', () => {
    editor.currentLayer = image.children[+layers.value]
})

const addLayer = document.createElement('button')
document.body.appendChild(addLayer)
addLayer.textContent = '+Layer'

addLayer.addEventListener('click', () => {
    const layer = new window.graphb.Bitmap(image.width, image.height)
    layer.__name = `Layer ${layerCounter++}`
    image.children.splice(image.children.indexOf(editor.currentLayer) + 1, 0, layer)
    editor.currentLayer = layer

    updateLayers()
})

const rmLayer = document.createElement('button')
document.body.appendChild(rmLayer)
rmLayer.textContent = '-Layer'

rmLayer.addEventListener('click', () => {
    let index = image.children.indexOf(editor.currentLayer)
    image.children.splice(index, 1)
    if (index > image.children.length - 1) index = image.children.length - 1
    editor.currentLayer = image.children[+index]

    updateLayers()
})

const muLayer = document.createElement('button')
document.body.appendChild(muLayer)
muLayer.textContent = '↑Layer'

muLayer.addEventListener('click', () => {
    let index = image.children.indexOf(editor.currentLayer)
    if (index === image.children.length - 1) return

    image.children[index] = image.children[index + 1]
    image.children[index + 1] = editor.currentLayer

    updateLayers()
})

const mdLayer = document.createElement('button')
document.body.appendChild(mdLayer)
mdLayer.textContent = '↓Layer'

mdLayer.addEventListener('click', () => {
    let index = image.children.indexOf(editor.currentLayer)
    if (index === 0) return

    image.children[index] = image.children[index - 1]
    image.children[index - 1] = editor.currentLayer

    updateLayers()
})

document.body.appendChild(brushOptions)
document.body.appendChild(eraserOptions)

const genericOptions = document.createElement('div')
document.body.appendChild(genericOptions)
{
    genericOptions.appendChild(new Text('Pressure sensitive: '))
    const ps = document.createElement('input')
    genericOptions.appendChild(ps)
    ps.type = 'checkbox'
    ps.max = 200
    ps.min = 1
    ps.checked = editor.pressureSensitive

    ps.addEventListener('change', () => {
        editor.pressureSensitive = ps.checked
    })

    genericOptions.appendChild(new Text('Smooth stroke: '))
    const ss = document.createElement('input')
    genericOptions.appendChild(ss)
    ss.type = 'checkbox'
    ss.max = 200
    ss.min = 1
    ss.checked = editor.smoothStroke

    ss.addEventListener('change', () => {
        editor.smoothStroke = ss.checked
    })
}
