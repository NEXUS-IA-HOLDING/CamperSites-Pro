/**
 * FASE 4: PERFORMANCE EXTREMA
 * Optimizaciones para Lighthouse 100/100
 */

// ⭐ METRO BUNDLER CONFIG - Optimización
module.exports = {
  transformer: {
    minifierPath: 'metro-minify-terser',
    minifierConfig: {
      compress: {
        drop_console: true, // Eliminar console.log en producción
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.warn'],
      },
      mangle: {
        keep_fnames: false,
      },
      output: {
        comments: false,
        beautify: false,
      },
    },
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // Critical: inline imports
      },
    }),
  },
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
};

// ⭐ REACT NATIVE CONFIG - Hermes Engine
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  // Hermes para performance nativa
  enableHermes: true,
};

// ⭐ ANDROID GRADLE - Optimizaciones
android {
  buildTypes {
    release {
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
      
      // Splits para reducir APK
      splits {
        abi {
          enable true
          reset()
          include 'arm64-v8a', 'armeabi-v7a'
          universalApk false
        }
      }
    }
  }
  
  // Bundle separado por arquitectura
  packagingOptions {
    exclude 'META-INF/*'
    pickFirst 'lib/armeabi-v7a/libc++_shared.so'
    pickFirst 'lib/arm64-v8a/libc++_shared.so'
  }
}

// ⭐ iOS PODFILE - Optimizaciones
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['GCC_OPTIMIZATION_LEVEL'] = '3'
      config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
      config.build_settings['ENABLE_BITCODE'] = 'YES'
    end
  end
end
