package com.simba.player

import android.animation.Animator
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Native animated splash screen — Google Maps / Swiggy style.
 *
 * Animation sequence (1.5s total):
 *   0-600ms:   Logo fade-in (0→1) + scale-up (0.85→1) with decelerate interpolator
 *   600-900ms: Gold glow pulse begins (alpha oscillates)
 *   600-900ms: Loading ring fades in
 *   900-1500ms: Subtitle "Simba Player" fades in
 *   1500ms:    Start MainActivity with crossfade, finish SplashActivity
 */
class SplashActivity : AppCompatActivity() {

    private lateinit var logo: ImageView
    private lateinit var glow: ImageView
    private lateinit var loadingRing: ImageView
    private lateinit var subtitle: TextView
    private val splashDuration = 1500L

    override fun onCreate(savedInstanceState: Bundle?) {
        // Apply the splash windowBackground theme before super.onCreate
        // so the static splash shows instantly on cold start
        setTheme(R.style.SplashTheme)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Hide action bar
        supportActionBar?.hide()

        logo = findViewById(R.id.splash_logo)
        glow = findViewById(R.id.splash_glow)
        loadingRing = findViewById(R.id.splash_loading_ring)
        subtitle = findViewById(R.id.splash_subtitle)

        // Ensure UI is laid out before starting animations
        logo.post { startAnimations() }
    }

    private fun startAnimations() {
        // ── Logo: fade-in (0→1) + scale-up (0.85→1) ──
        val logoFade = ObjectAnimator.ofFloat(logo, View.ALPHA, 0f, 1f)
        logoFade.duration = 600L
        logoFade.interpolator = DecelerateInterpolator()

        val logoScaleX = ObjectAnimator.ofFloat(logo, View.SCALE_X, 0.85f, 1f)
        logoScaleX.duration = 600L
        logoScaleX.interpolator = DecelerateInterpolator()

        val logoScaleY = ObjectAnimator.ofFloat(logo, View.SCALE_Y, 0.85f, 1f)
        logoScaleY.duration = 600L
        logoScaleY.interpolator = DecelerateInterpolator()

        // ── Gold glow: alpha pulse (0.4 → 0.7 → 0.4 with oscillation) ──
        val glowPulse = ValueAnimator.ofFloat(0.4f, 0.7f, 0.4f)
        glowPulse.duration = 1200L
        glowPulse.repeatCount = ValueAnimator.INFINITE
        glowPulse.repeatMode = ValueAnimator.RESTART
        glowPulse.interpolator = AccelerateDecelerateInterpolator()
        glowPulse.addUpdateListener { anim ->
            glow.alpha = anim.animatedValue as Float
        }

        // ── Loading ring: fade-in after logo ──
        val ringFade = ObjectAnimator.ofFloat(loadingRing, View.ALPHA, 0f, 1f)
        ringFade.duration = 400L
        ringFade.startDelay = 500L
        ringFade.interpolator = DecelerateInterpolator()

        // ── Subtitle: fade-in ──
        val subtitleFade = ObjectAnimator.ofFloat(subtitle, View.ALPHA, 0f, 1f)
        subtitleFade.duration = 400L
        subtitleFade.startDelay = 900L
        subtitleFade.interpolator = DecelerateInterpolator()

        // ── Logo entrance set (runs together) ──
        val logoSet = AnimatorSet()
        logoSet.playTogether(logoFade, logoScaleX, logoScaleY)
        logoSet.duration = 600L

        // ── Combined sequence ──
        val sequence = AnimatorSet()
        sequence.playSequentially(logoSet)
        // Glow pulse starts with the logo entrance and runs in parallel
        glowPulse.startDelay = 300L
        sequence.playTogether(glowPulse, ringFade, subtitleFade)

        // ── Navigate to MainActivity after sequence completes ──
        sequence.addListener(object : Animator.AnimatorListener {
            override fun onAnimationStart(animator: Animator) {}
            override fun onAnimationCancel(animator: Animator) {
                // If cancelled, still navigate
                navigateToMain()
            }
            override fun onAnimationRepeat(animator: Animator) {}

            override fun onAnimationEnd(animator: Animator) {
                // Wait the full splash duration before navigating
                logo.postDelayed({ navigateToMain() }, splashDuration - 600L)
            }
        })

        sequence.start()
    }

    private fun navigateToMain() {
        if (isFinishing) return
        val intent = Intent(this, MainActivity::class.java)
        // Pass a flag so MainActivity knows it came from splash
        intent.putExtra("from_splash", true)
        startActivity(intent)
        // Crossfade transition like Google Maps
        overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        finish()
    }

    override fun onBackPressed() {
        // On back press during splash, go to home instead of showing blank
        navigateToMain()
    }
}
