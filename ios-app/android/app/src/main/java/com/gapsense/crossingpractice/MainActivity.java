package com.gapsense.crossingpractice;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GSAndroidPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
