package dev.halone.plugin

import android.app.Service
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.Drawable
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.RemoteException
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutionException
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * A plugin: the service the shell binds to list its apps and open their
 * windows. Declare it in the plugin's manifest with the intent action
 * [PluginContract.ACTION_PANEL_PROVIDER], the permission
 * [PluginContract.PERMISSION_BIND] (the shell refuses a service without it)
 * and the meta-data [PluginContract.META_CONTRACT]; see `README.md`.
 *
 * [apps] and [createSession] run on the main thread.
 */
abstract class PanelProviderService : Service() {
    private val main = Handler(Looper.getMainLooper())
    private val sessions = LinkedHashSet<PanelStub>()
    private val statusItems = LinkedHashMap<String, Bundle>()

    @Volatile
    private var providerHost: IProviderHost? = null

    /** The apps to show in the launcher, now. Call [appsChanged] when the answer changes. */
    abstract fun apps(): List<PluginApp>

    /** A new window of app [appId]; [args] are what [openPanel] passed, or empty from the launcher. Null refuses it. */
    abstract fun createSession(appId: String, args: Bundle): PanelSession?

    /** App [appId]'s icon at [sizePx] square. Runs on a binder thread. */
    open fun appIcon(appId: String, sizePx: Int): Bitmap? {
        val app = onMain { apps() }.firstOrNull { it.id == appId } ?: return null
        val drawable = if (app.icon != 0) getDrawable(app.icon) else applicationInfo.loadIcon(packageManager)
        return drawable?.let { render(it, sizePx) }
    }

    /** Tells the shell to list the apps again. */
    fun appsChanged() = callHost { it.appsChanged() }

    /** Asks the shell for a new window of app [appId], which [createSession] then opens with [args]. */
    fun openPanel(appId: String, args: Bundle = Bundle()) = callHost { it.openPanel(appId, args) }

    /**
     * Opens app [appId] as the launcher does: brings its window to the front
     * if it has one, otherwise opens one with [args]. Hidden apps open too.
     */
    fun launchApp(appId: String, args: Bundle = Bundle()) = callHost { it.launchApp(appId, args) }

    /**
     * Shows [item] in the dock, or replaces the one with its id. Kept while
     * the plugin runs: set before the shell connects, it appears once it does.
     * Main thread.
     */
    fun setStatusItem(item: StatusItem) {
        val bundle = item.toBundle()
        statusItems[item.id] = bundle
        callHost { it.setStatusItem(item.id, bundle) }
    }

    fun removeStatusItem(id: String) {
        if (statusItems.remove(id) == null) return
        callHost { it.removeStatusItem(id) }
    }

    /** The wearer clicked status item [id]. Main thread. */
    open fun onStatusItemClicked(id: String) {}

    final override fun onBind(intent: Intent): IBinder = binder

    override fun onUnbind(intent: Intent): Boolean {
        providerHost = null
        closeAll()
        return false
    }

    override fun onDestroy() {
        closeAll()
        super.onDestroy()
    }

    private fun closeAll() {
        sessions.toList().forEach { it.finish() }
    }

    private fun callHost(block: (IProviderHost) -> Unit) {
        val host = providerHost ?: return
        try {
            block(host)
        } catch (_: RemoteException) {
        }
    }

    private val binder = object : IPanelProvider.Stub() {
        override fun contractVersion(): Int = PluginContract.VERSION

        override fun setHost(host: IProviderHost?) {
            enforceShell()
            providerHost = host
            main.post { statusItems.forEach { (id, item) -> callHost { it.setStatusItem(id, item) } } }
        }

        override fun statusItemClicked(id: String) {
            enforceShell()
            main.post { if (id in statusItems) onStatusItemClicked(id) }
        }

        override fun listApps(): List<Bundle> {
            enforceShell()
            val version = versionOf()
            return onMain { apps() }.map { it.toBundle(version) }
        }

        override fun appIcon(appId: String, sizePx: Int): ByteArray? {
            enforceShell()
            val bitmap = this@PanelProviderService.appIcon(appId, sizePx.coerceIn(MIN_ICON_PX, MAX_ICON_PX)) ?: return null
            return ByteArrayOutputStream().also { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
        }

        override fun open(appId: String, args: Bundle?, host: IPanelHost): IPanel? {
            enforceShell()
            return onMain {
                val session = createSession(appId, args ?: Bundle()) ?: return@onMain null
                session.context = this@PanelProviderService
                session.host = PanelHost(host)
                PanelStub(session, host.asBinder()) { sessions -= it }.also { sessions += it }
            }
        }
    }

    private fun enforceShell() = enforceCallingPermission(PluginContract.PERMISSION_BIND, "only the Halone shell may use a plugin")

    @Suppress("DEPRECATION")
    private fun versionOf(): String = runCatching { packageManager.getPackageInfo(packageName, 0).longVersionCode.toString() }.getOrDefault("0")

    private fun <T> onMain(block: () -> T): T {
        if (Looper.myLooper() == Looper.getMainLooper()) return block()
        val task = FutureTask(block)
        main.post(task)
        try {
            return task.get(MAIN_TIMEOUT_S, TimeUnit.SECONDS)
        } catch (e: ExecutionException) {
            throw IllegalStateException(e.cause?.toString() ?: "failed", e.cause)
        } catch (e: TimeoutException) {
            throw IllegalStateException("the plugin's main thread did not answer in $MAIN_TIMEOUT_S s")
        }
    }

    private fun render(drawable: Drawable, sizePx: Int): Bitmap {
        val bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888)
        drawable.setBounds(0, 0, sizePx, sizePx)
        drawable.draw(Canvas(bitmap))
        return bitmap
    }

    private companion object {
        const val MAIN_TIMEOUT_S = 5L
        const val MIN_ICON_PX = 16
        const val MAX_ICON_PX = 512
    }
}
