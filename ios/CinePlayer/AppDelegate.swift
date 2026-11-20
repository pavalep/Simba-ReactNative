import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  /// The name the JavaScript app registers itself under.
  ///
  /// `app.json` is the ONE owner of this name: `index.js` does
  /// `AppRegistry.registerComponent(appName, ...)` with the `name`
  /// field from `app.json`, and Android's `MainActivity` returns the
  /// same string from `getMainComponentName()`.
  ///
  /// This used to say `"CinePlayer"`, which is the name of the Xcode
  /// TARGET and the built `.app`, not the name the JavaScript app
  /// registers. React Native looks the module up BY that name, so iOS
  /// asked the bundle for a component named `CinePlayer`, the bundle
  /// had registered `SimbaPlayer`, and the app could not start at all.
  /// The target name is a build artefact; the registered component
  /// name is a contract, and the contract lives in `app.json`.
  static let moduleName = "SimbaPlayer"

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: AppDelegate.moduleName,
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  /// Deep links, e.g. `simbaplayer://artist/Eminem`.
  ///
  /// The scheme is DECLARED in `Info.plist` under `CFBundleURLTypes`,
  /// which is what makes iOS hand such a URL to this app at all.
  /// Without this method iOS would open the app and then DROP the
  /// link: the URL would never reach `src/navigation/linking.ts`, so
  /// every deep link would silently land on the Home screen.
  ///
  /// `RCTLinkingManager` is the bridge's own handler, and it is the
  /// same entry point `Linking.getInitialURL()` and the `url` event
  /// go through, so the URL reaches React Navigation in exactly the
  /// shape it expects.
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
