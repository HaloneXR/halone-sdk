package dev.halone.plugin;

import android.os.Bundle;

interface IProviderHost {
    oneway void appsChanged() = 0;
    oneway void openPanel(String appId, in Bundle args) = 1;
    oneway void setStatusItem(String id, in Bundle item) = 2;
    oneway void removeStatusItem(String id) = 3;
    oneway void launchApp(String appId, in Bundle args) = 4;
}
