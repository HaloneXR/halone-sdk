package dev.halone.plugin

/** What a plugin and the shell agree on outside the AIDL: how one finds the other, and the keys of an app's description. */
object PluginContract {
    /** Raised whenever a method is added to the AIDL; the shell binds plugins from 1 up to its own. */
    const val VERSION = 2

    /** The intent action of a plugin's [PanelProviderService]. */
    const val ACTION_PANEL_PROVIDER = "dev.halone.action.PANEL_PROVIDER"

    /** Defined by the shell, signature-level; a plugin's service must require it, so only the shell can bind it. */
    const val PERMISSION_BIND = "dev.halone.permission.BIND_PANEL_PROVIDER"

    /** Service meta-data: the contract version the plugin was built against. */
    const val META_CONTRACT = "dev.halone.plugin.CONTRACT"

    /**
     * Service meta-data, from contract 2: a raw JSON resource listing the
     * plugin's settings, which the shell shows under Settings > Plugins and
     * hands to [PanelProviderService.onSettingsChanged]; see `README.md`.
     */
    const val META_SETTINGS = "dev.halone.plugin.SETTINGS"

    /** Panels are laid out at this density, so one dp is one panel pixel, as one CSS pixel is in a web app. */
    const val DENSITY_DPI = 160

    const val KEY_ID = "id"
    const val KEY_NAME = "name"
    const val KEY_DESCRIPTION = "description"
    const val KEY_WIDTH = "widthPx"
    const val KEY_HEIGHT = "heightPx"
    const val KEY_HIDDEN = "hidden"
    const val KEY_ICON_VERSION = "iconVersion"
    const val KEY_COLOR = "color"

    const val KEY_STATUS_ICON = "icon"
    const val KEY_STATUS_LABEL = "label"
    const val KEY_STATUS_TEXT = "text"
    const val KEY_STATUS_TINTED = "tinted"
}
