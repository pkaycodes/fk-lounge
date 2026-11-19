/* =========================================================
   FK LOUNGE — interactions
   ========================================================= */
(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- Header + active section ---------------- */

  const header = $("[data-header]");
  const navLinks = $$(".main-nav > a");
  const sections = navLinks
    .map((link) => $(link.getAttribute("href")))
    .filter(Boolean);

  let ticking = false;

  const updateOnScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 28);

    const probe = y + window.innerHeight * 0.3;
    let current = null;
    sections.forEach((section) => {
      if (section.offsetTop <= probe) current = section;
    });
    navLinks.forEach((link) => {
      link.classList.toggle(
        "is-active",
        Boolean(current) && link.getAttribute("href") === `#${current.id}`
      );
    });

    ticking = false;
  };

  const requestScrollUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateOnScroll);
      ticking = true;
    }
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateOnScroll();

  /* ---------------- Mobile navigation ---------------- */

  const navToggle = $(".nav-toggle");
  const mainNav = $("#main-nav");
  const mobileQuery = window.matchMedia("(min-width: 981px)");
  let navOpener = null;

  const setNav = (open) => {
    document.body.classList.toggle("nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) {
      navOpener = document.activeElement;
      const firstLink = $("a", mainNav);
      if (firstLink) window.setTimeout(() => firstLink.focus(), 120);
    } else if (navOpener) {
      navOpener.focus();
      navOpener = null;
    }
  };

  navToggle.addEventListener("click", () => {
    setNav(!document.body.classList.contains("nav-open"));
  });

  $$("a", mainNav).forEach((link) => {
    link.addEventListener("click", () => setNav(false));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("nav-open")) {
      setNav(false);
    }
  });

  const handleViewportChange = (event) => {
    if (event.matches) setNav(false);
  };
  if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", handleViewportChange);
  else mobileQuery.addListener(handleViewportChange);

  /* ---------------- Reveal on scroll ---------------- */

  const revealItems = $$("[data-reveal]");
  if (revealItems.length) {
    if ("IntersectionObserver" in window && !reduceMotion.matches) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -7% 0px" }
      );
      revealItems.forEach((item) => revealObserver.observe(item));
    } else {
      revealItems.forEach((item) => item.classList.add("is-visible"));
    }
  }

  /* ---------------- Menu tabs ---------------- */

  const tabs = $$(".menu-tab");
  const panels = $$(".menu-panel");

  const activateTab = (tab, moveFocus = false) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel) => {
      const selected = panel.id === tab.getAttribute("aria-controls");
      panel.hidden = !selected;
      panel.classList.remove("is-entering");
      if (selected) {
        // restart the small entrance animation
        void panel.offsetWidth;
        panel.classList.add("is-entering");
      }
    });

    if (moveFocus) tab.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));

    tab.addEventListener("keydown", (event) => {
      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;

      if (nextIndex !== null) {
        event.preventDefault();
        activateTab(tabs[nextIndex], true);
      }
    });
  });

  /* ---------------- Room video ---------------- */

  const roomVideo = $("#room-video");
  const videoToggle = $(".video-toggle");

  if (roomVideo && videoToggle) {
    let userPaused = false;

    const syncVideoButton = () => {
      const paused = roomVideo.paused;
      videoToggle.setAttribute("aria-pressed", String(paused));
      videoToggle.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    };

    const tryPlay = () => {
      if (userPaused || reduceMotion.matches) return;
      const playPromise = roomVideo.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    videoToggle.addEventListener("click", () => {
      if (roomVideo.paused) {
        userPaused = false;
        roomVideo.play().catch(() => {});
      } else {
        userPaused = true;
        roomVideo.pause();
      }
      syncVideoButton();
    });

    roomVideo.addEventListener("play", syncVideoButton);
    roomVideo.addEventListener("pause", syncVideoButton);

    if (reduceMotion.matches) {
      roomVideo.removeAttribute("autoplay");
      roomVideo.pause();
    }
    syncVideoButton();

    if ("IntersectionObserver" in window) {
      const videoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) tryPlay();
            else roomVideo.pause();
          });
        },
        { threshold: 0.18 }
      );
      videoObserver.observe(roomVideo);
    }
  }

  /* ---------------- Reservation dialog ---------------- */

  const dialog = $("#reserve-dialog");
  const reserveForm = $("#reserve-form");
  const reserveStatus = $("#reserve-status");
  const eventChip = $("#reserve-event");
  const nameInput = $("#reserve-name");
  const dateInput = $("#reserve-date");
  const closeReserveButton = $("[data-close-reserve]");

  if (dialog && reserveForm) {
    const supportsDialog = typeof dialog.showModal === "function";
    let reserveOpener = null;

    const todayValue = () => {
      const now = new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 10);
    };

    const cleanUpDialog = () => {
      document.body.classList.remove("dialog-open");
      if (reserveOpener && document.contains(reserveOpener)) reserveOpener.focus();
      reserveOpener = null;
    };

    const openReserve = (eventName) => {
      reserveOpener = document.activeElement;
      reserveStatus.hidden = true;
      reserveStatus.textContent = "";

      if (eventName) {
        eventChip.hidden = false;
        eventChip.textContent = eventName;
        reserveForm.dataset.event = eventName;
      } else {
        eventChip.hidden = true;
        eventChip.textContent = "";
        delete reserveForm.dataset.event;
      }

      const today = todayValue();
      dateInput.min = today;
      if (!dateInput.value) dateInput.value = today;

      if (supportsDialog) dialog.showModal();
      else dialog.setAttribute("open", "");

      document.body.classList.add("dialog-open");
      window.setTimeout(() => nameInput.focus(), 90);
    };

    const closeReserve = () => {
      if (supportsDialog && dialog.open) dialog.close();
      else {
        dialog.removeAttribute("open");
        cleanUpDialog();
      }
    };

    $$("[data-open-reserve]").forEach((button) => {
      button.addEventListener("click", () => {
        openReserve(button.dataset.event || null);
      });
    });

    if (closeReserveButton) closeReserveButton.addEventListener("click", closeReserve);

    dialog.addEventListener("click", (event) => {
      // Clicks on the backdrop come through as clicks on the dialog itself.
      if (event.target === dialog) closeReserve();
    });

    dialog.addEventListener("close", cleanUpDialog);

    nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));

    reserveForm.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!nameInput.value.trim()) {
        nameInput.setCustomValidity("Please enter your name.");
        nameInput.reportValidity();
        nameInput.focus();
        return;
      }
      nameInput.setCustomValidity("");

      if (!reserveForm.checkValidity()) {
        reserveForm.reportValidity();
        return;
      }

      const data = new FormData(reserveForm);
      const eventName = reserveForm.dataset.event;
      const rawDate = String(data.get("date") || "");
      let prettyDate = rawDate;
      if (rawDate) {
        const parsed = new Date(`${rawDate}T12:00:00`);
        prettyDate = parsed.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      const lines = [
        eventName
          ? `Hi FK Lounge! I'd like to RSVP for ${eventName}.`
          : "Hi FK Lounge! I'd like to reserve a table.",
        `Name: ${String(data.get("name") || "").trim()}`,
        `Date: ${prettyDate}`,
        `Time: ${data.get("time")}`,
        `Guests: ${data.get("guests")}`,
      ];

      const occasion = String(data.get("occasion") || "").trim();
      if (occasion && occasion !== "Just drinks") lines.push(`Occasion: ${occasion}`);

      const notes = String(data.get("notes") || "").trim();
      if (notes) lines.push(`Notes: ${notes}`);

      const whatsappURL = `https://wa.me/233593031919?text=${encodeURIComponent(lines.join("\n"))}`;

      window.open(whatsappURL, "_blank", "noopener");

      reserveStatus.hidden = false;
      reserveStatus.textContent = "WhatsApp is opening in a new tab. If it didn't, ";
      const fallbackLink = document.createElement("a");
      fallbackLink.href = whatsappURL;
      fallbackLink.target = "_blank";
      fallbackLink.rel = "noopener";
      fallbackLink.textContent = "tap here to send your request";
      reserveStatus.append(fallbackLink, ".");
    });
  }

  /* ---------------- Gallery lightbox ---------------- */

  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightbox-img");
  const lightboxCaption = $("#lightbox-caption");
  const lightboxCount = $("#lightbox-count");
  const lightboxClose = $(".lightbox-close");
  const lightboxPrev = $(".lightbox-prev");
  const lightboxNext = $(".lightbox-next");
  const galleryItems = $$("[data-lightbox]");

  if (lightbox && galleryItems.length) {
    let current = 0;
    let lightboxOpener = null;

    const preload = (index) => {
      const item = galleryItems[(index + galleryItems.length) % galleryItems.length];
      if (item) {
        const image = new Image();
        image.src = item.dataset.src;
      }
    };

    const showImage = (index) => {
      current = (index + galleryItems.length) % galleryItems.length;
      const item = galleryItems[current];
      const sourceImage = $("img", item);

      lightboxImg.src = item.dataset.src;
      lightboxImg.alt = sourceImage ? sourceImage.alt : "";
      lightboxCaption.textContent = item.dataset.caption || "";
      lightboxCount.textContent = `${current + 1} / ${galleryItems.length}`;

      preload(current + 1);
      preload(current - 1);
    };

    const openLightbox = (index) => {
      lightboxOpener = document.activeElement;
      showImage(index);
      lightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      if (lightboxClose) lightboxClose.focus();
    };

    const closeLightbox = () => {
      lightbox.hidden = true;
      document.body.classList.remove("lightbox-open");
      lightboxImg.src = "";
      if (lightboxOpener && document.contains(lightboxOpener)) lightboxOpener.focus();
      lightboxOpener = null;
    };

    galleryItems.forEach((item, index) => {
      item.addEventListener("click", () => openLightbox(index));
    });

    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", () => showImage(current - 1));
    if (lightboxNext) lightboxNext.addEventListener("click", () => showImage(current + 1));

    $$("[data-close-lightbox]", lightbox).forEach((element) => {
      element.addEventListener("click", closeLightbox);
    });

    document.addEventListener("keydown", (event) => {
      if (lightbox.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        showImage(current + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showImage(current - 1);
      }
      if (event.key === "Tab") {
        const focusable = $$("button", lightbox).filter(
          (button) => button.offsetParent !== null
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------------- Footer year ---------------- */

  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
