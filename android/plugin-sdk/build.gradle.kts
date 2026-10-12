plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.maven.publish)
    signing
}

group = "dev.halone"
version = "0.1.0"

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
    publishToMavenCentral()
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

signing {
    useGpgCmd()
}

dependencies {
    testImplementation(libs.junit)
}
