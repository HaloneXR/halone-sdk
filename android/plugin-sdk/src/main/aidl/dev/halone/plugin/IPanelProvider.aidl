package dev.halone.plugin;

import android.os.Bundle;
import dev.halone.plugin.IPanel;
import dev.halone.plugin.IPanelHost;
import dev.halone.plugin.IProviderHost;

// Methods are only ever added, under new codes, never changed.
interface IPanelProvider {
    int contractVersion() = 0;
    void setHost(IProviderHost host) = 1;
    List<Bundle> listApps() = 2;
    byte[] appIcon(String appId, int sizePx) = 3;
    IPanel open(String appId, in Bundle args, IPanelHost host) = 4;
    oneway void statusItemClicked(String id) = 5;
    oneway void settingsChanged(in Bundle values) = 6;
    oneway void environmentStarted() = 7;
    oneway void environmentStopped() = 8;
}
