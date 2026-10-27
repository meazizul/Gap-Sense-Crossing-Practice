package com.gapsense.crossingpractice;

import android.graphics.Color;
import android.view.Window;
import androidx.core.graphics.ColorUtils;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/*
 * Android-only helpers for the web app.
 *
 * setWindowBackground (build 15, tracker 14.5): with Android 15 and 16 the app
 * is drawn edge to edge, and Capacitor keeps the page clear of the status and
 * navigation bars by adding margins around the web view. What shows in those
 * margins is the window background, white by default, so on the dark theme
 * the strip above the header stayed white and the light status bar icons on
 * it could not be seen. The page tells us its background colour whenever its
 * theme is applied, and the window takes the same colour.
 */
@CapacitorPlugin(name = "GSAndroid")
public class GSAndroidPlugin extends Plugin {

    @PluginMethod
    public void setWindowBackground(PluginCall call) {
        String color = call.getString("color");
        if (color == null || color.isEmpty()) {
            call.reject("color is required");
            return;
        }
        final int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (IllegalArgumentException error) {
            call.reject("not a colour: " + color);
            return;
        }
        // Icons dark on a light colour, light on a dark one. Set here, with the
        // colour, so the two can never disagree whatever order the status bar
        // plugin and the page's own call land in at start-up.
        final boolean lightBackground = ColorUtils.calculateLuminance(parsed) > 0.5;
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            window.getDecorView().setBackgroundColor(parsed);
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setBackgroundColor(parsed);
            }
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            controller.setAppearanceLightStatusBars(lightBackground);
            controller.setAppearanceLightNavigationBars(lightBackground);
        });
        call.resolve();
    }
}
