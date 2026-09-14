# DevxyzIDE v0.6 — AIDE Test Edition

This is a temporary compatibility shell used only to verify that the DevxyzIDE application identity can build and install through AIDE on Android.

- App name: `DevxyzIDE`
- Package/applicationId: `com.jepongdevxyz.idebuild`
- compileSdk: 34
- minSdk: 19
- targetSdk: 29
- Android Gradle Plugin: 7.2.1
- Java: 11
- External AndroidX/Material/Sora dependencies: none in this temporary shell

The full DevxyzIDE project remains the separate modern AndroidX source. This branch is **not** a replacement for that codebase.

## AIDE

Open the `devxyzide-aide-test` folder as the project root in AIDE and run **Build APK**.

## CI APK

The repository branch contains a GitHub Actions workflow that checks the identity/configuration and builds a debug APK with Gradle 7.4.2 + JDK 11.
