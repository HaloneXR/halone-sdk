package dev.halone.plugin;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.Surface;

interface IPanel {
    oneway void attach(in Surface surface, int widthPx, int heightPx, int densityDpi) = 0;
    oneway void resize(int widthPx, int heightPx, int densityDpi) = 1;
    oneway void detach() = 2;
    oneway void close() = 3;
    oneway void dispatchMotion(in MotionEvent event) = 4;
    oneway void dispatchKey(in KeyEvent event) = 5;
    oneway void contextMenu(float x, float y) = 6;
    oneway void dispatchTextInput(in Bundle event) = 7;
    oneway void back() = 8;
}
