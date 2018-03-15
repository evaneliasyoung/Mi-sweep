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
  }
}
window.left = storage.mines
window.ending = false
window.firstMove = true
// </region>

// <region> Polyfill
/**
 * Restricts a number to a specific range
 * @param  {Number} i      The number to restrict
 * @param  {Number} [mn=0] The minimum
 * @param  {Number} [mx=1] The maximum
 * @return {Number}        The number in range
 */
function clamp (i, mn = 0, mx = 1) {
  return Math.min(mx, Math.max(i, mn))
}
/**
 * Converts a string to title casing
 * @param  {String} s The string to title
 * @return {String}   The titled string
 */
function titleCase (s) {
  return s.toLowerCase().split(' ').map((e, i) => {
    return e[0].toUpperCase() + e.substr(1)
  }).join(' ')
}
// </region>

// <region> Board
/**
 * Places the mines on the board
 * @param  {Number} [px=-1] The protected x location
 * @param  {Number} [py=-1] The protected y location
 */
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
/**
 * Inserts the markup and the listeners for the minefield
 */
function prepBoard () {
  $('#mainBoard thead tr td').attr('colspan', storage.width)
  $('#flags span').text(storage.mines)
  $('#flags img').click(() => { toggleOverlay() })

  $('#mainBoard tbody').html('')
  for (let i = 0; i < storage.height; i++) {
    $('#mainBoard tbody').append(`<tr>${'<td class="cell" data-flagged="default"></td>'.repeat(storage.width)}</tr>`)
  }

  $('.cell')
  .mousedown((ev) => {
    if (!window.start) { window.start = new Date() }
    if (ev.which === 1) {
      if (window.firstMove) {
        genBoard(cellToCoords(ev.target)[0], cellToCoords(ev.target)[1])
        window.firstMove = false
      }
      revealCell(ev.target)
    } else if (ev.which === 3) {
      flagCell(ev.target)
    }
    if ($('[data-flagged="flagged"][data-mine]').length === parseInt(storage.mines)) { winGame() }
  })
  .contextmenu(() => {
    return false
  })

  $('#reset').click(() => { window.location.reload() })
}
/**
 * Ends the game
 */
function endGame () {
  window.ending = true
  $('.cell:not(.shown)').each((i, e) => {
    revealCell(e)
  })
}
/**
 * Loses the game
 */
function loseGame () {
  if (!window.ending) {
    endGame()
    $('#reset img').attr('src', 'images/face-dead.svg')
  }
}
/**
 * Wins the game
 */
function winGame () {
  if (!window.ending) {
    endGame()
    $('#reset img').attr('src', 'images/face-cool.svg')
  }
}
// </region>

// <region> Cells
/**
 * Converts coordinates to a table cell
 * @param  {Number}  x The x coordinate
 * @param  {Number}  y The y coordinate
 * @return {Element}   The table cell
 */
function coordsToCell (x, y) {
  return $(`#mainBoard > tbody > tr:nth-child(${y + 1}) > td:nth-child(${x + 1})`).get(0)
}
/**
 * Converts a table cell to it's coordinates
 * @param  {Element} e The table cell
 * @return {List}      The coordinates [x,y]
 */
function cellToCoords (e) {
  return [$(e).index(), $(e).parent().index()]
}
/**
 * Gets the adjacent cells of any cell
 * @param  {Element} e The cell to find adjacents
 * @return {List}      The adjecent cells [e...]
 */
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
/**
 * Counts the nearby mines of a cell
 * @param  {Element} e The cell to count nearby
 * @return {Number}    The amount of nearby mines
 */
function calcNear (e) {
  let near = 0
  for (let a of getAdjacent(e)) {
    if (a.dataset.mine) { near += 1 }
  }
  return near
}
/**
 * Reveals a cell's contents
 * @param  {Element} e The cell to reveal
 */
function revealCell (e) {
  if (e.dataset.flagged === 'flagged' && !window.ending) { return false }

  $(e).addClass('shown')
  if (e.dataset.mine) {
    svgAdd(e)
    if (!window.ending) {
      e.dataset.mine = 'detonated'
      loseGame()
    } else if (e.dataset.mine !== 'detonated') {
      e.dataset.mine = e.dataset.flagged
    }
  } else {
    let near = calcNear(e)
    e.dataset.near = near

    if (near === 0) {
      for (let a of getAdjacent(e)) {
        if (!a.classList.contains('shown')) { revealCell(a) }
      }
    } else if (e.dataset.flagged !== 'flagged') {
      e.innerText = near
    }
  }
  // Game ending AND Cell has a mine OR Game not ending OR Guessed cell
  if ((window.ending && e.dataset.mine) || !window.ending || e.dataset.flagged === 'guessed') { flagCell(e, 0) }
  svgBombColor()
}
/**
 * Cycles through a cell's flagged state
 * @param  {Element} e                  The element to restate
 * @param  {Number} [setFlag=undefined] The forced state
 */
function flagCell (e, setFlag = undefined) {
  let sts = ['default', 'flagged', 'guessed']
  let cur = sts.indexOf(e.dataset.flagged)
  let nxt = setFlag === undefined ? (cur + 1) % 3 : setFlag
  // Already shown AND no flag OR No flag AND no flags left
  if ((e.classList.contains('shown') && setFlag === undefined) || (window.left - 1 < 0 && cur === 0)) { return false }

  e.dataset.flagged = sts[nxt]
  if (!window.ending) { window.left = storage.mines - $('[data-flagged="flagged"]').length }
  $('#flags span')
  .text(window.left)
  .get(0).title = `${$('[data-flagged="flagged"]').length} Marked\n${$('[data-flagged="guessed"]').length} Guess(es)`
}
// </region>

// <region> SVG Injection
/**
 * Adds the bomb svgs to the DOM
 * @param  {Element} e The parent element of the bomb
 */
async function svgAdd (e) {
  let svgBomb = '<path d="M11.25,6A3.25,3.25 0 0,1 14.5,2.75A3.25,3.25 0 0,1 17.75,6C17.75,6.42 18.08,6.75 18.5,6.75C18.92,6.75 19.25,6.42 19.25,6V5.25H20.75V6A2.25,2.25 0 0,1 18.5,8.25A2.25,2.25 0 0,1 16.25,6A1.75,1.75 0 0,0 14.5,4.25A1.75,1.75 0 0,0 12.75,6H14V7.29C16.89,8.15 19,10.83 19,14A7,7 0 0,1 12,21A7,7 0 0,1 5,14C5,10.83 7.11,8.15 10,7.29V6H11.25M22,6H24V7H22V6M19,4V2H20V4H19M20.91,4.38L22.33,2.96L23.04,3.67L21.62,5.09L20.91,4.38Z" />'
  e.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24">${svgBomb}</svg>`
  if (e.className === 'cell shown') {
    $(e).css('padding', '0px')
  }
}
/**
 * Recolors the bomb svgs according to the settings
 */
async function svgBombColor () {
  $('[data-mine]').each((i, e) => {
    $(e).find('svg path').attr('fill', storage[`bomb${titleCase(e.dataset.mine)}`])
  })
}
// </region>

// <region> Settings
/**
 * Sets the default settings in case they're undefined
 */
function defaultSettings () {
  if (!parseInt(storage.mines)) {
    difficulty.intermediate()
  }
  storage.bombRegularDefault = '#000000'
  storage.bombDetonatedDefault = '#FF1300'
  storage.bombFlaggedDefault = '#008100'
  storage.bombGuessedDefault = '#000083'

  storage.bombRegular = storage.bombRegular || storage.bombRegularDefault
  storage.bombDetonated = storage.bombDetonated || storage.bombDetonatedDefault
  storage.bombFlagged = storage.bombFlagged || storage.bombFlaggedDefault
  storage.bombGuessed = storage.bombGuessed || storage.bombGuessedDefault
}
/**
 * Prepares the settings overlay
 */
async function prepSettings () {
  $('#mainSettings')
  .css({
    width: $('#mainBoard tbody').width() - 2,
    height: $('#mainBoard tbody').height() - 2,
    top: $('#mainBoard').offset().top * 1.5 + $('#mainBoard thead').outerHeight()
  })

  $('#icons-demo [data-mine]')
  .each((i, e) => {
    svgAdd(e)
  })
  .mousedown(function (ev) {
    let stName = `bomb${titleCase(this.dataset.mine)}`
    if (ev.which === 1) {
      $(`[data-storage-value="${stName}"]`).get(0).click()
    } else if (ev.which === 3) {
      storage[stName] = storage[`${stName}Default`]
      this.value = storage[stName]
      svgBombColor()
    }
  })
  .contextmenu(() => { return false })

  $('[name="inp-mines"]').get(0).value = storage.mines
  $('[name="inp-mines"]').change((e) => {
    ev.target.value = clamp(ev.target.value, 1, (storage.width * storage.height) - 1)
    storage.mines = ev.target.value
  })

  $('[data-storage-value]')
  .each((i, e) => {
    e.value = storage[e.dataset.storageValue]
  })
  .change((ev) => {
    storage[ev.target.dataset.storageValue] = ev.target.value
    svgBombColor()
  })
}
/**
* Toggles the settings overlay
*/
function toggleOverlay () {
  $('[data-toggle]').get(0).dataset.toggle = $('[data-toggle]').get(0).dataset.toggle === 'false'
}
// </region>

// <region> Document
/**
 * The main load handler
 */
function load () {
  defaultSettings()
  prepBoard()
  prepSettings()
  svgBombColor()

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
