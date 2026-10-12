package dev.halone.plugin

import android.os.Bundle

/**
 * One app a plugin offers in the launcher. [id] is the plugin's own name for
 * it, stable across versions, since the wearer pins apps by it.
 */
data class PluginApp(
    val id: String,
    val name: String,
    val description: String = "",
    /** The window's size when it opens, in panel pixels (dp). */
    val widthPx: Int = 1024,
    val heightPx: Int = 768,
    /** A drawable resource of the plugin's, or 0 for the plugin's own icon. */
    val icon: Int = 0,
    /** Listed for opening by the shell, not shown in the launcher. */
    val hidden: Boolean = false,
    /** Changes whenever the icon does, so the shell fetches it again; null means the plugin's version. */
    val iconVersion: String? = null,
    /** The tile's colour in the launcher, as an opaque `0xFFRRGGBB`; null leaves it to the launcher. */
    val color: Int? = null,
) {
    internal fun toBundle(defaultIconVersion: String) = Bundle().apply {
        putString(PluginContract.KEY_ID, id)
        putString(PluginContract.KEY_NAME, name)
        putString(PluginContract.KEY_DESCRIPTION, description)
        putInt(PluginContract.KEY_WIDTH, widthPx)
        putInt(PluginContract.KEY_HEIGHT, heightPx)
        putBoolean(PluginContract.KEY_HIDDEN, hidden)
        putString(PluginContract.KEY_ICON_VERSION, iconVersion ?: defaultIconVersion)
        color?.let { putInt(PluginContract.KEY_COLOR, it) }
    }
}
