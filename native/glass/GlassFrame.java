package cn.hanayomi.glass;

import android.content.Context;
import android.webkit.WebView;
import android.widget.FrameLayout;

/** 包住 WebView 的容器：WebView 铺满，底栏覆盖层叠在上面。不再重写绘制流程（WebView 每帧只画一次）。 */
final class GlassFrame extends FrameLayout {
    GlassFrame(Context c, WebView web, GlassBar bar) {
        super(c);
        addView(web, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        addView(bar, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
    }
}
