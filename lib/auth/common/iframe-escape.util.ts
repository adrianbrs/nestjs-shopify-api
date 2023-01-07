import { Shopify } from '@shopify/shopify-api';

export function getIFrameEscapeHTML(
  api: Shopify,
  shop: string,
  host: string,
  redirectUrl: string,
): string {
  return `
  <script src="https://unpkg.com/@shopify/app-bridge/umd/index.js"></script>
  <script type="text/javascript">
    document.addEventListener('DOMContentLoaded', function() {
      if (window.top === window.self) {
        // If the current window is the 'parent', change the URL by setting location.href
        window.location.href = "${redirectUrl}";
      } else {
        // If the current window is the 'child', change the parent's URL with postMessage
        var AppBridge = window['app-bridge'];
        var createApp = AppBridge.default;
        var Redirect = AppBridge.actions.Redirect;
        var app = createApp({
          apiKey: "${api.config.apiKey}",
          host: "${host}",
          shopOrigin: "${encodeURI(shop)}",
        });
        var redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, "${redirectUrl}");
      }
    });
  </script>
  `;
}
