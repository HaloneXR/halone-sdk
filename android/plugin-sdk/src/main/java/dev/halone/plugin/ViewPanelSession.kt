package dev.halone.plugin

import android.app.Presentation
import android.content.Context
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.Surface
import android.view.View
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputConnection
import android.widget.TextView

/**
 * A session in View mode: [onCreateView]'s views, laid out at the window's
 * size and drawn into its surface, with taps, scrolls, the wheel, hover and
 * keys delivered to them as on a phone screen. A text field that takes focus
 * brings up the phone's keyboard, which types into it through the field's own
 * `InputConnection`, so composition and corrections work as on the phone.
 *
 * The views live on a private virtual display in the plugin's process, in a
 * `Presentation`, which keeps them hardware accelerated. Hiding the window
 * keeps them: the display only loses its surface.
 */
abstract class ViewPanelSession : PanelSession() {
    /** The theme the views are inflated with. */
    open val themeResId: Int = android.R.style.Theme_DeviceDefault_NoActionBar

    /** The content, built once, with a context carrying the panel's display and [themeResId]. */
    abstract fun onCreateView(context: Context): View

    var view: View? = null
        private set

    private var display: VirtualDisplay? = null
    private var presentation: Presentation? = null
    private var closing = false
    private var typingInto: View? = null
    private var connection: InputConnection? = null
    private val focusListener = ViewTreeObserver.OnGlobalFocusChangeListener { _, focused -> onFocusChanged(focused) }

    override fun onAttach(surface: Surface) {
        val existing = display
        if (existing != null) {
            existing.resize(widthPx, heightPx, densityDpi)
            existing.surface = surface
            layOut()
            return
        }
        val manager = context.getSystemService(DisplayManager::class.java)
        val created = manager.createVirtualDisplay(
            "halone-plugin-${hashCode()}",
            widthPx,
            heightPx,
            densityDpi,
            surface,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_PRESENTATION or DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY,
        ) ?: error("createVirtualDisplay returned null")
        display = created
        present(created)
    }

    /** Shows the views in a new `Presentation` on [target], again if Android dismisses it, as some versions do when the display changes size. */
    private fun present(target: VirtualDisplay) {
        val shown = Presentation(context, target.display, themeResId)
        val root = view ?: onCreateView(shown.context).also { view = it }
        (root.parent as? ViewGroup)?.removeView(root)
        shown.setContentView(root, ViewGroup.LayoutParams(widthPx, heightPx))
        shown.setOnDismissListener {
            if (presentation === shown && !closing) {
                android.util.Log.i(LOG_TAG, "presentation dismissed by Android at ${widthPx}x$heightPx; showing the same views again")
                presentation = null
                display?.let(::present)
            }
        }
        presentation = shown
        shown.show()
        shown.window?.decorView?.viewTreeObserver?.addOnGlobalFocusChangeListener(focusListener)
    }

    override fun onResize() {
        display?.resize(widthPx, heightPx, densityDpi)
        layOut()
    }

    /** In place: once shown, the params are the Presentation's own subclass, and plain ones break its measure. */
    private fun layOut() {
        val root = view ?: return
        val params = root.layoutParams ?: return
        if (params.width == widthPx && params.height == heightPx) return
        params.width = widthPx
        params.height = heightPx
        root.layoutParams = params
    }

    override fun onDetach() {
        display?.surface = null
    }

    override fun onClose() {
        closing = true
        stopTyping()
        presentation?.dismiss()
        presentation = null
        display?.release()
        display = null
        view = null
    }

    override fun onMotionEvent(event: MotionEvent) {
        val shown = presentation ?: return
        val generic = event.isFromSource(InputDevice.SOURCE_CLASS_POINTER) && event.actionMasked in GENERIC_ACTIONS
        if (generic) shown.dispatchGenericMotionEvent(event) else shown.dispatchTouchEvent(event)
        if (event.actionMasked != MotionEvent.ACTION_UP) return
        val focused = shown.currentFocus
        val reopens = typingInto == null && focused != null && focused.onCheckIsTextEditor() && contains(focused, event.x, event.y)
        if (reopens) startTyping(focused!!) else reportKeyboard()
    }

    private fun contains(view: View, x: Float, y: Float): Boolean {
        val location = IntArray(2).also(view::getLocationInWindow)
        return x >= location[0] && y >= location[1] && x < location[0] + view.width && y < location[1] + view.height
    }

    override fun onKeyEvent(event: KeyEvent) {
        presentation?.dispatchKeyEvent(event)
        reportKeyboard()
    }

    private fun onFocusChanged(focused: View?) {
        if (focused != null && focused.onCheckIsTextEditor()) {
            if (focused !== typingInto) startTyping(focused)
        } else if (typingInto != null) {
            stopTyping()
            host.hideKeyboard()
        }
    }

    private fun startTyping(field: View) {
        val info = EditorInfo()
        val created = field.onCreateInputConnection(info) ?: return
        typingInto = field
        connection = created
        host.showKeyboard(KeyboardRequest(info.inputType, info.imeOptions, info.hintText?.toString().orEmpty(), stateOf(field)))
    }

    private fun stopTyping() {
        typingInto = null
        connection = null
    }

    private fun stateOf(field: View): KeyboardState {
        val text = (field as? TextView)?.text?.toString() ?: return KeyboardState()
        return KeyboardState(text, field.selectionStart.coerceAtLeast(0), field.selectionEnd.coerceAtLeast(0))
    }

    /** After a tap or a key, which may have moved the cursor or changed the text, once the field has taken it. */
    private fun reportKeyboard() {
        val field = typingInto ?: return
        field.post { if (typingInto === field) host.updateKeyboard(stateOf(field)) }
    }

    override fun onTextInput(event: TextInputEvent) {
        val target = connection ?: return
        when (event) {
            is TextInputEvent.Commit -> target.commitText(event.text, event.newCursorPosition)
            is TextInputEvent.Compose -> target.setComposingText(event.text, event.newCursorPosition)
            is TextInputEvent.ComposingRegion -> target.setComposingRegion(event.start, event.end)
            TextInputEvent.FinishComposing -> target.finishComposingText()
            is TextInputEvent.DeleteSurrounding -> target.deleteSurroundingText(event.before, event.after)
            is TextInputEvent.Select -> target.setSelection(event.start, event.end)
            is TextInputEvent.EditorAction -> {
                target.performEditorAction(event.actionId)
                if (event.actionId == EditorInfo.IME_ACTION_DONE) host.hideKeyboard()
            }
            TextInputEvent.Dismissed -> stopTyping()
        }
    }

    /** Long-presses the innermost view under the point that takes one, or opens its context menu. */
    override fun onContextMenu(x: Float, y: Float) {
        var target = view?.let { viewAt(it, x, y) }
        while (target != null) {
            val location = IntArray(2).also(target::getLocationInWindow)
            val localX = x - location[0]
            val localY = y - location[1]
            if (target.isLongClickable && target.performLongClick(localX, localY)) return
            if (target.showContextMenu(localX, localY)) return
            target = target.parent as? View
        }
    }

    private fun viewAt(root: View, x: Float, y: Float): View? {
        if (root.visibility != View.VISIBLE) return null
        val location = IntArray(2).also(root::getLocationInWindow)
        if (x < location[0] || y < location[1] || x >= location[0] + root.width || y >= location[1] + root.height) return null
        if (root is ViewGroup) {
            for (i in root.childCount - 1 downTo 0) viewAt(root.getChildAt(i), x, y)?.let { return it }
        }
        return root
    }

    private companion object {
        const val LOG_TAG = "HalonePlugin"
        val GENERIC_ACTIONS = setOf(
            MotionEvent.ACTION_HOVER_ENTER,
            MotionEvent.ACTION_HOVER_MOVE,
            MotionEvent.ACTION_HOVER_EXIT,
            MotionEvent.ACTION_SCROLL,
            MotionEvent.ACTION_BUTTON_PRESS,
            MotionEvent.ACTION_BUTTON_RELEASE,
        )
    }
}
