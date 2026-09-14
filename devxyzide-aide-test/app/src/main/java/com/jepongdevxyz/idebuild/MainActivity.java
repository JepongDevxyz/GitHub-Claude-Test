package com.jepongdevxyz.idebuild;

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final int BG = Color.rgb(8, 11, 18);
    private static final int PANEL = Color.rgb(17, 23, 35);
    private static final int LINE = Color.rgb(43, 55, 75);
    private static final int TEXT = Color.rgb(242, 247, 255);
    private static final int MUTED = Color.rgb(145, 158, 178);
    private static final int ACCENT = Color.rgb(91, 231, 255);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().setStatusBarColor(BG);
            getWindow().setNavigationBarColor(BG);
        }
        setContentView(createContent());
    }

    private View createContent() {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(BG);

        LinearLayout page = new LinearLayout(this);
        page.setOrientation(LinearLayout.VERTICAL);
        page.setPadding(dp(16), dp(18), dp(16), dp(24));
        scroll.addView(page, new ScrollView.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT));

        TextView logo = text("JD  </>", 28, ACCENT, true);
        logo.setGravity(Gravity.CENTER);
        logo.setPadding(dp(16), dp(18), dp(16), dp(18));
        logo.setBackground(roundRect(PANEL, ACCENT, 1, 22));
        page.addView(logo, matchWrap());

        TextView title = text("DevxyzIDE", 28, TEXT, true);
        title.setPadding(0, dp(18), 0, 0);
        page.addView(title, matchWrap());

        TextView subtitle = text("AIDE Test Edition • Powered by Jepong Devxyz", 13, MUTED, false);
        subtitle.setPadding(0, dp(4), 0, dp(16));
        page.addView(subtitle, matchWrap());

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.VERTICAL);
        actions.setPadding(dp(12), dp(12), dp(12), dp(12));
        actions.setBackground(roundRect(PANEL, LINE, 1, 16));
        page.addView(actions, matchWrap());

        addAction(actions, "Open Project");
        addAction(actions, "New Project");
        addAction(actions, "Runtime");
        addAction(actions, "Build APK");

        TextView editorTitle = text("Editor preview", 14, TEXT, true);
        editorTitle.setPadding(0, dp(20), 0, dp(8));
        page.addView(editorTitle, matchWrap());

        TextView editor = text(
                "1   package com.jepongdevxyz.idebuild;\n" +
                "2\n" +
                "3   public class MainActivity {\n" +
                "4       // DevxyzIDE AIDE install test\n" +
                "5   }",
                14, Color.rgb(190, 220, 235), false);
        editor.setTypeface(Typeface.MONOSPACE);
        editor.setTextIsSelectable(true);
        editor.setPadding(dp(14), dp(14), dp(14), dp(14));
        editor.setBackground(roundRect(Color.rgb(11, 16, 25), LINE, 1, 14));
        page.addView(editor, matchWrap());

        TextView note = text(
                "Temporary compatibility build only. After this installs successfully, development returns to the full AndroidX DevxyzIDE source.",
                12, MUTED, false);
        note.setPadding(0, dp(14), 0, 0);
        page.addView(note, matchWrap());

        return scroll;
    }

    private void addAction(LinearLayout parent, final String label) {
        Button button = new Button(this);
        button.setAllCaps(false);
        button.setText(label);
        button.setTextColor(TEXT);
        button.setTextSize(15);
        button.setGravity(Gravity.CENTER_VERTICAL);
        button.setPadding(dp(14), 0, dp(14), 0);
        button.setBackground(roundRect(Color.rgb(24, 32, 47), LINE, 1, 12));
        button.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Toast.makeText(MainActivity.this,
                        label + " — enabled in the full AndroidX DevxyzIDE build.",
                        Toast.LENGTH_SHORT).show();
            }
        });

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(48));
        lp.bottomMargin = dp(8);
        parent.addView(button, lp);
    }

    private TextView text(String value, int sp, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(sp);
        view.setTextColor(color);
        if (bold) {
            view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        }
        return view;
    }

    private GradientDrawable roundRect(int fill, int stroke, int strokeWidthDp, int radiusDp) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radiusDp));
        drawable.setStroke(dp(strokeWidthDp), stroke);
        return drawable;
    }

    private LinearLayout.LayoutParams matchWrap() {
        return new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
