/**
 * @author    Evan Young
 * @copyright Evan Young 2018
 * @file      Budget Minesweeper
 */

// <region> Variables
const $ = window.$
const storage = window.localStorage
const difficulty = {
  beginner: () => {
    storage.mines = 10
    storage.width = 8
    storage.height = 8
    window.location.reload()
  },
  intermediate: () => {
    storage.mines = 40
    storage.width = 16
    storage.height = 16
    window.location.reload()
  },
  expert: () => {
    storage.mines = 99
    storage.width = 30
    storage.height = 16
    window.location.reload()
  },
  custom: () => {
    window.location.reload()
  }
}
window.left = storage.mines
window.ending = false
window.firstMove = true
// </region>

// <region> Polyfill
function clamp (i, mn = 0, mx = 1) {
  return Math.min(mx, Math.max(i, mn))
}
// </region>

// <region> Board
function genBoard (px = -1, py = -1) {
  for (let m = 0; m < storage.mines; m++) {
    let x, y, e
    do {
      x = Math.floor(Math.random() * storage.width)
      y = Math.floor(Math.random() * storage.height)
      e = $($('#mainBoard tbody tr').get(y)).find('td').get(x)
    } while (e.dataset.mine || (x === px && y === py))
    e.dataset.mine = 'true'
  }
}
function prepBoard () {
  $('#mainBoard thead tr td').attr('colspan', storage.width)
  $('#reset').attr('src', 'images/face-happy.svg')
  $('#flags').get(0).innerHTML = `<img src="images/menu.svg" alt="Hamburger" onclick="toggleOverlay()">${storage.mines}`
  $('#timer').text('00:00:00')

  $('#mainBoard tbody').html('')
  for (let i = 0; i < storage.height; i++) {
    $('#mainBoard tbody').append(`<tr>${'<td class="cell"></td>'.repeat(storage.width)}</tr>`)
  }

  $('.cell').mousedown((e) => {
    if (!window.start) { window.start = new Date() }
    if (e.which === 1) {
      if (window.firstMove) {
        genBoard(cellToCoords(e.target)[0], cellToCoords(e.target)[1])
        window.firstMove = false
      }
      revealCell(e.target)
    } else if (e.which === 3) {
      flagCell(e.target)
    }
    if ($('[data-flagged="1"][data-mine]').length === parseInt(storage.mines)) { winGame() }
  })

  $('.cell').contextmenu(() => {
    return false
  })

  $('#reset').click(() => { window.location.reload() })
}
function endGame () {
  window.ending = true
  $('.cell').each((i, e) => {
    revealCell(e)
  })
}
function loseGame () {
  if (!window.ending) {
    endGame()
    $('#reset img').attr('src', 'images/face-dead.svg')
  }
}
function winGame () {
  if (!window.ending) {
    endGame()
    $('#reset img').attr('src', 'images/face-cool.svg')
  }
}
// </region>

// <region> Cells
function coordsToCell (x, y) {
  return $(`#mainBoard > tbody > tr:nth-child(${y + 1}) > td:nth-child(${x + 1})`).get(0)
}
function cellToCoords (e) {
  return [$(e).index(), $(e).parent().index()]
}
function getAdjacent (e) {
  let coords = cellToCoords(e)
  let x = coords[0]
  let y = coords[1]
  let xMin = clamp(x - 1, 0, storage.width - 1)
  let xMax = clamp(x + 1, 0, storage.width - 1)
  let yMin = clamp(y - 1, 0, storage.height - 1)
  let yMax = clamp(y + 1, 0, storage.height - 1)
  let adj = []

  for (let yNeighbor = yMin; yNeighbor <= yMax; yNeighbor++) {
    for (let xNeighbor = xMin; xNeighbor <= xMax; xNeighbor++) {
      adj.push(coordsToCell(xNeighbor, yNeighbor))
      if (x === xNeighbor && y === yNeighbor) { adj.pop() }
    }
  }
  return adj
}
function calcNear (e) {
  let near = 0
  for (let a of getAdjacent(e)) {
    if (a.dataset.mine) { near += 1 }
  }
  return near
}
function revealCell (e) {
  if (e.dataset.flagged === '1' && !window.ending) { return false }

  $(e).addClass('shown')
  if (e.dataset.mine) {
    if (!window.ending) {
      e.dataset.mine = 'detonated'
      loseGame()
    } else if (e.dataset.mine !== 'detonated') {
      if (e.dataset.flagged === '1') {
        e.dataset.mine = 'flagged'
      } else if (e.dataset.flagged === '2') {
        e.dataset.mine = 'guessed'
      } else if (e.dataset.mine !== 'detonated') {
        e.dataset.mine = 'missed'
      }
    }
  } else {
    let near = calcNear(e)
    e.dataset.near = near

    if (near === 0) {
      for (let a of getAdjacent(e)) {
        if (!a.classList.contains('shown')) { revealCell(a) }
      }
    } else {
      if (e.dataset.flagged !== '1') { e.innerText = near }
    }
  }
  flagCell(e, 0)
}
function flagCell (e, setFlag = undefined) {
  let cur = parseInt(e.dataset.flagged) || 0
  let nxt = setFlag === undefined ? (cur + 1) % 3 : setFlag
  if ((e.classList.contains('shown') && setFlag === undefined) || (window.left - 1 < 0 && cur === 0)) { return false }

  e.dataset.flagged = nxt
  window.left = storage.mines - $('[data-flagged="1"]').length
  $('#flags').get(0).innerHTML = `<img src="images/menu.svg" alt="Hamburger" onclick="toggleOverlay()">${window.left}`
}
// </region>

// <region> Document
function defaultSettings () {
  if (!parseInt(storage.mines)) {
    difficulty.intermediate()
  }
}

function toggleOverlay () {
  $('[data-toggle]').get(0).dataset.toggle = $('[data-toggle]').get(0).dataset.toggle === 'false'
}

async function sizeSettings () {
  let e = $('#mainSettings').get(0)
  $(e).css({
    width: $('#mainBoard tbody').width() - 2,
    height: $('#mainBoard tbody').height() - 2,
    top: $('#mainBoard').offset().top * 1.5 + $('#mainBoard thead').outerHeight()
  })
}

function load () {
  defaultSettings()
  prepBoard()
  sizeSettings()

  setInterval(() => {
    if (window.start && !window.ending) {
      let diff, hour, min, sec
      diff = (new Date()) - window.start
      hour = Math.floor(diff / 1000 / 60 / 60)
      diff -= hour * 1000 * 60 * 60
      min = Math.floor(diff / 1000 / 60)
      diff -= min * 1000 * 60
      sec = Math.floor(diff / 1000)

      $('#timer').text(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`)
    }
  }, 1000)
}
load()
// </region>
