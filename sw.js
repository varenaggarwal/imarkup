importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.1.1/workbox-sw.js');
if (workbox) {
	console.log("Workbox is loaded ");
} else {
	console.log(" Workbox didn't load ");
}
workbox.routing.registerRoute(
	new RegExp('.*\.js'),
	workbox.strategies.networkFirst()
);
workbox.routing.registerRoute(
	// Cache CSS files
	/.*\.css/,
	// Use cache but update in the background ASAP
	workbox.strategies.staleWhileRevalidate({
		// Use a custom cache name
		cacheName: 'css-cache',
	})
);
workbox.routing.registerRoute(
	// Cache image files
	/.*\.(?:png|jpg|jpeg|svg|gif)/,
	// Use the cache if it's available
	workbox.strategies.cacheFirst({
		// Use a custom cache name
		cacheName: 'image-cache',
		plugins: [
      new workbox.expiration.Plugin({
				// Cache only 20 images
				maxEntries: 20,
				// Cache for a maximum of a week
				maxAgeSeconds: 7 * 24 * 60 * 60,
			})
    ],
	})
);
workbox.precaching.precacheAndRoute([
    '/index.css',
    '/index.js',
	{
		url: '/index.html',
		revision: '383676'
	},
]);
var CACHE_VERSION = 1;
var CURRENT_CACHES = {
	prefetch: 'prefetch-cache-v' + CACHE_VERSION
};
self.addEventListener('install', function (event) {
	var now = Date.now();
	var urlsToPrefetch = [
    'index.html'
  ];
	console.log('Handling install event. Resources to prefetch:', urlsToPrefetch);
	event.waitUntil(
		caches.open(CURRENT_CACHES.prefetch).then(function (cache) {
			var cachePromises = urlsToPrefetch.map(function (urlToPrefetch) {
				var url = new URL(urlToPrefetch, location.href);
				url.search += (url.search ? '&' : '?') + 'cache-bust=' + now;
				var request = new Request(url, {
					mode: 'no-cors'
				});
				return fetch(request).then(function (response) {
					if (response.status >= 400) {
						throw new Error('request for ' + urlToPrefetch +
							' failed with status ' + response.statusText);
					}
					return cache.put(urlToPrefetch, response);
				}).catch(function (error) {
					console.error('Not caching ' + urlToPrefetch + ' due to ' + error);
				});
			});
			return Promise.all(cachePromises).then(function () {
				console.log('Pre-fetching complete.');
			});
		}).catch(function (error) {
			console.error('Pre-fetching failed:', error);
		})
	);
});
self.addEventListener('activate', function (event) {
	var expectedCacheNames = Object.keys(CURRENT_CACHES).map(function (key) {
		return CURRENT_CACHES[key];
	});
	event.waitUntil(
		caches.keys().then(function (cacheNames) {
			return Promise.all(
				cacheNames.map(function (cacheName) {
					if (expectedCacheNames.indexOf(cacheName) === -1) {
						console.log('Deleting out of date cache:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
});
self.addEventListener('fetch', function (event) {
	console.log('Handling fetch event for', event.request.url);
	event.respondWith(
		caches.match(event.request).then(function (response) {
			if (response) {
				console.log('Found response in cache:', response);
				return response;
			}
			console.log('No response found in cache. About to fetch from network...');
			return fetch(event.request).then(function (response) {
				console.log('Response from network is:', response);
				return response;
			}).catch(function (error) {
				console.error('Fetching failed:', error);
				throw error;
			});
		})
	);
});