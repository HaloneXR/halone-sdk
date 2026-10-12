package dev.halone.plugin;

import android.os.Bundle;

interface IPanelHost {
    oneway void setTitle(String title) = 0;
    oneway void close() = 1;
    oneway void setPinned(boolean pinned) = 2;
    oneway void requestResize(int widthPx, int heightPx) = 3;
    oneway void setSizeLimits(int minWidthPx, int minHeightPx, int maxWidthPx, int maxHeightPx) = 4;
    oneway void showKeyboard(in Bundle request) = 5;
    oneway void hideKeyboard() = 6;
    oneway void updateKeyboard(in Bundle state) = 7;
    oneway void focus() = 8;
    oneway void setBackButton(boolean visible) = 9;
}
