{triggerAutocompletion, buildIMECompositionEvent, buildTextInputEvent} = require "./spec-helper"
_ = require "underscore-plus"
TestProvider = require "./lib/test-provider"

describe "Autocomplete", ->
  [completionDelay, editorView, editor, autocompleteManager, mainModule] = []

  beforeEach ->
    runs ->
      # Set to live completion
      atom.config.set "autocomplete-plus.enableAutoActivation", true
      atom.config.set "editor.fontSize", "16"

      # Set the completion delay
      completionDelay = 100
      atom.config.set "autocomplete-plus.autoActivationDelay", completionDelay
      completionDelay += 100 # Rendering

      workspaceElement = atom.views.getView(atom.workspace)
      jasmine.attachToDOM(workspaceElement)

  describe "when auto-activation is enabled", ->
    beforeEach ->
      runs -> atom.config.set "autocomplete-plus.enableAutoActivation", true

      waitsForPromise -> atom.workspace.open("sample.js").then (e) ->
        editor = e

      # Activate the package
      waitsForPromise -> atom.packages.activatePackage("autocomplete-plus").then (a) ->
        mainModule = a.mainModule
        autocompleteManager = mainModule.autocompleteManagers[0]

      runs ->
        editorView = atom.views.getView(editor)


    describe "on changed events", ->
      it "should attach when finding suggestions", ->
        expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

        # Trigger an autocompletion
        triggerAutocompletion editor
        advanceClock completionDelay
        expect(editorView.querySelector(".autocomplete-plus")).toExist()

        # Check suggestions
        suggestions = ["function", "if", "left", "shift"]
        [].forEach.call editorView.querySelectorAll(".autocomplete-plus li span"), (item, index) ->
          expect(item.innerText).toEqual suggestions[index]

      it "should not attach when not finding suggestions", ->
        expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

        # Trigger an autocompletion
        editor.moveToBottom()
        editor.insertText("x")
        advanceClock completionDelay
        expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

      it "should not update completions when composing characters", ->
        triggerAutocompletion editor
        advanceClock completionDelay

        autocompleteView = atom.views.getView(autocompleteManager)
        inputNode = autocompleteView.querySelector('input')

        spyOn(autocompleteManager, 'changeItems').andCallThrough()

        inputNode.value = "~"
        inputNode.setSelectionRange(0, 1)
        inputNode.dispatchEvent(buildIMECompositionEvent('compositionstart', target: inputNode))
        inputNode.dispatchEvent(buildIMECompositionEvent('compositionupdate', data: "~", target: inputNode))
        advanceClock completionDelay

        expect(autocompleteManager.changeItems).not.toHaveBeenCalled()

        inputNode.dispatchEvent(buildIMECompositionEvent('compositionend', target: inputNode))
        editorView.firstChild.dispatchEvent(buildTextInputEvent(data: 'ã', target: inputNode))

        expect(editor.lineTextForBufferRow(13)).toBe 'fã'

    describe "accepting suggestions", ->
      describe "when pressing enter while suggestions are visible", ->
        it "inserts the word and moves the cursor to the end of the word", ->
          editorView = editorView
          expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

          # Trigger an autocompletion
          triggerAutocompletion editor
          advanceClock completionDelay

          autocompleteView = atom.views.getView(autocompleteManager)
          # Accept suggestion
          atom.commands.dispatch autocompleteView, "autocomplete-plus:confirm"

          # Check for result
          expect(editor.getBuffer().getLastLine()).toEqual "function"

          # Check for cursor position
          bufferPosition = editor.getCursorBufferPosition()
          expect(bufferPosition.row).toEqual 13
          expect(bufferPosition.column).toEqual 8

        it "hides the suggestions", ->
          editorView = editorView
          expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

          # Trigger an autocompletion
          editor.moveToBottom()
          editor.moveToBeginningOfLine()
          editor.insertText("f")
          advanceClock completionDelay
          expect(editorView.querySelector(".autocomplete-plus")).toExist()

          # Accept suggestion
          autocompleteView = atom.views.getView(autocompleteManager)
          atom.commands.dispatch autocompleteView, "autocomplete-plus:confirm"

          expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

    describe "select-previous event", ->
      it "selects the previous item in the list", ->
        editorView = editorView

        # Trigger an autocompletion
        triggerAutocompletion editor
        advanceClock completionDelay

        items = editorView.querySelectorAll(".autocomplete-plus li")
        expect(items[0]).toHaveClass("selected")
        expect(items[1]).not.toHaveClass("selected")
        expect(items[2]).not.toHaveClass("selected")
        expect(items[3]).not.toHaveClass("selected")


        autocompleteView = atom.views.getView(autocompleteManager)
        # Select previous item
        atom.commands.dispatch autocompleteView, "autocomplete-plus:select-previous"

        items = editorView.querySelectorAll(".autocomplete-plus li")
        expect(items[0]).not.toHaveClass("selected")
        expect(items[1]).not.toHaveClass("selected")
        expect(items[2]).not.toHaveClass("selected")
        expect(items[3]).toHaveClass("selected")

    describe "select-next event", ->
      it "selects the next item in the list", ->
        editorView = editorView

        # Trigger an autocompletion
        triggerAutocompletion editor
        advanceClock completionDelay

        items = editorView.querySelectorAll(".autocomplete-plus li")
        expect(items[0]).toHaveClass("selected")
        expect(items[1]).not.toHaveClass("selected")
        expect(items[2]).not.toHaveClass("selected")
        expect(items[3]).not.toHaveClass("selected")

        # Select next item
        autocompleteView = atom.views.getView(autocompleteManager)
        atom.commands.dispatch autocompleteView, "autocomplete-plus:select-next"

        items = editorView.querySelectorAll(".autocomplete-plus li")
        expect(items[0]).not.toHaveClass("selected")
        expect(items[1]).toHaveClass("selected")
        expect(items[2]).not.toHaveClass("selected")
        expect(items[3]).not.toHaveClass("selected")

    describe "when a suggestion is clicked", ->
      it "should select the item and confirm the selection", ->
        editorView = editorView

        # Trigger an autocompletion
        triggerAutocompletion editor
        advanceClock completionDelay

        # Get the second item
        item = editorView.querySelectorAll(".autocomplete-plus li")[1]

        # Click the item, expect list to be hidden and
        # text to be added
        mouse = document.createEvent 'MouseEvents'
        mouse.initMouseEvent 'mousedown', true, true, window
        item.dispatchEvent mouse
        mouse = document.createEvent 'MouseEvents'
        mouse.initMouseEvent 'mouseup', true, true, window
        item.dispatchEvent mouse

        expect(editorView.querySelector(".autocomplete-plus")).not.toExist()
        expect(editor.getBuffer().getLastLine()).toEqual item.innerText

    describe ".cancel()", ->
      it "unbinds autocomplete event handlers for move-up and move-down", ->
        triggerAutocompletion editor, false
        autocompleteManager.cancel()

        atom.commands.dispatch atom.views.getView(editor), "core:move-down"
        expect(editor.getCursorBufferPosition().row).toBe 1

        atom.commands.dispatch atom.views.getView(editor) , "core:move-up"
        expect(editor.getCursorBufferPosition().row).toBe 0

  describe "when a long completion exists", ->
    beforeEach ->
      runs ->
        atom.config.set "autocomplete-plus.enableAutoActivation", true

      waitsForPromise -> atom.workspace.open("samplelong.js").then (e) ->
        editor = e

      # Activate the package
      waitsForPromise -> atom.packages.activatePackage("autocomplete-plus").then (a) ->
        mainModule = a.mainModule
        autocompleteManager = mainModule.autocompleteManagers[0]


    it "sets the width of the view to be wide enough to contain the longest completion without scrolling", ->
      editor.moveToBottom()
      editor.insertNewline()
      editor.insertText "t"
      advanceClock completionDelay

      autocompleteView = atom.views.getView(autocompleteManager)
      expect(autocompleteView.scrollWidth).toBe autocompleteView.offsetWidth

  describe "css", ->
    [css] = []

    beforeEach ->
      runs -> atom.config.set "autocomplete-plus.enableAutoActivation", true

      waitsForPromise -> atom.workspace.open("css.css").then (e) ->
        editor = e

      # Activate the package
      waitsForPromise -> atom.packages.activatePackage("language-css").then (c) -> css = c

      # Activate the package
      waitsForPromise -> atom.packages.activatePackage("autocomplete-plus").then (a) ->
        mainModule = a.mainModule
        autocompleteManager = mainModule.autocompleteManagers[0]

      runs ->
        editorView = atom.views.getView(editor)


    it "includes completions for the scope's completion preferences", ->
      runs ->
        editor.moveToEndOfLine()
        editor.insertText "o"
        editor.insertText "u"
        editor.insertText "t"

        advanceClock completionDelay

        autocompleteView = atom.views.getView(autocompleteManager)
        items = autocompleteView.querySelectorAll("li")
        expect(editorView.querySelector(".autocomplete-plus")).toExist()
        expect(items.length).toBe 10
        expect(items[0]).toHaveText "outline"
        expect(items[1]).toHaveText "outline-color"
        expect(items[2]).toHaveText "outline-width"
        expect(items[3]).toHaveText "outline-style"

  describe "when auto-activation is disabled", ->
    beforeEach ->
      runs ->
        atom.config.set "autocomplete-plus.enableAutoActivation", false

      waitsForPromise -> atom.workspace.open("sample.js").then (e) ->
        editor = e

      # Activate the package
      waitsForPromise -> atom.packages.activatePackage("autocomplete-plus").then (a) ->
        mainModule = a.mainModule
        autocompleteManager = mainModule.autocompleteManagers[0]

      runs ->


    it "does not show suggestions after a delay", ->
      triggerAutocompletion editor
      advanceClock completionDelay
      expect(editorView.querySelector(".autocomplete-plus")).not.toExist()

    it "shows suggestions when explicitly triggered", =>
      triggerAutocompletion editor
      advanceClock completionDelay

      editorView = atom.views.getView(editor);
      expect(editorView.querySelector(".autocomplete-plus")).not.toExist()
      atom.commands.dispatch editorView, "autocomplete-plus:activate"
      expect(editorView.querySelector(".autocomplete-plus")).toExist()

  describe "HTML label support", ->
    beforeEach ->
      waitsForPromise -> atom.workspace.open("sample.js").then (e) ->
        editor = e

      # Activate the package
      waitsForPromise -> atom.packages.activatePackage("autocomplete-plus").then (a) ->
        mainModule = a.mainModule
        autocompleteManager = mainModule.autocompleteManagers[0]

      runs ->
        editorView = atom.workspace.getActiveTextEditor()

    it "should allow HTML in labels", ->
      runs ->
        # Register the test provider
        testProvider = new TestProvider(editor)
        mainModule.registerProviderForEditor testProvider, editor

        editor.moveToBottom()
        editor.insertText "o"

        advanceClock completionDelay

        autocompleteView = atom.views.getView(autocompleteManager)

        expect(autocompleteView.querySelector("li .label")).toHaveHtml "<span style=\"color: red\">ohai</span>"
        expect(autocompleteView.querySelector("li")).toHaveClass "ohai"
