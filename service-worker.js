// Fast Lessons - Service Worker с улучшенным кэшированием
const CACHE_NAME = 'fast-lessons-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Установка Service Worker и кэширование ресурсов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэширование ресурсов приложения');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('Пропуск ожидания активации');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Удаляем старые кэши
          if (cacheName !== CACHE_NAME) {
            console.log('Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Активация нового Service Worker');
      return self.clients.claim();
    })
  );
});

// Стратегия кэширования: Кэш сначала, затем сеть
self.addEventListener('fetch', event => {
  // Пропускаем не-GET запросы
  if (event.request.method !== 'GET') return;
  
  // Для навигационных запросов используем стратегию "сеть сначала, затем кэш"
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Клонируем ответ для кэширования
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Если сеть недоступна, пытаемся получить из кэша
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Возвращаем запасной вариант
              return caches.match('./index.html');
            });
        })
    );
  } else {
    // Для остальных ресурсов используем стратегию "кэш сначала, затем сеть"
    event.respondWith(
      caches.match(event.request)
        .then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then(response => {
              // Проверяем валидность ответа
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Клонируем ответ для кэширования
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
              
              return response;
            });
        })
    );
  }
});

// Обработка сообщений от основного скрипта
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
