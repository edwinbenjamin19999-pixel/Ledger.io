import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface MarketingPixelsProps { metaPixelId?: string;
  tiktokPixelId?: string;
  plausibleDomain?: string;
  googleAnalyticsId?: string;
}

// Strict allow-list validators prevent script injection when these IDs
// originate from untrusted sources (DB, query params, env templating).
const isValidMetaPixelId = (v?: string) => !!v && /^[0-9]{6,20}$/.test(v);
const isValidTikTokPixelId = (v?: string) => !!v && /^[A-Z0-9]{10,40}$/.test(v);
const isValidGAId = (v?: string) => !!v && /^(G|UA|AW|DC)-[A-Z0-9-]{4,30}$/.test(v);
const isValidPlausibleDomain = (v?: string) => !!v && /^[a-z0-9.-]{3,253}$/i.test(v);

export const MarketingPixels = ({ metaPixelId: rawMetaPixelId,
  tiktokPixelId: rawTiktokPixelId,
  plausibleDomain: rawPlausibleDomain = 'bokfy.se',
  googleAnalyticsId: rawGoogleAnalyticsId,
}: MarketingPixelsProps) => { const location = useLocation();
  const metaPixelId = isValidMetaPixelId(rawMetaPixelId) ? rawMetaPixelId : undefined;
  const tiktokPixelId = isValidTikTokPixelId(rawTiktokPixelId) ? rawTiktokPixelId : undefined;
  const plausibleDomain = isValidPlausibleDomain(rawPlausibleDomain) ? rawPlausibleDomain : undefined;
  const googleAnalyticsId = isValidGAId(rawGoogleAnalyticsId) ? rawGoogleAnalyticsId : undefined;

  useEffect(() => { // Plausible Analytics (GDPR-compliant, cookie-free)
    if (plausibleDomain) { const existingPlausible = document.querySelector('script[data-domain="' + plausibleDomain + '"]');
      if (!existingPlausible) { const plausibleScript = document.createElement('script');
        plausibleScript.defer = true;
        plausibleScript.dataset.domain = plausibleDomain;
        // Use the standard Plausible CDN URL with fallback
        plausibleScript.src = `https://plausible.io/js/script.js`;
        plausibleScript.onerror = () => { console.warn('Plausible Analytics script failed to load. Check if your Plausible account is active at https://plausible.io');
        };
        document.head.appendChild(plausibleScript);
      }
    }

    // Google Analytics 4
    if (googleAnalyticsId) { const existingGA = document.querySelector('script[src*="googletagmanager.com/gtag"]');
      if (!existingGA) { const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`;
        document.head.appendChild(gaScript);

        const gaInlineScript = document.createElement('script');
        gaInlineScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${googleAnalyticsId}', { page_path: window.location.pathname,
          });
        `;
        document.head.appendChild(gaInlineScript);
      }
    }

    // Meta Pixel (Facebook & Instagram)
    if (metaPixelId) { const metaScript = document.createElement('script');
      metaScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${metaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(metaScript);

      const metaNoscript = document.createElement('noscript');
      metaNoscript.innerHTML = `<img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1" />`;
      document.body.appendChild(metaNoscript);
    }

    // TikTok Pixel
    if (tiktokPixelId) { const tiktokScript = document.createElement('script');
      tiktokScript.innerHTML = `
        !function (w, d, t) { w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
          ttq.load('${tiktokPixelId}');
          ttq.page();
        }(window, document, 'ttq');
      `;
      document.head.appendChild(tiktokScript);
    }
  }, [metaPixelId, tiktokPixelId, plausibleDomain, googleAnalyticsId]);

  // Track page views on route changes (for GA)
  useEffect(() => { if (googleAnalyticsId && typeof window !== 'undefined' && (window as any).gtag) { (window as any).gtag('config', googleAnalyticsId, { page_path: location.pathname,
      });
    }
  }, [location, googleAnalyticsId]);

  return null;
};
