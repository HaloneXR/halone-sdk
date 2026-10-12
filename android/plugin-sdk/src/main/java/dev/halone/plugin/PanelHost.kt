package dev.halone.plugin

import android.os.RemoteException

/**
 * The window a panel is shown in, as the shell's `halone.windows` gives it to
 * a web app. Calls never block; once the shell is gone they do nothing.
 */
class PanelHost internal constructor(private val remote: IPanelHost) {
    fun setTitle(title: String) = call { remote.setTitle(title) }

    /** Closes the window, which closes the panel's session. */
    fun close() = call { remote.close() }

    /** Brings the window to the front and turns the wearer's view to it, as a click in the dock does. */
    fun focus() = call { remote.focus() }

    /** Shows or hides a Back button in the window's title bar; pressing it calls [PanelSession.onBack]. */
    fun setBackButton(visible: Boolean) = call { remote.setBackButton(visible) }

    /** Pinned windows stay where they are in the room instead of following the wearer. */
    fun setPinned(pinned: Boolean) = call { remote.setPinned(pinned) }

    /** Asks for a new size, which the shell keeps within the window's limits; [PanelSession.onResize] follows. */
    fun requestResize(widthPx: Int, heightPx: Int) = call { remote.requestResize(widthPx, heightPx) }

    fun setSizeLimits(minWidthPx: Int, minHeightPx: Int, maxWidthPx: Int, maxHeightPx: Int) =
        call { remote.setSizeLimits(minWidthPx, minHeightPx, maxWidthPx, maxHeightPx) }

    /**
     * Brings up the phone's keyboard for a field of this panel; what it types
     * arrives in [PanelSession.onTextInput]. Nothing comes up while a physical
     * keyboard is connected, whose keys arrive as key events as always.
     */
    fun showKeyboard(request: KeyboardRequest) = call { remote.showKeyboard(request.toBundle()) }

    fun hideKeyboard() = call { remote.hideKeyboard() }

    /** Tells the keyboard what the field holds now, after a change it did not make: a tap moving the cursor, a key. */
    fun updateKeyboard(state: KeyboardState) = call { remote.updateKeyboard(state.toBundle()) }

    private inline fun call(block: () -> Unit) {
        try {
            block()
        } catch (_: RemoteException) {
        }
    }
}
