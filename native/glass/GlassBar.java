package cn.hanayomi.glass;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BlendMode;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Outline;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffColorFilter;
import android.graphics.RecordingCanvas;
import android.graphics.RectF;
import android.graphics.RenderEffect;
import android.graphics.RenderNode;
import android.graphics.RuntimeShader;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.os.Build;
import android.util.Log;
import android.view.Choreographer;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebView;

import java.util.ArrayList;
import java.util.List;

/**
 * 原生液态玻璃底栏（全屏透明覆盖层，只在底栏区域绘制、只接收底栏区域的触摸）。
 * 参数一律取自《逆向报告》，常量名后面的注释写着报告出处。
 */
final class GlassBar extends View implements Choreographer.FrameCallback {
    static final String TAG = "RikkaGlass";

    /* ---------- 报告 §2 几何 ---------- */
    static final float BAR_H_DP = 56f;        // 栏高 56dp
    static final float PAD_DP = 4f;           // 外边距 4dp（tab 宽 = (栏宽 − 2×4dp) / tab 数）
    static final float TAB_H_DP = 40f;        // Tab 高 40dp
    static final float ICON_DP = 22f;         // 图标 22dp
    static final float ICON_SEL_SCALE = 1.2f; // 选中图标 lerp(1.0 → 1.2, p)
    static final float SHADOW_DP = 18f;       // 阴影 18dp
    static final int SHADOW_SPOT = 0x1F000000;    // 黑 12%
    static final int SHADOW_AMBIENT = 0x29000000; // 黑 16%
    static final float BORDER_DP = 0.8f;      // 边框 0.8dp
    static final float THUMB_SHOW = 0.01f;    // p > 0.01 才显示胶囊玻璃内容
    static final float LABEL_SP = 11f;        // 待核：报告未给字号（SemiBold）

    /* ---------- 报告 §1 工序 ---------- */
    static final float BLUR = 6f;             // Miuix 半径 6.0（换算见 blurPx()）
    static final float BAR_LENS_H_DP = 16f, BAR_LENS_A_DP = 32f;
    static final float THUMB_LENS_H_DP = 10f, THUMB_LENS_A_DP = 14f;

    /* ---------- 报告 §3 颜色 ---------- */
    static final int THUMB_TINT_LIGHT = 0x99D0D0D0, THUMB_TINT_DARK = 0x994A4A4A; // @60%
    static final int THUMB_FILL_LIGHT = 0xFFF3F3F3, THUMB_FILL_DARK = 0xFF2C2C2C;

    /* ---------- 报告 §6 弹簧 ---------- */
    static final float PRESSED_SCALE = 78f / 56f; // 1.393

    final float d;
    final Paint fill = new Paint(Paint.ANTI_ALIAS_FLAG), stroke = new Paint(Paint.ANTI_ALIAS_FLAG),
            icon = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG), text = new Paint(Paint.ANTI_ALIAS_FLAG),
            debug = new Paint(Paint.ANTI_ALIAS_FLAG);

    /* 来自网页层的状态 */
    final List<String> ids = new ArrayList<>();
    final List<String> labels = new ArrayList<>();
    final List<Bitmap> icons = new ArrayList<>();
    int active = 0;
    boolean shown = false, dark = false, motion = true;
    int primary = 0xFF3B5BDB, surface = Color.WHITE, outline = 0x22000000;
    float cssLeft = 12, cssRight = 12, cssBottom = 10, dpr = 0; // 网页里底栏的位置（CSS px）

    /* 动画 */
    final Spring pos = new Spring(0, 1f, 1000f, 0.001f);   // 跟随/落位 (1.0, 1000)
    final Spring press = new Spring(0, 1f, 1000f, 0.001f); // 按压进度 (1.0, 1000)
    final Spring sx = new Spring(1, 0.6f, 250f, 0.001f);   // 横向拉伸 (0.6, 250)
    final Spring sy = new Spring(1, 0.7f, 250f, 0.001f);   // 纵向拉伸 (0.7, 250)
    boolean ticking = false, dragging = false, placed = false;
    long lastFrame = 0;
    float downX;

    /* 玻璃：底栏的玻璃做成 WebView 自己的 RenderEffect（WebView 每帧只画一次，不再双绘） */
    WebView web;
    String effectSig = "";
    final RectF bar = new RectF();
    RenderNode barNode, thumbNode, thumbSample;
    RuntimeShader colorBar, lensBar, maskBar, colorThumb, lensThumb;
    boolean verify = false; String status = "";
    Listener listener;

    interface Listener { void onTab(String id); }

    GlassBar(Context c) {
        super(c);
        d = c.getResources().getDisplayMetrics().density;
        stroke.setStyle(Paint.Style.STROKE);
        text.setTextAlign(Paint.Align.CENTER);
        text.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD)); // SemiBold 近似
        text.setTextSize(LABEL_SP * c.getResources().getDisplayMetrics().scaledDensity);
        debug.setTextSize(11 * d);
        setWillNotDraw(false);
    }

    /* ================= 状态 ================= */
    void setTabs(List<String> id, List<String> label, List<Bitmap> ic, int act) {
        ids.clear(); ids.addAll(id); labels.clear(); labels.addAll(label); icons.clear(); icons.addAll(ic);
        if (act >= 0 && !placed) { placed = true; active = act; pos.snap(act); }
        else if (act >= 0 && act != active && !dragging) { active = act; pos.target = act; if (!motion) pos.snap(act); kick(); }
        invalidate();
    }
    void setStyle(boolean dark, int primary, int surface, int outline, boolean motion) {
        this.dark = dark; this.primary = primary; this.surface = surface; this.outline = outline; this.motion = motion;
        if (!motion) { pos.snap(pos.target); press.snap(press.target); sx.snap(sx.target); sy.snap(sy.target); }
        invalidate();
    }
    void setShown(boolean v) { if (shown != v) { shown = v; if (!v) { dragging = false; press.snap(0); sx.snap(1); sy.snap(1); } invalidate(); } }
    void setPlacement(float l, float r, float b, float ratio) {
        if (l == cssLeft && r == cssRight && b == cssBottom && ratio == dpr) return; // 没变就不重排，避免无谓重绘
        cssLeft = l; cssRight = r; cssBottom = b; dpr = ratio; invalidate();
    }
    boolean glassOn() { return Build.VERSION.SDK_INT >= 33 && GlassHost.mode == GlassHost.MODE_GLASS && web != null; }

    /** 把「模糊 → 调色 → 透镜 → 只留底栏形状」这条链，和原画面叠在一起，设成 WebView 的 RenderEffect。
     *  只在底栏位置/显隐/深浅色变化时重建；胶囊动画不会触发它。 */
    void syncWebEffect() {
        if (web == null || Build.VERSION.SDK_INT < 31) return;
        boolean on = glassOn() && shown && !ids.isEmpty() && bar.width() > 1;
        String sig = on ? bar.left + "," + bar.top + "," + bar.width() + "," + bar.height() + "," + dark : "";
        if (sig.equals(effectSig)) return;
        effectSig = sig;
        try {
            if (!on) { web.setRenderEffect(null); return; }
            float w = bar.width(), h = bar.height(), r = blurPx(BLUR);
            RenderEffect blur = RenderEffect.createBlurEffect(r, r, Shader.TileMode.CLAMP);
            if (colorBar == null) colorBar = new RuntimeShader(GlassShaders.COLOR);
            colorBar.setFloatUniform("in_brightness", dark ? 0f : 0.16f);
            colorBar.setFloatUniform("in_contrast", 1f);
            colorBar.setFloatUniform("in_saturation", dark ? 1.5f : 1.28f);
            if (lensBar == null) lensBar = new RuntimeShader(GlassShaders.LENS);
            lens(lensBar, w, h, bar.left, bar.top, px(BAR_LENS_H_DP), px(BAR_LENS_A_DP), false);
            if (maskBar == null) maskBar = new RuntimeShader(GlassShaders.MASK);
            maskBar.setFloatUniform("size", w, h);
            maskBar.setFloatUniform("offset", -bar.left, -bar.top);
            maskBar.setFloatUniform("radius", Math.min(w, h) / 2f);
            RenderEffect glass = RenderEffect.createChainEffect(RenderEffect.createRuntimeShaderEffect(lensBar, "content"),
                    RenderEffect.createChainEffect(RenderEffect.createRuntimeShaderEffect(colorBar, "content"), blur)); // 先模糊→调色→折射
            RenderEffect masked = RenderEffect.createChainEffect(RenderEffect.createRuntimeShaderEffect(maskBar, "content"), glass);
            web.setRenderEffect(RenderEffect.createBlendModeEffect(RenderEffect.createOffsetEffect(0f, 0f), masked, BlendMode.SRC_OVER));
            status = "";
        } catch (Throwable t) {
            Log.e(TAG, "web effect failed", t); status = "玻璃效果失败：" + t.getClass().getSimpleName();
            try { web.setRenderEffect(null); } catch (Throwable ignore) {}
            GlassHost.mode = GlassHost.MODE_SOLID; // 退回不透明底栏，功能不受影响
        }
    }

    /* ================= 几何 ================= */
    float px(float dp) { return dp * d; }
    void computeBar() {
        float k = dpr > 0 ? dpr : d;
        float left = cssLeft * k, right = getWidth() - cssRight * k;
        float bottom = getHeight() - cssBottom * k;
        if (dpr <= 0) { // 网页还没报位置：贴底，留出导航条
            WindowInsets in = getRootWindowInsets();
            int nav = 0;
            if (in != null) nav = Build.VERSION.SDK_INT >= 30 ? in.getInsets(WindowInsets.Type.navigationBars()).bottom : in.getSystemWindowInsetBottom();
            bottom = getHeight() - nav - px(10);
        }
        bar.set(left, bottom - px(BAR_H_DP), right, bottom);
    }
    float tabW() { return (bar.width() - 2 * px(PAD_DP)) / Math.max(1, ids.size()); }
    float tabCenter(float index) { return bar.left + px(PAD_DP) + tabW() * (index + 0.5f); }
    float indexAt(float x) { // 报告 §6：(pos/width − 0.5) 夹到 [0, n−1]
        float v = (x - bar.left - px(PAD_DP)) / tabW() - 0.5f;
        return Math.max(0, Math.min(ids.size() - 1, v));
    }
    /** Miuix 的 6.0 是 backdrop 渲染空间 px、内部再按 ×0.45 选降采样档；framework 模糊在全分辨率 px 上做，
     *  这里按“同样的视觉模糊量”换算为 6 / 0.45 ≈ 13.3 px（换算依据见构建说明·自查表，可在验证版里对照调整）。 */
    float blurPx(float miuix) { return miuix / 0.45f; }

    /* ================= 触摸（按压 + 拖动 scrub） ================= */
    @Override public boolean onTouchEvent(MotionEvent e) {
        if (!shown || ids.isEmpty()) return false;
        float x = e.getX(), y = e.getY();
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                if (!bar.contains(x, y)) return false; // 底栏以外的触摸交给 WebView
                dragging = true; downX = x;
                press.target = 1f;
                sx.set(0.6f, 250f); sy.set(0.7f, 250f); sx.target = PRESSED_SCALE; sy.target = PRESSED_SCALE;
                pos.target = indexAt(x);
                if (!motion) { press.snap(1); sx.snap(PRESSED_SCALE); sy.snap(PRESSED_SCALE); pos.snap(pos.target); }
                kick(); return true;
            case MotionEvent.ACTION_MOVE:
                if (!dragging) return false;
                pos.target = indexAt(x); if (!motion) pos.snap(pos.target);
                kick(); return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (!dragging) return false;
                dragging = false;
                int idx = Math.round(e.getActionMasked() == MotionEvent.ACTION_UP ? indexAt(x) : active);
                idx = Math.max(0, Math.min(ids.size() - 1, idx));
                pos.target = idx; press.target = 0f;
                sx.set(0.7f, 250f); sy.set(0.7f, 250f); sx.target = 1f; sy.target = 1f; // 松开 (0.7, 250)
                if (!motion) { pos.snap(idx); press.snap(0); sx.snap(1); sy.snap(1); }
                kick();
                if (e.getActionMasked() == MotionEvent.ACTION_UP) {
                    active = idx; performClick();
                    if (listener != null) listener.onTab(ids.get(idx));
                }
                return true;
        }
        return false;
    }
    @Override public boolean performClick() { super.performClick(); return true; }

    /* ================= 帧循环 ================= */
    void kick() { if (!ticking) { ticking = true; lastFrame = 0; Choreographer.getInstance().postFrameCallback(this); } invalidate(); }
    @Override public void doFrame(long now) {
        float dt = lastFrame == 0 ? 1f / 120f : Math.min(0.05f, (now - lastFrame) / 1e9f);
        lastFrame = now;
        boolean a = pos.step(dt) | press.step(dt) | sx.step(dt) | sy.step(dt);
        invalidate();
        if (a) Choreographer.getInstance().postFrameCallback(this); else ticking = false;
    }

    /* ================= 绘制 ================= */
    @Override protected void onDraw(Canvas c) {
        if (!shown || ids.isEmpty()) { syncWebEffect(); return; }
        computeBar();
        syncWebEffect();
        boolean glass = glassOn() && c.isHardwareAccelerated();
        try {
            if (Build.VERSION.SDK_INT >= 29 && c.isHardwareAccelerated()) drawNodes(c, glass); else drawFallback(c);
        } catch (Throwable t) {
            Log.e(TAG, "glass draw failed", t); status = "绘制失败：" + t.getClass().getSimpleName();
            drawFallback(c);
        }
        if (verify) drawVerify(c, glass);
    }

    float p() { return Math.max(0f, Math.min(1f, press.value)); }

    /** 底栏本体（玻璃 + 罩色 + 渐变 + 边框 + tab），录进 barNode。 */
    private void recordBar(boolean glass) {
        int w = (int) Math.ceil(bar.width()), h = (int) Math.ceil(bar.height());
        if (barNode == null) barNode = new RenderNode("rikka-bar");
        barNode.setPosition(0, 0, w, h);
        barNode.setTranslationX(bar.left); barNode.setTranslationY(bar.top);
        Outline o = new Outline(); o.setRoundRect(0, 0, w, h, h / 2f); o.setAlpha(1f);
        barNode.setOutline(o); barNode.setClipToOutline(true);
        barNode.setElevation(px(SHADOW_DP));
        barNode.setSpotShadowColor(SHADOW_SPOT); barNode.setAmbientShadowColor(SHADOW_AMBIENT);
        RecordingCanvas rc = barNode.beginRecording(w, h);
        try {
            if (glass) {
                // 玻璃本身已经由 WebView 的 RenderEffect 画在下面，这里只叠罩色
                if (!verify) {
                    // 报告 §4：Bar 先整块填充 tint，再叠白色顶部渐变（浅 0.10 / 深 0.08 → 38% 高度透明）
                    fill.setShader(null); fill.setColor(barTint()); rc.drawRect(0, 0, w, h, fill);
                    int top = Color.argb(dark ? 0.08f : 0.10f, 1f, 1f, 1f);
                    fill.setShader(new LinearGradient(0, 0, 0, h * 0.38f, top, 0x00FFFFFF, Shader.TileMode.CLAMP));
                    rc.drawRect(0, 0, w, h, fill); fill.setShader(null);
                }
            } else {
                fill.setShader(null); fill.setColor(surface); rc.drawRect(0, 0, w, h, fill); // 兜底背景：surface
            }
            stroke.setStrokeWidth(px(BORDER_DP)); stroke.setColor(outline);
            float s = px(BORDER_DP) / 2;
            rc.drawRoundRect(s, s, w - s, h - s, h / 2f - s, h / 2f - s, stroke);
            for (int i = 0; i < ids.size(); i++) drawTab(rc, i, -bar.left, -bar.top, 1f);
        } finally { barNode.endRecording(); }
    }

    /** 报告 §3：底栏玻璃 tint。采用“自定义 tint”分支：浅色白 52%，深色 surface 32%（理由见构建说明）。 */
    int barTint() { return dark ? (surface & 0x00FFFFFF) | (Math.round(0.32f * 255) << 24) : 0x85FFFFFF; }

    /** 报告 §5 uniform 映射：size、offset = −padding、cornerRadii（Circle → 短边/2）、refractionHeight、refractionAmount = −强度、depthEffect = 1。
     *  本实现不降采样，scale = 1。 */
    private static void lens(RuntimeShader s, float w, float h, float padX, float padY, float height, float amount, boolean dispersion) {
        float r = Math.min(w, h) / 2f;
        s.setFloatUniform("size", w, h);
        s.setFloatUniform("offset", -padX, -padY);
        s.setFloatUniform("cornerRadii", r, r, r, r);
        s.setFloatUniform("refractionHeight", height);
        s.setFloatUniform("refractionAmount", -amount);
        s.setFloatUniform("depthEffect", 1f);
        if (dispersion) s.setFloatUniform("chromaticAberration", 1f);
    }

    /** 选中胶囊：p≈0 时是 ThumbRest（模糊 6 + 调色 + 罩色），按下后切成 Thumb（模糊 6×(1−p) + 透镜 10/14×p + 色散）。 */
    private void recordThumb(boolean glass, float p) {
        float tw = tabW(), th = bar.height() - 2 * px(PAD_DP);
        float v = pos.velocity * p;                        // 报告 §6：速度 × progress
        float kx = clamp(0.75f * v / 10f, -0.2f, 0.2f), ky = clamp(0.25f * v / 10f, -0.2f, 0.2f);
        float scaleX = sx.value / (1f - kx), scaleY = sy.value * (1f - ky);
        int w = Math.round(tw), h = Math.round(th);
        float cx = tabCenter(pos.value), cy = bar.centerY();
        float left = cx - w / 2f, top = cy - h / 2f;
        if (thumbNode == null) thumbNode = new RenderNode("rikka-thumb");
        thumbNode.setPosition(0, 0, w, h);
        thumbNode.setTranslationX(left); thumbNode.setTranslationY(top);
        thumbNode.setPivotX(w / 2f); thumbNode.setPivotY(h / 2f);
        thumbNode.setScaleX(scaleX); thumbNode.setScaleY(scaleY);
        Outline o = new Outline(); o.setRoundRect(0, 0, w, h, h / 2f);
        thumbNode.setOutline(o); thumbNode.setClipToOutline(true);
        RecordingCanvas rc = thumbNode.beginRecording(w, h);
        try {
            boolean lensOk = Build.VERSION.SDK_INT >= 33;
            if (glass && lensOk) {
                boolean rest = p <= THUMB_SHOW;
                int m = (int) Math.ceil(blurPx(BLUR) * 3);
                if (thumbSample == null) thumbSample = new RenderNode("rikka-thumb-sample");
                thumbSample.setPosition(-m, -m, w + m, h + m);
                thumbSample.setRenderEffect(thumbEffect(w, h, m, p, rest));
                RecordingCanvas sc = thumbSample.beginRecording(w + 2 * m, h + 2 * m);
                try {
                    // 胶囊采样“底栏本体”（罩色与 tab；都是原生自绘内容，可以安全地再画一次），透镜因此会把下面的图标折弯
                    sc.translate(-(left - m), -(top - m));
                    sc.drawRenderNode(barNode); // barNode 自带 translation = 底栏位置
                } finally { thumbSample.endRecording(); }
                rc.drawRenderNode(thumbSample);
                if (rest && !verify) { fill.setShader(null); fill.setColor(dark ? THUMB_TINT_DARK : THUMB_TINT_LIGHT); rc.drawRect(0, 0, w, h, fill); } // ThumbRest 只填充 tint
            } else {
                fill.setShader(null); fill.setColor(dark ? THUMB_FILL_DARK : THUMB_FILL_LIGHT); rc.drawRect(0, 0, w, h, fill); // 无玻璃时的胶囊内填充
            }
        } finally { thumbNode.endRecording(); }
    }

    private RenderEffect thumbEffect(int w, int h, int m, float p, boolean rest) {
        float r = rest ? blurPx(BLUR) : blurPx(BLUR) * (1f - p);
        RenderEffect blur = r > 0.01f ? RenderEffect.createBlurEffect(r, r, Shader.TileMode.CLAMP) : null;
        if (Build.VERSION.SDK_INT < 33) return blur != null ? blur : RenderEffect.createOffsetEffect(0, 0);
        if (colorThumb == null) colorThumb = new RuntimeShader(GlassShaders.COLOR);
        // ThumbRest：亮度 浅+0.16/深0、饱和 浅1.28/深1.5；Thumb：亮度 0、饱和 1.0
        colorThumb.setFloatUniform("in_brightness", rest ? (dark ? 0f : 0.16f) : 0f);
        colorThumb.setFloatUniform("in_contrast", 1f);
        colorThumb.setFloatUniform("in_saturation", rest ? (dark ? 1.5f : 1.28f) : 1f);
        RenderEffect e = RenderEffect.createRuntimeShaderEffect(colorThumb, "content");
        if (blur != null) e = RenderEffect.createChainEffect(e, blur);
        if (!rest) { // Thumb：透镜 10dp×p / 14dp×p，p>0 开色散
            if (lensThumb == null) lensThumb = new RuntimeShader(GlassShaders.LENS_DISPERSION);
            lens(lensThumb, w, h, m, m, px(THUMB_LENS_H_DP) * p, px(THUMB_LENS_A_DP) * p, true);
            e = RenderEffect.createChainEffect(RenderEffect.createRuntimeShaderEffect(lensThumb, "content"), e);
        }
        return e;
    }

    private void drawNodes(Canvas c, boolean glass) {
        float p = p();
        recordBar(glass);
        c.enableZ(); c.drawRenderNode(barNode); c.disableZ();   // 阴影随 elevation 一起画
        recordThumb(glass, p);
        c.drawRenderNode(thumbNode);
        int sel = Math.round(pos.value);
        drawTab(c, sel, 0, 0, 1f + (ICON_SEL_SCALE - 1f) * p);  // 选中项画在胶囊上方，图标 lerp(1.0→1.2, p)
    }

    private void drawFallback(Canvas c) {
        // 没有硬件加速 / Android 10 以下：只画不透明 surface + 边框 + 胶囊填充
        float h = bar.height();
        fill.setShader(null); fill.setColor(surface);
        c.drawRoundRect(bar, h / 2, h / 2, fill);
        stroke.setStrokeWidth(px(BORDER_DP)); stroke.setColor(outline);
        c.drawRoundRect(bar, h / 2, h / 2, stroke);
        float tw = tabW(), th = h - 2 * px(PAD_DP), cx = tabCenter(pos.value);
        fill.setColor(dark ? THUMB_FILL_DARK : THUMB_FILL_LIGHT);
        c.save(); c.scale(sx.value, sy.value, cx, bar.centerY());
        c.drawRoundRect(cx - tw / 2, bar.centerY() - th / 2, cx + tw / 2, bar.centerY() + th / 2, th / 2, th / 2, fill);
        c.restore();
        for (int i = 0; i < ids.size(); i++) drawTab(c, i, 0, 0, i == Math.round(pos.value) ? 1f + (ICON_SEL_SCALE - 1f) * p() : 1f);
    }

    /** 一个 tab：22dp 图标 + 标签，颜色 = 主题 primary（报告 §3）。 */
    private void drawTab(Canvas c, int i, float ox, float oy, float iconScale) {
        float cx = tabCenter(i) + ox, cy = bar.centerY() + oy;
        float tabH = px(TAB_H_DP), is = px(ICON_DP);
        Paint.FontMetrics fm = text.getFontMetrics();
        float th = fm.descent - fm.ascent, gap = px(2);
        float total = is + gap + th, top = cy - Math.min(total, tabH) / 2f;
        Bitmap b = i < icons.size() ? icons.get(i) : null;
        if (b != null) {
            icon.setColorFilter(new PorterDuffColorFilter(primary, PorterDuff.Mode.SRC_IN));
            float icx = cx, icy = top + is / 2f, s = is * iconScale / 2f;
            c.drawBitmap(b, null, new RectF(icx - s, icy - s, icx + s, icy + s), icon);
        }
        text.setColor(primary);
        c.drawText(i < labels.size() ? labels.get(i) : "", cx, top + is + gap - fm.ascent, text);
    }

    private void drawVerify(Canvas c, boolean glass) {
        debug.setColor(0xFFFF2D55);
        String line = "原生玻璃验证 · API " + Build.VERSION.SDK_INT + " · 玻璃 " + (glass ? "开" : "关") + " · " + GlassHost.modeName() + (status.isEmpty() ? "" : " · " + status);
        debug.setStyle(Paint.Style.FILL);
        c.drawText(line, bar.left + px(8), bar.top - px(8), debug);
        if (!glass) { debug.setStyle(Paint.Style.STROKE); debug.setStrokeWidth(px(1)); c.drawRect(bar, debug); }
    }

    static float clamp(float v, float a, float b) { return Math.max(a, Math.min(b, v)); }
}
