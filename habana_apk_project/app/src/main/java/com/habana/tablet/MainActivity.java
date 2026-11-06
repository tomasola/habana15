package com.habana.tablet;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.http.SslError;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

    // Configuración universal de URLs por defecto
    private static final String DEFAULT_HOST = "192.168.1.139";
    private static final String TAILSCALE_HOST = "100.68.128.109";
    private static final int DEFAULT_PORT = 5175;
    private static final String PREFS_NAME = "HabanaTabletPrefs";
    private static final String KEY_CURRENT_URL = "current_url";

    private WebView webView;
    private ProgressBar loadingSpinner;
    private LinearLayout errorView;
    private TextView errorMessage;
    private Button btnRetry;
    private Button btnToggleUrl;
    private Button btnEditUrl;

    private String currentUrl;
    private boolean isTablet = false;
    private boolean hasTriedHttpFallback = false;
    private boolean hasTriedTailscaleFallback = false;
    private Handler handler = new Handler(Looper.getMainLooper());

    public class NativePowerBridge {
        @JavascriptInterface
        public boolean isCharging() {
            try {
                IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
                Intent batteryStatus = registerReceiver(null, ifilter);
                int status = batteryStatus != null ? batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1) : -1;
                return status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL;
            } catch (Exception e) {
                return true;
            }
        }

        @JavascriptInterface
        public int getBatteryLevel() {
            try {
                IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
                Intent batteryStatus = registerReceiver(null, ifilter);
                if (batteryStatus != null) {
                    int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                    int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                    if (level >= 0 && scale > 0) {
                        return (int) ((level / (float) scale) * 100);
                    }
                }
            } catch (Exception e) {}
            return 100;
        }

        @JavascriptInterface
        public boolean isTabletDevice() {
            return isTablet;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Detección física nativa: ¿Tablet o Smartphone?
        isTablet = (getResources().getConfiguration().screenLayout 
            & Configuration.SCREENLAYOUT_SIZE_MASK) >= Configuration.SCREENLAYOUT_SIZE_LARGE;

        if (isTablet) {
            // Tablet: Mantener pantalla encendida para panel de pared y forzar horizontal
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        } else {
            // Smartphone: Permitir rotación natural (vertical preferente) y gestión de energía normal
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER);
        }

        enableImmersiveMode();
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        loadingSpinner = findViewById(R.id.loadingSpinner);
        errorView = findViewById(R.id.errorView);
        errorMessage = findViewById(R.id.errorMessage);
        btnRetry = findViewById(R.id.btnRetry);
        btnToggleUrl = findViewById(R.id.btnToggleUrl);
        btnEditUrl = findViewById(R.id.btnEditUrl);

        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        currentUrl = prefs.getString(KEY_CURRENT_URL, getDefaultUrl());

        // Purgar túneles viejos o URLs expiradas que puedan dejar la app en negro
        if (currentUrl.contains("trycloudflare.com") || currentUrl.contains("drunk-break") 
                || currentUrl.contains("operation-copyrights")
                || currentUrl.startsWith("http://" + DEFAULT_HOST + ":5175")
                || currentUrl.equals("http://" + DEFAULT_HOST + ":5175/")) {
            currentUrl = getDefaultUrl();
            saveUrlPref(currentUrl);
        }

        setupWebView();

        btnRetry.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                hideError();
                hasTriedHttpFallback = false;
                loadUrl(currentUrl);
            }
        });

        btnToggleUrl.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (currentUrl.contains(DEFAULT_HOST)) {
                    currentUrl = "http://" + TAILSCALE_HOST + ":8050/" + (isTablet ? "?tablet=true" : "");
                    Toast.makeText(MainActivity.this, "Modo Remoto (Tailscale: " + TAILSCALE_HOST + ")", Toast.LENGTH_SHORT).show();
                } else {
                    currentUrl = getDefaultUrl();
                    Toast.makeText(MainActivity.this, "Restablecido a WiFi Local", Toast.LENGTH_SHORT).show();
                }
                saveUrlPref(currentUrl);
                hideError();
                hasTriedHttpFallback = false;
                hasTriedTailscaleFallback = false;
                loadUrl(currentUrl);
            }
        });

        btnEditUrl.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                showEditUrlDialog();
            }
        });

        loadUrl(currentUrl);
    }

    private String getDefaultUrl() {
        return "https://" + DEFAULT_HOST + ":" + DEFAULT_PORT + "/" + (isTablet ? "?tablet=true" : "");
    }

    private void enableImmersiveMode() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveMode();
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        // Añadir puente nativo de estado de energía y tipo de hardware
        webView.addJavascriptInterface(new NativePowerBridge(), "HabanaNativePower");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        request.grant(request.getResources());
                    }
                });
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                loadingSpinner.setVisibility(View.VISIBLE);
                hideError();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                loadingSpinner.setVisibility(View.GONE);
                hideError();
                hasTriedHttpFallback = false;
                hasTriedTailscaleFallback = false;
                if (url != null && !url.equals("about:blank") && !url.startsWith("data:")) {
                    saveUrlPref(url);
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handlerSsl, SslError error) {
                // Proceder siempre con certificados autofirmados HTTPS de la red local
                handlerSsl.proceed();
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    loadingSpinner.setVisibility(View.GONE);

                    // Si HTTPS falla en la IP local, probar fallback HTTP automático
                    // 1. Si HTTPS falla en la IP local, probar fallback HTTP local (puerto 8050)
                    if (currentUrl.contains(DEFAULT_HOST + ":5175") && !hasTriedHttpFallback) {
                        hasTriedHttpFallback = true;
                        String httpUrl = "http://" + DEFAULT_HOST + ":8050/" + (isTablet ? "?tablet=true" : "");
                        handler.postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                loadUrl(httpUrl);
                            }
                        }, 500);
                        return;
                    }

                    // 2. Si falla la red local (fuera de casa), failover automatico a Tailscale
                    if (currentUrl.contains(DEFAULT_HOST) && !hasTriedTailscaleFallback) {
                        hasTriedTailscaleFallback = true;
                        String tailscaleUrl = "http://" + TAILSCALE_HOST + ":8050/" + (isTablet ? "?tablet=true" : "");
                        handler.postDelayed(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(MainActivity.this, "Conectando fuera de casa via Tailscale...", Toast.LENGTH_SHORT).show();
                                loadUrl(tailscaleUrl);
                            }
                        }, 500);
                        return;
                    }

                    showError("No se pudo conectar con el servidor de HABANA.\n\n"
                            + "Comprueba que estás conectado a la WiFi de casa.\n\n"
                            + "Dirección intentada:\n" + currentUrl);
                }
            }
        });
    }

    private void loadUrl(String url) {
        currentUrl = url;
        loadingSpinner.setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }

    private void showEditUrlDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Dirección del Servidor HABANA");

        final EditText input = new EditText(this);
        input.setText(currentUrl);
        builder.setView(input);

        builder.setPositiveButton("Guardar y Conectar", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                String newUrl = input.getText().toString().trim();
                if (!newUrl.isEmpty()) {
                    currentUrl = newUrl;
                    hasTriedHttpFallback = false;
                    saveUrlPref(currentUrl);
                    loadUrl(currentUrl);
                }
            }
        });

        builder.setNegativeButton("Cancelar", null);
        builder.show();
    }

    private void saveUrlPref(String url) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_CURRENT_URL, url).apply();
    }

    private void showError(String msg) {
        errorView.setVisibility(View.VISIBLE);
        errorMessage.setText(msg);
        btnToggleUrl.setText("Restablecer a WiFi Local (192.168.1.139)");
    }

    private void hideError() {
        errorView.setVisibility(View.GONE);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            if (isTablet) {
                Toast.makeText(this, "Pulsa de nuevo para salir", Toast.LENGTH_SHORT).show();
            } else {
                super.onBackPressed();
            }
        }
    }
}
