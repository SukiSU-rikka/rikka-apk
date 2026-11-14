package cn.hanayomi.glass;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 挂接入口：MainActivity.onCreate 里原来的 setContentView(web) 换成 GlassHost.install(this, web)。
 * 同时给网页注册一个独立的 JS 对象 window.RikkaGlass（不改动现有的 window.Android 桥）。
 *
 * 验证开关（intent extra，会记住）：
 *   am start -n cn.rikka.v2/cn.hanayomi.app.MainActivity --ez glass_verify true    打开验证显示
 *   am start -n cn.rikka.v2/cn.hanayomi.app.MainActivity --ei glass_mode 0|1|2
 *   0 = 关闭原生底栏（用网页底栏），1 = 原生底栏 + 实时玻璃（默认），2 = 原生底栏、不透明底色（不做玻璃）
 */
public final class GlassHost {
    static final int MODE_OFF = 0, MODE_GLASS = 1, MODE_SOLID = 2;
    static int mode = MODE_GLASS;
    static boolean verify = false;

    final Activity activity;
    final WebView web;
    final GlassBar bar;
    final GlassFrame frame;
    final Map<String, Bitmap> iconCache = new HashMap<>();
    String lastIcons = "";

    private GlassHost(Activity a, WebView web) {
        this.activity = a; this.web = web;
        bar = new GlassBar(a);
        frame = new GlassFrame(a, web, bar);
        bar.listener = id -> web.evaluateJavascript("window.RikkaGlassNav&&RikkaGlassNav.tap(" + JSONObject.quote(id) + ")", null);
    }

    static String modeName() { return mode == MODE_GLASS ? "实时玻璃" : mode == MODE_SOLID ? "不透明" : "关"; }

    public static void install(Activity a, WebView web) {
        SharedPreferences sp = a.getSharedPreferences("rikka_glass", 0);
        Intent it = a.getIntent();
        SharedPreferences.Editor ed = sp.edit();
        if (it != null && it.hasExtra("glass_verify")) ed.putBoolean("verify", it.getBooleanExtra("glass_verify", false));
        if (it != null && it.hasExtra("glass_mode")) ed.putInt("mode", it.getIntExtra("glass_mode", MODE_GLASS));
        ed.apply();
        verify = sp.getBoolean("verify", false);
        mode = sp.getInt("mode", MODE_GLASS);
        if (mode == MODE_OFF) { a.setContentView(web); return; } // 完全退回网页底栏
        GlassHost h = new GlassHost(a, web);
        h.bar.verify = verify;
        h.bar.web = web;
        web.addJavascriptInterface(h.new Js(), "RikkaGlass");
        a.setContentView(h.frame);
    }

    /** 网页 → 原生。JS 桥方法跑在 binder 线程，一律切回主线程再碰 View。 */
    final class Js {
        @JavascriptInterface public String version() { return "1"; }
        @JavascriptInterface public boolean verify() { return verify; }

        @JavascriptInterface public void update(String json) {
            try {
                JSONObject o = new JSONObject(json);
                JSONArray items = o.getJSONArray("items");
                List<String> ids = new ArrayList<>(), labels = new ArrayList<>();
                List<Bitmap> icons = new ArrayList<>();
                for (int i = 0; i < items.length(); i++) {
                    JSONObject t = items.getJSONObject(i);
                    ids.add(t.getString("id")); labels.add(t.optString("label"));
                    String key = t.optString("icon");
                    Bitmap b = iconCache.get(key);
                    String data = t.optString("png", "");
                    if (b == null && data.startsWith("data:image/png;base64,")) {
                        byte[] raw = Base64.decode(data.substring(22), Base64.DEFAULT);
                        b = BitmapFactory.decodeByteArray(raw, 0, raw.length);
                        if (b != null) iconCache.put(key, b);
                    }
                    icons.add(b);
                }
                int active = o.optInt("active", -1);
                boolean visible = o.optBoolean("visible", true), dark = o.optBoolean("dark"), motion = o.optBoolean("motion", true);
                int primary = color(o.optString("primary"), 0xFF3B5BDB), surface = color(o.optString("surface"), Color.WHITE),
                        outline = color(o.optString("outline"), 0x22000000);
                JSONObject r = o.optJSONObject("rect");
                float l = r != null ? (float) r.optDouble("left", 12) : 12, rr = r != null ? (float) r.optDouble("right", 12) : 12,
                        b = r != null ? (float) r.optDouble("bottom", 10) : 10, dpr = (float) o.optDouble("dpr", 0);
                activity.runOnUiThread(() -> {
                    bar.setStyle(dark, primary, surface, outline, motion);
                    bar.setPlacement(l, rr, b, dpr);
                    bar.setTabs(ids, labels, icons, active);
                    bar.setShown(visible);
                });
            } catch (Exception e) { Log.e(GlassBar.TAG, "update failed", e); }
        }

        @JavascriptInterface public void dirty() { /* 旧版网页层会调用；新实现不需要，保留空方法以兼容 */ }
    }

    /** 解析网页 getComputedStyle 给出的颜色：rgb()/rgba()/#rrggbb。 */
    static int color(String s, int def) {
        try {
            s = s.trim();
            if (s.startsWith("#")) return Color.parseColor(s.length() == 4 ? "#" + s.charAt(1) + s.charAt(1) + s.charAt(2) + s.charAt(2) + s.charAt(3) + s.charAt(3) : s);
            if (s.startsWith("rgb")) {
                String[] p = s.substring(s.indexOf('(') + 1, s.lastIndexOf(')')).split("[,\\s/]+");
                int R = Math.round(Float.parseFloat(p[0])), G = Math.round(Float.parseFloat(p[1])), B = Math.round(Float.parseFloat(p[2]));
                float A = p.length > 3 ? Float.parseFloat(p[3]) : 1f;
                return Color.argb(Math.round(A * 255), R, G, B);
            }
        } catch (Exception ignore) {}
        return def;
    }
}
