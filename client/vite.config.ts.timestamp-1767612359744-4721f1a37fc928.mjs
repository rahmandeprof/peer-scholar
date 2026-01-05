// vite.config.ts
import { defineConfig } from "file:///C:/Users/utente/Desktop/peer-scholar/peer-scholar/client/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/utente/Desktop/peer-scholar/peer-scholar/client/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///C:/Users/utente/Desktop/peer-scholar/peer-scholar/client/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "PeerToLearn",
        short_name: "PeerToLearn",
        description: "Your academic companion for peer learning.",
        theme_color: "#3F86F7",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/dashboard",
        scope: "/",
        icons: [
          {
            src: "/logo.jpg",
            sizes: "192x192",
            type: "image/jpeg"
          },
          {
            src: "/logo.jpg",
            sizes: "512x512",
            type: "image/jpeg"
          }
        ]
      },
      workbox: {
        // Force new service worker to activate immediately
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache JS chunks - let browser handle with normal HTTP caching
        // This prevents stale chunk issues after deployment
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/v1/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.cloudinary\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "cloudinary-images",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 Days
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "static-images",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30
                // 30 Days
              }
            }
          },
          // Use NetworkFirst for API calls
          {
            urlPattern: /^https:\/\/peerscholar\.onrender\.com\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60
                // 1 hour
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
      }
    })
  ]
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx1dGVudGVcXFxcRGVza3RvcFxcXFxwZWVyLXNjaG9sYXJcXFxccGVlci1zY2hvbGFyXFxcXGNsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdXRlbnRlXFxcXERlc2t0b3BcXFxccGVlci1zY2hvbGFyXFxcXHBlZXItc2Nob2xhclxcXFxjbGllbnRcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3V0ZW50ZS9EZXNrdG9wL3BlZXItc2Nob2xhci9wZWVyLXNjaG9sYXIvY2xpZW50L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIFZpdGVQV0Eoe1xyXG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcclxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdtYXNrZWQtaWNvbi5zdmcnXSxcclxuICAgICAgbWFuaWZlc3Q6IHtcclxuICAgICAgICBuYW1lOiAnUGVlclRvTGVhcm4nLFxyXG4gICAgICAgIHNob3J0X25hbWU6ICdQZWVyVG9MZWFybicsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdZb3VyIGFjYWRlbWljIGNvbXBhbmlvbiBmb3IgcGVlciBsZWFybmluZy4nLFxyXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzNGODZGNycsXHJcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxyXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcclxuICAgICAgICBzdGFydF91cmw6ICcvZGFzaGJvYXJkJyxcclxuICAgICAgICBzY29wZTogJy8nLFxyXG4gICAgICAgIGljb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9sb2dvLmpwZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9qcGVnJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHNyYzogJy9sb2dvLmpwZycsXHJcbiAgICAgICAgICAgIHNpemVzOiAnNTEyeDUxMicsXHJcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9qcGVnJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAgd29ya2JveDoge1xyXG4gICAgICAgIC8vIEZvcmNlIG5ldyBzZXJ2aWNlIHdvcmtlciB0byBhY3RpdmF0ZSBpbW1lZGlhdGVseVxyXG4gICAgICAgIHNraXBXYWl0aW5nOiB0cnVlLFxyXG4gICAgICAgIGNsaWVudHNDbGFpbTogdHJ1ZSxcclxuICAgICAgICAvLyBEb24ndCBjYWNoZSBKUyBjaHVua3MgLSBsZXQgYnJvd3NlciBoYW5kbGUgd2l0aCBub3JtYWwgSFRUUCBjYWNoaW5nXHJcbiAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBzdGFsZSBjaHVuayBpc3N1ZXMgYWZ0ZXIgZGVwbG95bWVudFxyXG4gICAgICAgIG5hdmlnYXRlRmFsbGJhY2s6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgbmF2aWdhdGVGYWxsYmFja0RlbnlsaXN0OiBbL15cXC9hcGkvLCAvXlxcL3YxL10sXHJcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL15odHRwczpcXC9cXC9hcGlcXC5jbG91ZGluYXJ5XFwuY29tXFwvLiovaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnY2xvdWRpbmFyeS1pbWFnZXMnLFxyXG4gICAgICAgICAgICAgIGV4cGlyYXRpb246IHtcclxuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDUwLFxyXG4gICAgICAgICAgICAgICAgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzAsIC8vIDMwIERheXNcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdXJsUGF0dGVybjogL1xcLig/OnBuZ3xqcGd8anBlZ3xzdmd8Z2lmKSQvaSxcclxuICAgICAgICAgICAgaGFuZGxlcjogJ0NhY2hlRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnc3RhdGljLWltYWdlcycsXHJcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgbWF4RW50cmllczogNTAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgKiAzMCwgLy8gMzAgRGF5c1xyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgLy8gVXNlIE5ldHdvcmtGaXJzdCBmb3IgQVBJIGNhbGxzXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHVybFBhdHRlcm46IC9eaHR0cHM6XFwvXFwvcGVlcnNjaG9sYXJcXC5vbnJlbmRlclxcLmNvbVxcLy4qL2ksXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdOZXR3b3JrRmlyc3QnLFxyXG4gICAgICAgICAgICBvcHRpb25zOiB7XHJcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnYXBpLWNhY2hlJyxcclxuICAgICAgICAgICAgICBleHBpcmF0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbnRyaWVzOiAxMDAsXHJcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwLCAvLyAxIGhvdXJcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIG5ldHdvcmtUaW1lb3V0U2Vjb25kczogMTAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICBdLFxyXG59KTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF3VyxTQUFTLG9CQUFvQjtBQUNyWSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxlQUFlO0FBR3hCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLHdCQUF3QixpQkFBaUI7QUFBQSxNQUN4RSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsUUFDUCxPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEsWUFDTCxPQUFPO0FBQUEsWUFDUCxNQUFNO0FBQUEsVUFDUjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUE7QUFBQSxRQUVQLGFBQWE7QUFBQSxRQUNiLGNBQWM7QUFBQTtBQUFBO0FBQUEsUUFHZCxrQkFBa0I7QUFBQSxRQUNsQiwwQkFBMEIsQ0FBQyxVQUFVLE9BQU87QUFBQSxRQUM1QyxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZO0FBQUEsZ0JBQ1YsWUFBWTtBQUFBLGdCQUNaLGVBQWUsS0FBSyxLQUFLLEtBQUs7QUFBQTtBQUFBLGNBQ2hDO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxVQUNBO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZO0FBQUEsZ0JBQ1YsWUFBWTtBQUFBLGdCQUNaLGVBQWUsS0FBSyxLQUFLLEtBQUs7QUFBQTtBQUFBLGNBQ2hDO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQTtBQUFBLFVBRUE7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVk7QUFBQSxnQkFDVixZQUFZO0FBQUEsZ0JBQ1osZUFBZSxLQUFLO0FBQUE7QUFBQSxjQUN0QjtBQUFBLGNBQ0EsdUJBQXVCO0FBQUEsWUFDekI7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
