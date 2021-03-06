{Subscriber} = require 'emissary'

module.exports =
class GitDiffView
  Subscriber.includeInto(this)

  classes: ['git-line-added', 'git-line-modified', 'git-line-removed']

  constructor: (@editorView) ->
    {@editor, @gutter} = @editorView
    @diffs = {}

    @subscribe @editorView, 'editor:path-changed', @subscribeToBuffer
    @subscribe @editorView, 'editor:display-updated', @renderDiffs
    @subscribe atom.project.getRepo(), 'statuses-changed', =>
      @diffs = {}
      @scheduleUpdate()
    @subscribe atom.project.getRepo(), 'status-changed', (path) =>
      delete @diffs[path]
      @scheduleUpdate() if path is @editor.getPath()

    @subscribeToBuffer()

    @subscribe @editorView, 'editor:will-be-removed', =>
      @unsubscribe()
      @unsubscribeFromBuffer()

    @subscribeToCommand @editorView, 'git-diff:move-to-next-diff', =>
      @moveToNextDiff()
    @subscribeToCommand @editorView, 'git-diff:move-to-previous-diff', =>
      @moveToPreviousDiff()

  moveToNextDiff: ->
    cursorLineNumber = @editor.getCursorBufferPosition().row + 1
    nextDiffLineNumber = null
    hunks = @diffs[@editor.getPath()] ? []
    for {newStart} in hunks when newStart > cursorLineNumber
      if nextDiffLineNumber?
        nextDiffLineNumber = Math.min(newStart - 1, nextDiffLineNumber)
      else
        nextDiffLineNumber = newStart - 1

    @moveToLineNumber(nextDiffLineNumber)

  moveToPreviousDiff: ->
    cursorLineNumber = @editor.getCursorBufferPosition().row + 1
    previousDiffLineNumber = -1
    hunks = @diffs[@editor.getPath()] ? []
    for {newStart} in hunks when newStart < cursorLineNumber
      previousDiffLineNumber = Math.max(newStart - 1, previousDiffLineNumber)

    @moveToLineNumber(previousDiffLineNumber)

  moveToLineNumber: (lineNumber=-1) ->
    if lineNumber >= 0
      @editor.setCursorBufferPosition([lineNumber, 0])
      @editor.moveCursorToFirstCharacterOfLine()
    else
      atom.beep()

  unsubscribeFromBuffer: ->
    if @buffer?
      @removeDiffs()
      delete @diffs[@buffer.getPath()] if @buffer.destroyed
      @buffer.off 'contents-modified', @updateDiffs
      @buffer = null

  subscribeToBuffer: =>
    @unsubscribeFromBuffer()

    if @buffer = @editor.getBuffer()
      @scheduleUpdate() unless @diffs[@buffer.getPath()]?
      @buffer.on 'contents-modified', @updateDiffs

  scheduleUpdate: ->
    setImmediate(@updateDiffs)

  updateDiffs: =>
    return unless @buffer?
    @generateDiffs()
    @renderDiffs()

  generateDiffs: ->
    if path = @buffer.getPath()
      @diffs[path] = atom.project.getRepo()?.getLineDiffs(path, @buffer.getText())

  removeDiffs: =>
    if @gutter.hasGitLineDiffs
      @gutter.removeClassFromAllLines(klass) for klass in @classes
      @gutter.hasGitLineDiffs = false

  renderDiffs: =>
    return unless @gutter.isVisible()

    @removeDiffs()

    hunks = @diffs[@editor.getPath()] ? []
    linesHighlighted = false
    for {oldStart, newStart, oldLines, newLines} in hunks
      if oldLines is 0 and newLines > 0
        for row in [newStart...newStart + newLines]
          linesHighlighted |= @gutter.addClassToLine(row - 1, 'git-line-added')
      else if newLines is 0 and oldLines > 0
        linesHighlighted |= @gutter.addClassToLine(newStart - 1, 'git-line-removed')
      else
        for row in [newStart...newStart + newLines]
          linesHighlighted |= @gutter.addClassToLine(row - 1, 'git-line-modified')
    @gutter.hasGitLineDiffs = linesHighlighted
