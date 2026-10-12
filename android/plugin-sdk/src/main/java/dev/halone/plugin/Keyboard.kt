package dev.halone.plugin

import android.os.Bundle
import android.text.InputType
import android.view.inputmethod.EditorInfo

/**
 * What the phone's keyboard is about to type into, for [PanelHost.showKeyboard]:
 * the field's kind and action as an `EditorInfo` gives them, and what it holds.
 */
data class KeyboardRequest(
    val inputType: Int = InputType.TYPE_CLASS_TEXT,
    val imeOptions: Int = EditorInfo.IME_ACTION_DONE,
    val hint: String = "",
    val state: KeyboardState = KeyboardState(),
) {
    fun toBundle() = state.toBundle().apply {
        putInt(INPUT_TYPE, inputType)
        putInt(IME_OPTIONS, imeOptions)
        putString(HINT, hint)
    }

    companion object {
        private const val INPUT_TYPE = "inputType"
        private const val IME_OPTIONS = "imeOptions"
        private const val HINT = "hint"

        fun fromBundle(bundle: Bundle) = KeyboardRequest(
            inputType = bundle.getInt(INPUT_TYPE, InputType.TYPE_CLASS_TEXT),
            imeOptions = bundle.getInt(IME_OPTIONS, EditorInfo.IME_ACTION_DONE),
            hint = bundle.getString(HINT).orEmpty(),
            state = KeyboardState.fromBundle(bundle),
        )
    }
}

/**
 * The field's text and selection, as the plugin has them. The keyboard keeps a
 * copy to offer suggestions and corrections from; [PanelHost.updateKeyboard]
 * puts it right whenever the field changes other than by the keyboard.
 */
data class KeyboardState(val text: String = "", val selectionStart: Int = text.length, val selectionEnd: Int = selectionStart) {
    fun toBundle() = Bundle().apply {
        putString(TEXT, text)
        putInt(SELECTION_START, selectionStart)
        putInt(SELECTION_END, selectionEnd)
    }

    companion object {
        private const val TEXT = "text"
        private const val SELECTION_START = "selectionStart"
        private const val SELECTION_END = "selectionEnd"
        private const val MAX_TEXT = 100_000

        fun fromBundle(bundle: Bundle): KeyboardState {
            val text = bundle.getString(TEXT).orEmpty().take(MAX_TEXT)
            val start = bundle.getInt(SELECTION_START, text.length).coerceIn(0, text.length)
            return KeyboardState(text, start, bundle.getInt(SELECTION_END, start).coerceIn(0, text.length))
        }
    }
}

/**
 * One edit from the phone's keyboard, as its `InputConnection` made it. Keys
 * it sends as keys (delete, enter on some keyboards) arrive as key events.
 * Positions are in UTF-16 units of the field's text.
 */
sealed class TextInputEvent {
    /** Replaces the composing text, or the selection, with [text]; see `InputConnection.commitText`. */
    data class Commit(val text: String, val newCursorPosition: Int) : TextInputEvent()

    /** Replaces the composing text, or the selection, with [text] and keeps it composing. */
    data class Compose(val text: String, val newCursorPosition: Int) : TextInputEvent()

    /** Marks the existing text from [start] to [end] as composing. */
    data class ComposingRegion(val start: Int, val end: Int) : TextInputEvent()

    /** The composing text stays as it is. */
    object FinishComposing : TextInputEvent()

    /** Deletes [before] units before the selection and [after] after it. */
    data class DeleteSurrounding(val before: Int, val after: Int) : TextInputEvent()

    data class Select(val start: Int, val end: Int) : TextInputEvent()

    /** The keyboard's action key: an `EditorInfo.IME_ACTION_*`. */
    data class EditorAction(val actionId: Int) : TextInputEvent()

    /** The wearer put the keyboard away. */
    object Dismissed : TextInputEvent()

    fun toBundle(): Bundle = Bundle().apply {
        when (val event = this@TextInputEvent) {
            is Commit -> put(COMMIT, text = event.text, a = event.newCursorPosition)
            is Compose -> put(COMPOSE, text = event.text, a = event.newCursorPosition)
            is ComposingRegion -> put(COMPOSING_REGION, a = event.start, b = event.end)
            FinishComposing -> put(FINISH_COMPOSING)
            is DeleteSurrounding -> put(DELETE_SURROUNDING, a = event.before, b = event.after)
            is Select -> put(SELECT, a = event.start, b = event.end)
            is EditorAction -> put(EDITOR_ACTION, a = event.actionId)
            Dismissed -> put(DISMISSED)
        }
    }

    private fun Bundle.put(type: String, text: String? = null, a: Int = 0, b: Int = 0) {
        putString(TYPE, type)
        text?.let { putString(TEXT, it) }
        putInt(A, a)
        putInt(B, b)
    }

    companion object {
        private const val TYPE = "type"
        private const val TEXT = "text"
        private const val A = "a"
        private const val B = "b"
        private const val COMMIT = "commit"
        private const val COMPOSE = "compose"
        private const val COMPOSING_REGION = "composingRegion"
        private const val FINISH_COMPOSING = "finishComposing"
        private const val DELETE_SURROUNDING = "deleteSurrounding"
        private const val SELECT = "select"
        private const val EDITOR_ACTION = "editorAction"
        private const val DISMISSED = "dismissed"

        /** Null for a kind of event this version does not know, which a plugin ignores. */
        fun fromBundle(bundle: Bundle): TextInputEvent? {
            val text = bundle.getString(TEXT).orEmpty()
            val a = bundle.getInt(A)
            val b = bundle.getInt(B)
            return when (bundle.getString(TYPE)) {
                COMMIT -> Commit(text, a)
                COMPOSE -> Compose(text, a)
                COMPOSING_REGION -> ComposingRegion(a, b)
                FINISH_COMPOSING -> FinishComposing
                DELETE_SURROUNDING -> DeleteSurrounding(a, b)
                SELECT -> Select(a, b)
                EDITOR_ACTION -> EditorAction(a)
                DISMISSED -> Dismissed
                else -> null
            }
        }
    }
}
