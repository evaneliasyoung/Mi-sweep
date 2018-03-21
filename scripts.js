/**
 * @author    Evan Young
 * @copyright Evan Young 2018
 * @file      Budget Minesweeper
 */

// <region> Variables
const $ = window.$
window.version = `Archaeus Beta 5 (2.0.0-b5)`
window.compats = {}
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
/**
 * Generates a random number in the range inclusively
 * @param  {Number} mn The minimum
 * @param  {Number} mx The maximum
 * @return {Number}    The random number in range
 */
function randInt (mn, mx) {
  return Math.round(Math.random() * (mx - mn) + mn)
}
// </region>

// <region> Board
/**
 * Places the mines on the board
 * @param  {Cell} [pe=undefined] The protected cell
 */
function genBoard (pe = undefined) {
  window.left = window.storage.mines
  for (let m = 0; m < window.storage.mines; m++) {
    let x, y, e
    do {
      x = randInt(0, window.storage.width - 1)
      y = randInt(0, window.storage.height - 1)
      e = $('#mainBoard tbody tr').eq(y).find('td').get(x)
    } while (e.dataset.mine || e === pe)
    e.dataset.mine = 'regular'
  }
}
/**
 * Inserts the markup and the listeners for the minefield
 */
function prepBoard () {
  $('#mainBoard thead tr td').attr('colspan', window.storage.width)
  $('#timer').text('00:00:00')
  $('#flags span').text(window.storage.mines)
  $('#flags img').click(toggleOverlay)
  $('#reset img')
    .attr('src', 'images/face-happy.svg')
    .click(reload)

  $('#mainBoard tbody').html(`
    <tr>
      ${'<td class="cell" data-shown="false" data-flagged="default"></td>'.repeat(window.storage.width)}
    </tr>
  `.repeat(window.storage.height))

  $('.cell')
    .mousedown((ev) => {
      switch (ev.which) {
        case 1:
          revealCell(ev.target)
          break
        case 2:
          hintCell(ev.target)
          break
        case 3:
          flagCell(ev.target)
          break
      }
      if ($('[data-flagged="flagged"][data-mine]').length === parseInt(window.storage.mines)) { winGame() }
    })
    .contextmenu(() => {
      return false
    })
}
/**
 * Shakes the board when a bomb is detonated
 * @param  {Number} [int=5] The intensity
 * @param  {Number} [dur=1] The duration in seconds
 */
function shakeBoard (int = 5, dur = 0.5) {
  let fr = 100

  for (let i = 0; i < fr; i++) {
    setTimeout(() => {
      $('#mainBoard').css('transform', `translate(${randInt(0, int)}px, ${randInt(0, int)}px)`)
    }, i * dur * 10)
  }
  setTimeout(() => {
    $('#mainBoard').css('transform', 'translate(0px, 0px)')
  }, (fr + 1) * dur * 10)
}
/**
 * Ends the game
 * @param  {String} face The new face
 */
function endGame (face) {
  window.end = new Date()
  $('.cell:not([data-shown="true"])').each((i, e) => { revealCell(e) })
  $('#reset img').attr('src', `images/face-${face}.svg`)
  svgBombColor()
}
/**
 * Loses the game
 */
function loseGame () {
  if (!window.end) {
    if (window.storage.explodeShake === 'true') { shakeBoard() }
    endGame('dead')
  }
}
/**
 * Wins the game
 */
function winGame () {
  if (!window.end) {
    endGame('cool')
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
  return $('#mainBoard tbody tr').eq(y).find('td').get(x)
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
  let xMin = clamp(x - 1, 0, window.storage.width - 1)
  let xMax = clamp(x + 1, 0, window.storage.width - 1)
  let yMin = clamp(y - 1, 0, window.storage.height - 1)
  let yMax = clamp(y + 1, 0, window.storage.height - 1)
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
  if (e.dataset.flagged === 'flagged' && !window.end) { return false }

  if (!window.start) {
    genBoard(e)
    window.start = new Date()
  }

  if (window.end && window.storage.postShown === 'true') {
    e.dataset.shown = 'post'
  } else {
    e.dataset.shown = 'true'
  }

  if (e.dataset.mine) {
    svgAdd(e)
    if (!window.end) {
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
        if (a.dataset.shown === 'false') { revealCell(a) }
      }
    } else if (e.dataset.flagged !== 'flagged') {
      e.innerText = near
    }
  }
  // Game ending AND Cell has a mine OR Game not ending OR Guessed cell
  if ((window.end && e.dataset.mine) || !window.end || e.dataset.flagged === 'guessed') { flagCell(e, 0) }
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
  // Already shown AND no force flag OR no flag AND no flags left
  if ((e.dataset.shown !== 'false' && setFlag === undefined) || (window.left - 1 < 0 && cur === 0)) { return false }

  e.dataset.flagged = sts[nxt]
  if (!window.end) { window.left = window.storage.mines - $('[data-flagged="flagged"]').length }
  $('#flags span')
    .text(window.left)
    .get(0).title = `${$('[data-flagged="flagged"]').length} Marked\n${$('[data-flagged="guessed"]').length} Guess(es)`
}
function hintCell (e) {
  if (e.dataset.shown !== 'false' || window.hints <= 0 || !window.start) { return false }
  if (e.dataset.mine) {
    flagCell(e, 1)
  } else {
    revealCell(e)
  }
  window.hints--
}
// </region>

// <region> SVG Injection
/**
 * Adds the bomb svgs to the DOM
 * @param  {Element} e The parent element of the bomb
 */
function svgAdd (e) {
  let svgBomb = '<path d="M11.25,6A3.25,3.25 0 0,1 14.5,2.75A3.25,3.25 0 0,1 17.75,6C17.75,6.42 18.08,6.75 18.5,6.75C18.92,6.75 19.25,6.42 19.25,6V5.25H20.75V6A2.25,2.25 0 0,1 18.5,8.25A2.25,2.25 0 0,1 16.25,6A1.75,1.75 0 0,0 14.5,4.25A1.75,1.75 0 0,0 12.75,6H14V7.29C16.89,8.15 19,10.83 19,14A7,7 0 0,1 12,21A7,7 0 0,1 5,14C5,10.83 7.11,8.15 10,7.29V6H11.25M22,6H24V7H22V6M19,4V2H20V4H19M20.91,4.38L22.33,2.96L23.04,3.67L21.62,5.09L20.91,4.38Z" />'
  e.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24">${svgBomb}</svg>`

  if (e.dataset.shown !== 'false') { $(e).css('padding', '0px') }
}
/**
 * Recolors the bomb svgs according to the settings
 */
function svgBombColor () {
  $('[data-mine]').each((i, e) => {
    $(e).find('svg path').attr('fill', window.storage[`bomb${titleCase(e.dataset.mine)}`])
  })
}
// </region>

// <region> Settings
/**
 * Sets the default settings in case they're undefined
 */
function defaultSettings () {
  window.difficulty = {
    beginner: () => {
      window.storage.mines = 10
      window.storage.width = 8
      window.storage.height = 8
      reload()
    },
    intermediate: () => {
      window.storage.mines = 40
      window.storage.width = 16
      window.storage.height = 16
      reload()
    },
    expert: () => {
      window.storage.mines = 99
      window.storage.width = 30
      window.storage.height = 16
      reload()
    }
  }

  let defaults = {
    mines: 40,
    width: 16,
    height: 16,
    bombDefault: '#000000',
    bombDetonated: '#FF1300',
    bombFlagged: '#008100',
    bombGuessed: '#000083',
    postShown: false,
    explodeShake: false
  }
  for (let d in defaults) {
    window.storage[`${d}Default`] = defaults[d]
    window.storage[d] = window.storage[d] || window.storage[`${d}Default`]
  }
}
/**
 * Prepares the settings overlay
 */
function prepOverlay () {
  sizeOverlay()
  $('#icons-demo [data-mine]')
    .each((i, e) => {
      svgAdd(e)
    })
    .mousedown(function (ev) {
      let stName = `bomb${titleCase(this.dataset.mine)}`
      if (ev.which === 1) {
        $(`[data-storage-value="${stName}"]`).get(0).click()
      } else if (ev.which === 3) {
        window.storage[stName] = window.storage[`${stName}Default`]
        this.value = window.storage[stName]
        svgBombColor()
      }
    })
    .contextmenu(() => { return false })

  $('[name="inp-mines"]')
    .change((ev) => {
      ev.target.value = clamp(ev.target.value, 1, (window.storage.width * window.storage.height) - 1)
      window.storage.mines = ev.target.value
    })
    .get(0).value = window.storage.mines

  $('[data-storage-value]')
    .each((i, e) => {
      if (e.type !== 'checkbox') {
        e.value = window.storage[e.dataset.storageValue]
      } else {
        e.checked = window.storage[e.dataset.storageValue] === 'true'
      }
    })
    .change((ev) => {
      if (ev.target.type !== 'checkbox') {
        window.storage[ev.target.dataset.storageValue] = ev.target.value
      } else {
        window.storage[ev.target.dataset.storageValue] = ev.target.checked
      }
      svgBombColor()
    })

  $('#icons-demo').append(window.compats.color ? '<span class="sm">Click the bombs to change their colors</span>' : '')

  $('#misc-demo').append(`<br><span class="sm">Version ${window.version}</span>`)
}
/**
 * Sizes the settings overlay correctly
 */
function sizeOverlay () {
  $('#mainSettings')
    .css({
      width: $('#mainBoard tbody').width() - 4,
      height: $('#mainBoard tbody').height() - 4,
      top: $('#mainBoard').offset().top * 1.5 + $('#mainBoard thead').outerHeight()
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
 * Determines the compatibility of the browser
 */
function checkCompat () {
  try {
    let e = document.createElement('input')
    e.type = 'color'
    window.compats.color = true
  } catch (e) {
    window.compats.color = false
  }
  try {
    window.storage = window.localStorage
    window.compats.storage = true
  } catch (e) {
    window.storage = {}
    window.compats.storage = false
  }
}
/**
 * Updates the timer
 */
function updateTimer () {
  if (window.start && !window.end) {
    let diff, hour, min, sec
    diff = (new Date()) - window.start
    hour = Math.floor(diff / 1000 / 60 / 60)
    diff -= hour * 1000 * 60 * 60
    min = Math.floor(diff / 1000 / 60)
    diff -= min * 1000 * 60
    sec = Math.ceil(diff / 1000)

    $('#timer').text(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`)
  }
}
/**
 * Reloads the game
 */
function reload () {
  window.start = false
  window.end = false
  window.hints = 3

  prepBoard()
  sizeOverlay()
}
/**
 * The main load handler
 */
function load () {
  checkCompat()
  defaultSettings()
  prepOverlay()
  svgBombColor()
  reload()

  setInterval(updateTimer, 1000)
}
load()
// </region>
