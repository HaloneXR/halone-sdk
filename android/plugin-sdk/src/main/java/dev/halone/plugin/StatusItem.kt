package dev.halone.plugin

import android.graphics.Bitmap
import android.os.Bundle
import java.io.ByteArrayOutputStream

/**
 * An item in the dock's status area, beside the clock and the battery, kept
 * up to date by the plugin with [PanelProviderService.setStatusItem]: a
 * signal meter, a sync state. A click reaches
 * [PanelProviderService.onStatusItemClicked].
 */
data class StatusItem(
    /** The plugin's own name for it; setting the same id again replaces it. */
    val id: String,
    /** Drawn about 28 px tall; scaled down to [MAX_ICON_PX] if larger. */
    val icon: Bitmap,
    /** What hovering it says. */
    val label: String = "",
    /** A few characters beside the icon, such as `5G`. */
    val text: String = "",
    /** Drawn in the dock's text colour from the icon's alpha, like the battery; false keeps its own colours. */
    val tinted: Boolean = true,
) {
    internal fun toBundle() = Bundle().apply {
        val scaled = if (icon.width > MAX_ICON_PX || icon.height > MAX_ICON_PX) {
            val scale = MAX_ICON_PX.toFloat() / maxOf(icon.width, icon.height)
            Bitmap.createScaledBitmap(icon, maxOf(1, (icon.width * scale).toInt()), maxOf(1, (icon.height * scale).toInt()), true)
        } else {
            icon
        }
        putByteArray(PluginContract.KEY_STATUS_ICON, ByteArrayOutputStream().also { scaled.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray())
        putString(PluginContract.KEY_STATUS_LABEL, label)
        putString(PluginContract.KEY_STATUS_TEXT, text)
        putBoolean(PluginContract.KEY_STATUS_TINTED, tinted)
    }

    companion object {
        const val MAX_ICON_PX = 96
    }
}
