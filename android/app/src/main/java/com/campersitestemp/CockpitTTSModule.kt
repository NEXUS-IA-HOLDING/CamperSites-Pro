package com.campersitestemp

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.Locale

class CockpitTTSModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {
    private var tts: TextToSpeech? = null
    private var isReady = false
    private var pendingSpeech: String? = null

    init {
        tts = TextToSpeech(reactContext, this)
    }

    override fun getName(): String {
        return "CockpitTTS"
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale("es", "ES"))
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts?.setLanguage(Locale.getDefault())
            }
            tts?.setSpeechRate(1.05f)
            tts?.setPitch(1.0f)
            isReady = true

            pendingSpeech?.let { text ->
                tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cockpit_init_utterance")
                pendingSpeech = null
            }
        }
    }

    @ReactMethod
    fun speak(text: String, promise: Promise?) {
        if (tts != null && isReady) {
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cockpit_utterance_${System.currentTimeMillis()}")
            promise?.resolve(true)
        } else {
            pendingSpeech = text
            promise?.resolve(false)
        }
    }

    @ReactMethod
    fun stop(promise: Promise?) {
        tts?.stop()
        pendingSpeech = null
        promise?.resolve(true)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        tts?.stop()
        tts?.shutdown()
        tts = null
        isReady = false
    }
}
