plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.maven.publish)
    signing
}

group = "dev.halone"
// Releases are versioned by their tag: -Phalone.version=0.3.0.
version = findProperty("halone.version") as String? ?: "0.2.0"

android {
    namespace = "dev.halone.plugin"
    compileSdk = 37
    compileSdkMinor = 1

    defaultConfig {
        minSdk = 29
    }

    buildFeatures {
        aidl = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
        }
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }
}

mavenPublishing {
    // Uploaded only: a maintainer publishes each release from the Central Portal.
    publishToMavenCentral(automaticRelease = false)
    signAllPublications()
    pom {
        name = "Halone plugin SDK"
        description = "Build native apps for Halone as Android plugin packages"
        url = "https://halone.dev/"
        licenses {
            license {
                name = "MIT"
                url = "https://opensource.org/license/mit"
            }
        }
        developers {
            developer {
                id = "thebitlink"
                name = "TheBITLINK"
                url = "https://github.com/TheBITLINK"
            }
        }
        scm {
            url = "https://github.com/HaloneXR/halone-sdk"
            connection = "scm:git:https://github.com/HaloneXR/halone-sdk.git"
            developerConnection = "scm:git:ssh://git@github.com/HaloneXR/halone-sdk.git"
        }
    }
}

// CI signs with the key it is given; a release from a workstation uses gpg.
signing {
    if (findProperty("signingInMemoryKey") == null) useGpgCmd()
}

dependencies {
    testImplementation(libs.junit)
}
