/* =============================================================================
   System MSK — клиентский скрипт (без jQuery, без Bootstrap)
   ----------------------------------------------------------------------------
   Содержит:
     • Мобильное меню (открытие/закрытие, клон навигации, dropdown-аккордеон)
     • Скрытие/показ шапки при скролле, shrink-эффект
     • Печатающийся заголовок hero
     • Карусель товаров с автопрокруткой, drag (мышь/тач), нав. кнопками
     • Аккордеон преимуществ (мобильная версия)
     • Подгрузка карточек партнёров/клиентов на мобильном («Ещё»)
     • Плавный скролл по якорям
     • IntersectionObserver — анимации появления (.reveal) и плавающая
       карточка «О компании»
     • Three.js — атомарный икосаэдр (как раньше)
     • Видео hero (остановка после первого проигрывания)
     • Метка выбранного файла в форме
   ========================================================================== */

(() => {
  'use strict';

  /* ---------- Утилиты ---------------------------------------------------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));

  const onReady = (fn) => {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  };

  const easeInOutQuad = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const smoothScrollTo = (target, duration = 800, offset = 0) => {
    if (!target) return;
    const targetEl =
      typeof target === 'string' ? document.querySelector(target) : target;
    if (!targetEl) return;
    const start = window.scrollY;
    const end =
      targetEl.getBoundingClientRect().top + window.scrollY - offset;
    const distance = end - start;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start + distance * easeInOutQuad(progress));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };


  /* ---------- Мобильное меню --------------------------------------------- */
  const initMobileMenu = () => {
    const burger = $('[data-menu-toggle]');
    const menu = $('[data-mobile-menu]');
    const overlay = $('[data-menu-overlay]');
    const desktopNav = $('[data-clone-nav]');
    const menuBody = $('[data-mobile-menu-body]');
    if (!burger || !menu || !desktopNav || !menuBody) return;

    /* Клонируем навигацию в мобильное меню */
    const cloned = desktopNav.cloneNode(true);
    cloned.classList.remove('header__list');
    cloned.classList.add('mobile-menu__list');
    menuBody.appendChild(cloned);

    /* Преобразуем классы пунктов и ссылок */
    $$('li', cloned).forEach((li) => {
      li.className = li.classList.contains('header__item--has-children')
        ? 'mobile-menu__item mobile-menu__item--has-children'
        : 'mobile-menu__item';
    });
    $$('a', cloned).forEach((a) => {
      a.className = 'mobile-menu__link';
    });
    $$('ul', cloned).forEach((ul) => {
      ul.className = 'mobile-menu__sublist';
    });

    /* Кнопки-стрелки для пунктов с подменю */
    $$('.mobile-menu__item--has-children', cloned).forEach((li) => {
      const arrow = document.createElement('button');
      arrow.type = 'button';
      arrow.className = 'mobile-menu__arrow';
      arrow.setAttribute('aria-label', 'Развернуть подменю');
      li.prepend(arrow);
      arrow.addEventListener('click', (e) => {
        e.preventDefault();
        li.classList.toggle('mobile-menu__item--open');
      });
    });

    const close = () => {
      menu.classList.remove('mobile-menu--open');
      document.body.classList.remove('page--menu-open');
    };
    const open = () => {
      menu.classList.add('mobile-menu--open');
      document.body.classList.add('page--menu-open');
    };
    const toggle = () =>
      menu.classList.contains('mobile-menu--open') ? close() : open();

    burger.addEventListener('click', (e) => {
      e.preventDefault();
      toggle();
    });
    $$('[data-menu-close]').forEach((btn) =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        close();
      }),
    );
    if (overlay) overlay.addEventListener('click', close);

    /* Закрываем по клику на ссылку внутри меню */
    cloned.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) close();
    });

    /* Если ширина окна расширилась — автоматически закрываем */
    window.addEventListener('resize', () => {
      if (window.innerWidth > 991) close();
    });
  };


  /* ---------- Шапка: скрытие/появление и shrink -------------------------- */
  const initHeaderBehavior = () => {
    const header = $('[data-header]');
    if (!header) return;

    const targets = $$('.about, .contact');
    let lastY = window.scrollY;
    let raf = null;
    const offset = 2;

    const update = () => {
      const y = window.scrollY;
      const direction = y > lastY ? 'down' : 'up';

      header.classList.toggle('header--shrink', y > 100);

      if (targets.length) {
        const bounds = targets.map((el) => {
          const r = el.getBoundingClientRect();
          return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
        });
        const isInside = bounds.some((b) => y >= b.top && y <= b.bottom);
        const minTop = Math.min(...bounds.map((b) => b.top));
        const maxBottom = Math.max(...bounds.map((b) => b.bottom));

        if (isInside) {
          header.classList.add('header--hidden');
        } else if (y < minTop) {
          if (direction === 'up') header.classList.remove('header--hidden');
        } else if (y > maxBottom + offset) {
          header.classList.remove('header--hidden');
        } else {
          header.classList.remove('header--hidden');
        }
      }

      lastY = y;
      raf = null;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  };


  /* ---------- Печатающийся заголовок hero -------------------------------- */
  const initTyping = () => {
    const el = $('[data-typing]');
    if (!el) return;
    let phrases;
    try {
      phrases = JSON.parse(el.dataset.typing);
    } catch {
      phrases = [el.dataset.typing];
    }
    if (!phrases || !phrases.length) return;
    const text = phrases[0];
    let i = 0;
    el.innerHTML = '<span class="hero__cursor">|</span>';
    const tick = () => {
      i += 1;
      el.innerHTML =
        text.slice(0, i) + '<span class="hero__cursor">|</span>';
      if (i < text.length) setTimeout(tick, 40);
      else setTimeout(() => (el.innerHTML = text), 600);
    };
    tick();
  };


  /* ---------- Карусель товаров ------------------------------------------ */
  const initCarousel = () => {
    const root = $('[data-carousel]');
    if (!root) return;
    const track = $('[data-carousel-track]', root);
    const slides = $$('[data-carousel-slide]', root);
    const prevBtn = $('[data-carousel-prev]');
    const nextBtn = $('[data-carousel-next]');
    if (!track || slides.length === 0) return;

    let currentIndex = 0;
    let autoTimer = null;
    const AUTOPLAY_MS = 5000;

    const setActiveClasses = () => {
      slides.forEach((slide, idx) => {
        slide.classList.remove(
          'carousel__slide--current',
          'carousel__slide--prev',
          'carousel__slide--next',
        );
        if (idx === currentIndex) slide.classList.add('carousel__slide--current');
        if (idx === (currentIndex - 1 + slides.length) % slides.length)
          slide.classList.add('carousel__slide--prev');
        if (idx === (currentIndex + 1) % slides.length)
          slide.classList.add('carousel__slide--next');
      });
    };

    const update = (smooth = true) => {
      const slide = slides[currentIndex];
      const slideWidth = slide.offsetWidth;
      const viewport = track.parentElement;
      const viewportWidth = viewport.offsetWidth;
      const slideLeft = slide.offsetLeft;
      const offset = slideLeft - (viewportWidth - slideWidth) / 2;
      track.style.transition = smooth ? 'transform 0.5s ease-in-out' : 'none';
      track.style.transform = `translateX(${-offset}px)`;
      setActiveClasses();
    };

    const goTo = (index) => {
      currentIndex = ((index % slides.length) + slides.length) % slides.length;
      update();
      restartAutoplay();
    };

    const next = () => goTo(currentIndex + 1);
    const prev = () => goTo(currentIndex - 1);

    const startAutoplay = () => {
      autoTimer = setInterval(next, AUTOPLAY_MS);
    };
    const stopAutoplay = () => {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = null;
    };
    const restartAutoplay = () => {
      stopAutoplay();
      startAutoplay();
    };

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    /* ----------------------------------------------------------------
       Drag-to-swipe через Pointer Events API.

       Один обработчик на мышь / тач / стилус. Состояние такое:

         idle      — указатель не нажат
         pressed   — указатель нажат, но движение < DRAG_THRESHOLD;
                     это пока что потенциальный клик
         dragging  — движение > DRAG_THRESHOLD по горизонтали;
                     карусель перетягивается под пальцем

       Переход в `dragging` гасит CSS-transition трека и автоплей —
       до этого момента никаких изменений у трека нет, поэтому
       клик по карточке или микро-дрожь курсора не вызывают «дёрг».

       Pointer capture ставится на pointerdown, чтобы получать
       pointermove/pointerup даже если курсор уехал за пределы viewport.

       Если первое движение вертикально-доминантное (|dy| > |dx|),
       это вертикальный скролл страницы — отпускаем capture,
       браузер скроллит как обычно (для тача важно `touch-action: pan-y`
       в CSS на .carousel__viewport).

       После свайпа подавляем синтетический click, чтобы
       <a class="product-card"> не уводил на #contact, когда
       пользователь на самом деле просто пролистал карусель. */
    const DRAG_THRESHOLD = 8;
    const SWIPE_RATIO = 1 / 3;
    const viewport = track.parentElement;

    let pointerId = null;
    let pressX = 0;
    let pressY = 0;
    let baseTranslate = 0;
    let dragging = false;
    let suppressClick = false;

    const readTranslateX = () => {
      const m = new DOMMatrix(getComputedStyle(track).transform);
      return m.m41;
    };

    const onPointerDown = (e) => {
      // Только основная кнопка мыши; touch и pen всегда проходят.
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointerId = e.pointerId;
      pressX = e.clientX;
      pressY = e.clientY;
      baseTranslate = readTranslateX();
      dragging = false;
      suppressClick = false;
      viewport.setPointerCapture(pointerId);
    };

    const onPointerMove = (e) => {
      if (e.pointerId !== pointerId) return;
      const dx = e.clientX - pressX;
      const dy = e.clientY - pressY;

      if (!dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          // Вертикальный жест — отдаём управление браузеру (скролл).
          if (viewport.hasPointerCapture(pointerId)) {
            viewport.releasePointerCapture(pointerId);
          }
          pointerId = null;
          return;
        }
        // Перешли порог по горизонтали — вступаем в режим dragging.
        dragging = true;
        suppressClick = true;
        track.style.transition = 'none';
        stopAutoplay();
      }
      track.style.transform = `translateX(${baseTranslate + dx}px)`;
    };

    const onPointerUp = (e) => {
      if (e.pointerId !== pointerId) return;
      if (viewport.hasPointerCapture(pointerId)) {
        viewport.releasePointerCapture(pointerId);
      }
      pointerId = null;

      // Если до dragging не дошли — это клик, ничего не трогаем,
      // anchor-навигация product-card сработает сама.
      if (!dragging) return;
      dragging = false;

      const dx = e.clientX - pressX;
      const slideWidth = slides[0].offsetWidth;
      const advance = slideWidth * SWIPE_RATIO;

      if (dx <= -advance) currentIndex = (currentIndex + 1) % slides.length;
      else if (dx >= advance)
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;

      update();
      restartAutoplay();
    };

    const onPointerCancel = (e) => {
      if (e.pointerId !== pointerId) return;
      pointerId = null;
      if (!dragging) return;
      dragging = false;
      // Откатываемся к текущему слайду.
      update();
      restartAutoplay();
    };

    // Capture-фаза: ловим click до того, как он дойдёт до карточки.
    const onClickCapture = (e) => {
      if (suppressClick) {
        e.preventDefault();
        e.stopPropagation();
        suppressClick = false;
      }
    };

    viewport.addEventListener('pointerdown', onPointerDown);
    viewport.addEventListener('pointermove', onPointerMove);
    viewport.addEventListener('pointerup', onPointerUp);
    viewport.addEventListener('pointercancel', onPointerCancel);
    viewport.addEventListener('click', onClickCapture, true);

    window.addEventListener('resize', () => update(false));
    window.addEventListener('load', () => update(false));

    /* Внешние ссылки на слайды (data-slide) */
    $$('[data-slide]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(link.dataset.slide, 10);
        if (Number.isNaN(idx)) return;
        const products = $('[data-products-section]');
        if (products) {
          smoothScrollTo(products, 800, 80);
          setTimeout(() => goTo(idx), 600);
        } else {
          goTo(idx);
        }
      });
    });

    update(false);
    startAutoplay();
  };


  /* ---------- Аккордеон преимуществ -------------------------------------- */
  const initAccordion = () => {
    $$('[data-accordion]').forEach((accordion) => {
      const buttons = $$('.accordion__button', accordion);
      buttons.forEach((btn) => {
        btn.addEventListener('click', () => {
          const item = btn.closest('.accordion__item');
          const panel = item.querySelector('.accordion__panel');
          const isOpen = btn.classList.contains('accordion__button--active');

          /* Закрываем все */
          $$('.accordion__button', accordion).forEach((b) =>
            b.classList.remove('accordion__button--active'),
          );
          $$('.accordion__panel', accordion).forEach(
            (p) => (p.style.maxHeight = '0px'),
          );

          if (!isOpen) {
            btn.classList.add('accordion__button--active');
            panel.style.maxHeight = panel.scrollHeight + 'px';
          }
        });
      });

      /* Раскрываем первый по умолчанию */
      const first = $('.accordion__button', accordion);
      if (first) first.click();
    });
  };


  /* ---------- «Ещё» партнёры/клиенты ------------------------------------- */
  const initLoadMore = () => {
    const setup = (buttonSelector, gridSelector) => {
      const button = $(buttonSelector);
      const grid = $(gridSelector);
      if (!button || !grid) return;
      button.addEventListener('click', () => {
        const hidden = $$('.partners__cell--hidden, .clients__cell--hidden', grid);
        const slice = hidden.slice(
          0,
          gridSelector.includes('partners') ? 3 : 4,
        );
        slice.forEach((el) =>
          el.classList.remove('partners__cell--hidden', 'clients__cell--hidden'),
        );
        const stillHidden = $$(
          '.partners__cell--hidden, .clients__cell--hidden',
          grid,
        );
        if (stillHidden.length === 0) button.style.display = 'none';
      });
    };
    setup('[data-load-more="partners"]', '[data-partners-grid]');
    setup('[data-load-more="clients"]', '[data-clients-grid]');
  };


  /* ---------- Плавный скролл по якорям ----------------------------------- */
  const initSmoothAnchors = () => {
    document.body.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      smoothScrollTo(target, 900, 80);
    });
  };


  /* ---------- Появление элементов (.reveal) ------------------------------ */
  const initReveal = () => {
    const items = $$('.reveal');
    if (!items.length || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('reveal--in'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          /* Без unobserve: класс снимается, когда элемент покидает зону, и
             добавляется снова при возврате — повторяется как в AOS
             (once: false в оригинале). */
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal--in');
          } else {
            entry.target.classList.remove('reveal--in');
          }
        });
      },
      /* threshold:0 — старт сразу, как только нижний край элемента
         появился в видимой области; rootMargin со сжатием снизу на 80px
         немного откладывает запуск, чтобы пользователь успел увидеть
         анимацию, а не получить её ещё до приближения. */
      { threshold: 0, rootMargin: '0px 0px -80px 0px' },
    );
    items.forEach((el) => observer.observe(el));
  };


  /* ---------- Плавающая карточка «О компании» ---------------------------- */
  const initFloatCard = () => {
    const card = $('[data-float-card]');
    if (!card) return;
    /* Триггер — обёртка карточки, которая физически расположена в нижней части
       секции .about. Пока пользователь не доскроллил до неё, карточка спрятана
       под секцией; как только обёртка попадает в видимую область — карточка
       плавно поднимается. */
    const trigger = card.parentElement || card;
    if (!('IntersectionObserver' in window)) {
      card.classList.add('about__card--visible');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            card.classList.remove('about__card--exit-up');
            card.classList.add('about__card--visible');
          } else {
            card.classList.remove('about__card--visible');
            /* Если триггер ушёл ВЫШЕ вьюпорта — карточка улетает вверх,
               иначе — стандартно остаётся ниже. */
            if (entry.boundingClientRect.top < 0) {
              card.classList.add('about__card--exit-up');
            } else {
              card.classList.remove('about__card--exit-up');
            }
          }
        });
      },
      /* rootMargin сверху сжат на 25% — наблюдатель раньше считает, что
         триггер «ушёл» вверх, и карточка начинает улетать заранее. */
      { threshold: 0.05, rootMargin: '-25% 0px -10% 0px' },
    );
    observer.observe(trigger);
  };


  /* ---------- Hero видео — остановка после проигрывания ------------------ */
  const initHeroVideo = () => {
    const video = $('[data-hero-video]');
    if (!video) return;
    video.removeAttribute('loop');

    /* Удерживаем последний кадр: по окончании ставим pause и, если
       браузер сбросил currentTime в 0, перемещаемся в самый конец. */
    const holdLastFrame = () => {
      video.pause();
      const end = Number.isFinite(video.duration) ? video.duration : 0;
      if (end > 0 && Math.abs(video.currentTime - end) > 0.05) {
        try {
          video.currentTime = Math.max(0, end - 0.05);
        } catch {
          /* ignore */
        }
      }
    };
    video.addEventListener('ended', holdLastFrame);

    /* Запускаем воспроизведение. Вызов play() на уже закончившемся видео
       перематывает его на начало, поэтому пропускаем повторные попытки,
       если ролик уже доигран или находится в конце. */
    const tryPlay = () => {
      if (video.ended) return;
      const end = Number.isFinite(video.duration) ? video.duration : 0;
      if (end && video.currentTime >= end - 0.1) return;
      video.play().catch(() => {});
    };
    tryPlay();
    const onFirstInteraction = () => {
      tryPlay();
      window.removeEventListener('scroll', onFirstInteraction);
      window.removeEventListener('pointerdown', onFirstInteraction);
      window.removeEventListener('keydown', onFirstInteraction);
    };
    window.addEventListener('scroll', onFirstInteraction, { passive: true, once: true });
    window.addEventListener('pointerdown', onFirstInteraction, { once: true });
    window.addEventListener('keydown', onFirstInteraction, { once: true });
  };


  /* ---------- Overlay-шторка на logo-card -------------------------------- */
  /* Каждая карточка партнёра/клиента получает выезжающую снизу полоску с
     иконкой-глобусом. URL берётся из атрибута data-url на самой карточке;
     если его нет — overlay всё равно показывается визуально, но клик
     ведёт «в никуда» (href="#" с preventDefault). */
  const initLogoOverlay = () => {
    const cards = $$('.logo-card');
    cards.forEach((card) => {
      const media = card.querySelector('.logo-card__media');
      if (!media || media.querySelector('.logo-card__overlay')) return;
      const url = card.dataset.url || '';
      const overlay = document.createElement('a');
      overlay.className = 'logo-card__overlay';
      overlay.setAttribute('aria-label', 'Перейти на сайт партнёра');
      overlay.innerHTML = '<span class="icon-globe" aria-hidden="true"></span>';
      if (url) {
        overlay.href = url;
        overlay.target = '_blank';
        overlay.rel = 'noopener noreferrer';
      } else {
        overlay.href = '#';
        overlay.addEventListener('click', (e) => e.preventDefault());
      }
      media.appendChild(overlay);
    });
  };


  /* ---------- Snap-скролл между «якорными» секциями ---------------------- */
  /* Если пользователь находится в верхней зоне одной из «якорных» секций
     и крутит колесо вниз, перебрасываем к следующей секции. Работает только
     на устройствах с точным указателем (мышь/трекпад), чтобы не ломать
     обычный тач-скролл. Во время анимации все wheel-события блокируются,
     чтобы нативный скролл не конфликтовал с нашим smoothScrollTo. */
  const initSectionSnap = () => {
    const mappings = [
      { from: '#home', to: '#about' },
      /* Снап-проброс из «Наших клиентов» в «Контакты» — секция клиентов
         короткая, поэтому ниже триггер-зона рассчитывается адаптивно. */
      { from: '#clients', to: '#contact' },
    ];
    const hasFinePointer =
      window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    if (!hasFinePointer) return;

    let animating = false;

    const runSnap = (dst) => {
      animating = true;
      /* Временно отключаем CSS scroll-behavior: smooth, иначе браузер
         попытается сам сгладить каждый наш window.scrollTo и получится
         «дёрганье». */
      const html = document.documentElement;
      const prevBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';

      const start = window.scrollY;
      const end = dst.getBoundingClientRect().top + window.scrollY;
      const distance = end - start;
      const duration = 900;
      const startTime = performance.now();
      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        window.scrollTo(0, start + distance * eased);
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          html.style.scrollBehavior = prevBehavior;
          /* Небольшая задержка, чтобы инерционный скролл трекпада
             не влетел сразу следом за анимацией. */
          window.setTimeout(() => {
            animating = false;
          }, 250);
        }
      };
      requestAnimationFrame(step);
    };

    window.addEventListener(
      'wheel',
      (e) => {
        if (animating) {
          e.preventDefault();
          return;
        }
        if (e.deltaY <= 0) return;
        const y = window.scrollY;
        const h = window.innerHeight;
        for (const { from, to } of mappings) {
          const src = document.querySelector(from);
          const dst = document.querySelector(to);
          if (!src || !dst) continue;
          const top = src.offsetTop;
          const bottom = top + src.offsetHeight;
          /* Триггер-зона начинается на 10% высоты вьюпорта выше секции и
             заканчивается либо в первых 10% самой секции, либо за 90% до её
             низа — выбираем максимум, чтобы условие работало и для короткой
             секции (когда `bottom - h*0.9` уходит выше `top + h*0.1`). */
          const triggerEnd = Math.max(top + h * 0.1, bottom - h * 0.9);
          if (y >= top - h * 0.1 && y < triggerEnd) {
            e.preventDefault();
            runSnap(dst);
            break;
          }
        }
      },
      { passive: false },
    );
  };


  /* ---------- Метка выбранного файла ------------------------------------- */
  const initFileLabel = () => {
    const input = $('[data-file-input]');
    const label = $('[data-file-label]');
    if (!input || !label) return;
    const initial = label.textContent;
    input.addEventListener('change', () => {
      label.textContent = input.files.length ? input.files[0].name : initial;
    });
  };


  /* ---------- 3D атомарный икосаэдр (Three.js) --------------------------- */
  const initAtomicAnimation = () => {
    const container = $('[data-atomic]');
    if (!container || typeof THREE === 'undefined') return;

    const getSize = () => {
      const r = container.getBoundingClientRect();
      return {
        width: Math.max(r.width | 0, 1),
        height: Math.max(r.height | 0, 1),
      };
    };

    const start = () => {
      let { width, height } = getSize();

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 2, 16);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height, false);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const icoGeom = new THREE.IcosahedronGeometry(4, 3);
      const edgesGeom = new THREE.EdgesGeometry(icoGeom);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x007bff,
        linewidth: 1,
      });
      const wireframe = new THREE.LineSegments(edgesGeom, edgesMat);
      scene.add(wireframe);

      scene.add(new THREE.AmbientLight(0x404040));
      const light = new THREE.PointLight(0xffffff, 1);
      light.position.set(5, 5, 5);
      scene.add(light);

      const animate = () => {
        requestAnimationFrame(animate);
        wireframe.rotation.y += 0.002;
        scene.rotation.x += 0.001;
        renderer.render(scene, camera);
      };
      animate();

      let lastW = width;
      let lastH = height;
      const updateSize = () => {
        const size = getSize();
        if (size.width === lastW && size.height === lastH) return;
        lastW = size.width;
        lastH = size.height;
        renderer.setSize(size.width, size.height, false);
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
      };

      /* ResizeObserver реагирует на любые изменения размера контейнера,
         в том числе после загрузки шрифтов и поворота экрана. */
      if ('ResizeObserver' in window) {
        new ResizeObserver(updateSize).observe(container);
      }
      window.addEventListener('resize', updateSize, { passive: true });

      /* Принудительный апдейт после первой отрисовки и после загрузки шрифтов
         — чтобы избежать «сплющенной» сферы, пока Bebas Neue ещё не приехал. */
      requestAnimationFrame(() => requestAnimationFrame(updateSize));
      window.addEventListener('load', updateSize, { once: true });
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(updateSize).catch(() => {});
      }
    };

    /* Стартуем после загрузки шрифтов, чтобы первый кадр был с правильным
       соотношением сторон. При отсутствии Font Loading API стартуем сразу. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start).catch(start);
    } else {
      start();
    }
  };


  /* ---------- Запуск ----------------------------------------------------- */
  onReady(() => {
    initMobileMenu();
    initHeaderBehavior();
    initTyping();
    initCarousel();
    initAccordion();
    initLoadMore();
    initSmoothAnchors();
    initReveal();
    initFloatCard();
    initHeroVideo();
    initSectionSnap();
    initLogoOverlay();
    initFileLabel();
    initAtomicAnimation();
  });
})();
