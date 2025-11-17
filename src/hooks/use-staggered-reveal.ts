import { RefObject, useLayoutEffect } from "react";

const BLOCK_SELECTORS = [
  "main",
  "section",
  "article",
  "header",
  "footer",
  "nav",
  ".app-shell__chrome",
  ".glass-card",
  ".frosted",
  "form",
  "ul",
  "ol",
  "dl",
  "table",
  "tbody",
  "thead",
];

const CHILDREN_SELECTORS = BLOCK_SELECTORS.map((selector) => `${selector} > *`);

const ELEMENT_SELECTORS = [
  ...BLOCK_SELECTORS,
  ...CHILDREN_SELECTORS,
  "[data-reveal-target]",
  ".chip",
  ".status-pill",
  ".stat-card",
  ".metric-card",
  ".list-row",
  ".panel",
  ".cta-card",
  "button",
  "a",
  "p",
  "li",
  "dt",
  "dd",
  "label",
  "input",
  "textarea",
  "select",
  "img",
  "picture",
  "figure",
  "figcaption",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
];

const REVEAL_SELECTOR = ELEMENT_SELECTORS.join(", ");

const GROUPABLE_SELECTOR =
  "[data-reveal-group], main, section, article, header, footer, nav, form, ul, ol, dl, table, tbody, thead, .glass-card, .app-shell__chrome, .app-shell";

export function useStaggeredReveal(rootRef: RefObject<HTMLElement | null>, reflowKey?: string) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = rootRef.current;
    if (!root) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion) {
      document.body.classList.add("reveal-init");
    } else {
      document.body.classList.remove("reveal-init");
    }

    const observer = prefersReducedMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) {
                return;
              }

              const target = entry.target as HTMLElement;
              scheduleReveal(target);

              if (target.dataset.revealOnce !== "false") {
                observer?.unobserve(target);
              }
            });
          },
          {
            threshold: 0.16,
            rootMargin: "0px 0px 0px 0px",
          },
        );

    const groupCounts = new Map<HTMLElement, number>();

    const handleElement = (element: HTMLElement) => {
      if (!root.contains(element)) {
        return;
      }

      if (shouldSkip(element)) {
        return;
      }

      if (element.dataset.revealPrepared === "true") {
        if (prefersReducedMotion) {
          element.classList.add("reveal-visible");
        } else {
          observer?.observe(element);
        }
        return;
      }

      element.dataset.revealPrepared = "true";

      const order = element.dataset.revealOrder
        ? Number(element.dataset.revealOrder)
        : assignOrder(element, root, groupCounts);

      element.style.setProperty("--reveal-order", `${order}`);
      element.classList.add("reveal-element");

      if (prefersReducedMotion) {
        element.classList.add("reveal-visible");
        return;
      }

      element.classList.remove("reveal-visible");
      observer?.observe(element);

      if (isInViewport(element)) {
        scheduleReveal(element);
      }
    };

    const bootstrap = () => {
      const nodes = Array.from(root.querySelectorAll(REVEAL_SELECTOR)) as HTMLElement[];
      nodes.forEach(handleElement);
    };

    bootstrap();

    const mutationObserver = prefersReducedMotion
      ? null
      : new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (!(node instanceof HTMLElement)) {
                return;
              }

              if (node.matches(REVEAL_SELECTOR)) {
                handleElement(node);
              }

              node.querySelectorAll(REVEAL_SELECTOR).forEach((child) => {
                handleElement(child as HTMLElement);
              });
            });
          });
        });

    if (mutationObserver) {
      mutationObserver.observe(root, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [rootRef, reflowKey]);
}

function assignOrder(element: HTMLElement, root: HTMLElement, groups: Map<HTMLElement, number>) {
  const group = findRevealGroup(element, root);
  const count = groups.get(group) ?? 0;
  groups.set(group, count + 1);
  return count;
}

function findRevealGroup(element: HTMLElement, root: HTMLElement) {
  const candidate = element.closest<HTMLElement>(GROUPABLE_SELECTOR);
  if (candidate && root.contains(candidate)) {
    return candidate;
  }

  return root;
}

function shouldSkip(element: HTMLElement) {
  if (element.dataset.reveal === "skip") {
    return true;
  }

  if (element.closest("[data-reveal='skip']")) {
    return true;
  }

  if (element.hasAttribute("aria-hidden")) {
    return true;
  }

  const tag = element.tagName.toLowerCase();
  if (tag === "script" || tag === "style") {
    return true;
  }

  if (element instanceof HTMLInputElement && element.type === "hidden") {
    return true;
  }

  return false;
}

function isInViewport(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const height = window.innerHeight || document.documentElement.clientHeight;
  const width = window.innerWidth || document.documentElement.clientWidth;

  return rect.top <= height * 0.9 && rect.bottom >= height * -0.2 && rect.left <= width && rect.right >= 0;
}

function scheduleReveal(element: HTMLElement) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.classList.add("reveal-visible");
    });
  });
}
