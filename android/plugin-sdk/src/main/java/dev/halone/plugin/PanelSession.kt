package dev.halone.plugin

import android.content.Context
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.Surface

/**
 * One open window of a plugin app, in Surface mode: the plugin draws into the
 * [Surface] it is given however it likes (a `Canvas`, GL, a `MediaCodec`) and
 * hears the wearer's input. For ordinary Android views, see [ViewPanelSession].
 *
 * Every callback runs on the main thread. A session goes attach, then any
 * number of resizes and detach/attach pairs, then close; it is never reused.
 */
abstract class PanelSession {
    /** The plugin's service. */
    lateinit var context: Context
        internal set

    lateinit var host: PanelHost
        internal set

    /** Set before [onAttach] and [onResize]. */
    var widthPx: Int = 0
        private set
    var heightPx: Int = 0
        private set
    var densityDpi: Int = PluginContract.DENSITY_DPI
        private set

    /** Start drawing into [surface], which stays valid until [onDetach] or [onClose]. */
    open fun onAttach(surface: Surface) {}

    /** [widthPx] and [heightPx] changed; the surface's buffers already have the new size. */
    open fun onResize() {}

    /** Stop drawing: the window is hidden, and the surface goes. Keep the state; [onAttach] may follow with a new one. */
    open fun onDetach() {}

    /** The window closed. Release everything. */
    open fun onClose() {}

    /**
     * A touch (tap, drag, scroll) or a mouse event (hover and its exit, wheel,
     * the middle button as `ACTION_BUTTON_PRESS` with `BUTTON_TERTIARY` held,
     * then `ACTION_BUTTON_RELEASE`) in panel pixels. Recycled after this returns.
     */
    open fun onMotionEvent(event: MotionEvent) {}

    /** A key from a physical keyboard while the window has it. */
    open fun onKeyEvent(event: KeyEvent) {}

    /** The wearer asked for a context menu at panel pixel ([x], [y]): a right click, a two-finger tap, a still hold. */
    open fun onContextMenu(x: Float, y: Float) {}

    /** The title bar's Back button was pressed, while [PanelHost.setBackButton] shows it. */
    open fun onBack() {}

    /** An edit from the phone's keyboard, while [PanelHost.showKeyboard] has it up. */
    open fun onTextInput(event: TextInputEvent) {}

    internal fun setSize(widthPx: Int, heightPx: Int, densityDpi: Int) {
        this.widthPx = widthPx
        this.heightPx = heightPx
        this.densityDpi = densityDpi
    }
}

/** The shell's handle on a session: every call hops to the main thread, in order, and nothing reaches a closed session. */
internal class PanelStub(
    private val session: PanelSession,
    private val hostBinder: IBinder,
    private val onClosed: (PanelStub) -> Unit,
) : IPanel.Stub() {
    private val main = Handler(Looper.getMainLooper())
    private var surface: Surface? = null
    private var closed = false
    private val death = IBinder.DeathRecipient { main.post { finish() } }

    init {
        runCatching { hostBinder.linkToDeath(death, 0) }.onFailure { main.post { finish() } }
    }

    override fun attach(surface: Surface, widthPx: Int, heightPx: Int, densityDpi: Int) = onMain {
        releaseSurface(notify = true)
        this.surface = surface
        session.setSize(widthPx, heightPx, densityDpi)
        session.onAttach(surface)
    }

    override fun resize(widthPx: Int, heightPx: Int, densityDpi: Int) = onMain {
        if (widthPx == session.widthPx && heightPx == session.heightPx && densityDpi == session.densityDpi) return@onMain
        session.setSize(widthPx, heightPx, densityDpi)
        session.onResize()
    }

    override fun detach() = onMain { releaseSurface(notify = true) }

    override fun close() = onMain { finish() }

    override fun dispatchMotion(event: MotionEvent) = onMain {
        try {
            session.onMotionEvent(event)
        } finally {
            event.recycle()
        }
    }

    override fun dispatchKey(event: KeyEvent) = onMain { session.onKeyEvent(event) }

    override fun contextMenu(x: Float, y: Float) = onMain { session.onContextMenu(x, y) }

    override fun back() = onMain { session.onBack() }

    override fun dispatchTextInput(event: android.os.Bundle) {
        val parsed = TextInputEvent.fromBundle(event) ?: return
        onMain { session.onTextInput(parsed) }
    }

    /** Closes the session from the plugin's side, as when its service goes. */
    fun finish() {
        if (closed) return
        closed = true
        runCatching { hostBinder.unlinkToDeath(death, 0) }
        session.onClose()
        releaseSurface(notify = false)
        onClosed(this)
    }

    private fun releaseSurface(notify: Boolean) {
        val current = surface ?: return
        if (notify) session.onDetach()
        surface = null
        current.release()
    }

    private inline fun onMain(crossinline block: () -> Unit) {
        main.post { if (!closed) block() }
    }
}
