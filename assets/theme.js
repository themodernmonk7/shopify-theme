/**
 * Theme behavior
 * ------------------------------------------------------------
 * Progressive enhancement only: every form here works as a plain
 * HTML submission if this script fails to load. Event listeners
 * are delegated on `document` so they keep working after a
 * section's markup is replaced by an Ajax Cart API response.
 */
(function () {
  'use strict';

  var CART_SECTIONS = 'header,cart-drawer';

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function replaceSection(id, html) {
    var current = document.getElementById('shopify-section-' + id);
    if (!current || !html) return;
    var wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    var next = wrapper.firstElementChild;
    if (next) current.replaceWith(next);
  }

  function applySections(sections) {
    if (!sections) return;
    Object.keys(sections).forEach(function (id) {
      replaceSection(id, sections[id]);
    });
  }

  /* ---------------------------------------------------------- */
  /* Cart drawer open / close                                    */
  /* ---------------------------------------------------------- */

  function openCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    drawer.classList.remove('hidden');
    drawer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('overflow-hidden');
    requestAnimationFrame(function () {
      var panel = qs('[data-cart-drawer-panel]', drawer);
      if (panel) panel.classList.remove('translate-x-full');
    });
  }

  function closeCartDrawer() {
    var drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    var panel = qs('[data-cart-drawer-panel]', drawer);
    if (panel) panel.classList.add('translate-x-full');
    document.documentElement.classList.remove('overflow-hidden');
    window.setTimeout(function () {
      drawer.classList.add('hidden');
      drawer.setAttribute('aria-hidden', 'true');
    }, 300);
  }

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-cart-drawer-open]')) {
      event.preventDefault();
      openCartDrawer();
    }
    if (
      event.target.closest('[data-cart-drawer-close]') ||
      event.target.closest('[data-cart-drawer-overlay]')
    ) {
      event.preventDefault();
      closeCartDrawer();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var drawer = document.getElementById('cart-drawer');
    if (drawer && !drawer.classList.contains('hidden')) closeCartDrawer();
    document.querySelectorAll('details[open]').forEach(function (details) {
      details.open = false;
    });
  });

  /* Close mobile menu / search popovers on outside click. */
  document.addEventListener('click', function (event) {
    document.querySelectorAll('details[data-mobile-menu], details[data-search]').forEach(function (details) {
      if (details.open && !details.contains(event.target)) details.open = false;
    });
  });

  /* ---------------------------------------------------------- */
  /* Add to cart                                                 */
  /* ---------------------------------------------------------- */

  function setFormBusy(form, busy) {
    var button = qs('[data-add-to-cart-button]', form);
    if (!button) return;
    button.disabled = busy;
    button.classList.toggle('opacity-70', busy);
  }

  function showFormError(form, message) {
    var error = qs('[data-form-error]', form);
    if (!error) return;
    error.textContent = message;
    error.classList.toggle('hidden', !message);
  }

  document.addEventListener('submit', function (event) {
    var form = event.target.closest('form[data-product-form]');
    if (!form) return;

    event.preventDefault();
    showFormError(form, '');
    setFormBusy(form, true);

    var formData = new FormData(form);
    formData.append('sections', CART_SECTIONS);

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw data;
          return data;
        });
      })
      .then(function (data) {
        applySections(data.sections);
        if (window.themeSettings && window.themeSettings.cartType === 'page') {
          window.location.href = '/cart';
          return;
        }
        openCartDrawer();
      })
      .catch(function (error) {
        showFormError(form, (error && error.description) || 'Could not add this item to your cart.');
      })
      .finally(function () {
        setFormBusy(form, false);
      });
  });

  /* ---------------------------------------------------------- */
  /* Cart line quantity / remove                                 */
  /* ---------------------------------------------------------- */

  function updateCartLine(line, quantity) {
    return fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        line: line,
        quantity: quantity,
        sections: CART_SECTIONS + ',main-cart',
      }),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok) throw data;
          return data;
        });
      })
      .then(function (data) {
        applySections(data.sections);
      })
      .catch(function () {
        /* Fall back silently; the form's native submit still works. */
      });
  }

  document.addEventListener('click', function (event) {
    var stepButton = event.target.closest('[data-quantity-step]');
    if (stepButton) {
      var line = stepButton.getAttribute('data-line');
      var container = stepButton.closest('div');
      var input = container && qs('[data-quantity-input]', container);
      if (!input) return;
      var next = Math.max(0, parseInt(input.value || '0', 10) + parseInt(stepButton.getAttribute('data-quantity-step'), 10));
      input.value = next;
      if (line) {
        event.preventDefault();
        updateCartLine(line, next);
      }
      return;
    }

    var removeButton = event.target.closest('[data-cart-remove]');
    if (removeButton) {
      var removeLine = removeButton.getAttribute('data-line');
      if (removeLine) {
        event.preventDefault();
        updateCartLine(removeLine, 0);
      }
    }
  });

  document.addEventListener('change', function (event) {
    var input = event.target.closest('[data-quantity-input]');
    if (!input) return;
    var line = input.getAttribute('data-line');
    if (!line) return;
    var quantity = Math.max(0, parseInt(input.value || '0', 10));
    updateCartLine(line, quantity);
  });

  /* ---------------------------------------------------------- */
  /* Product gallery thumbnails                                  */
  /* ---------------------------------------------------------- */

  document.addEventListener('click', function (event) {
    var thumbnail = event.target.closest('[data-product-thumbnail]');
    if (!thumbnail) return;
    var image = qs('[data-product-featured-image]');
    var src = thumbnail.getAttribute('data-media-src');
    if (image && src) image.src = src;
  });

  /* ---------------------------------------------------------- */
  /* Product variant picker                                      */
  /* ---------------------------------------------------------- */

  function findMatchingVariant(variants, selectedOptions) {
    return variants.find(function (variant) {
      return selectedOptions.every(function (value, index) {
        return variant.options[index] === value;
      });
    });
  }

  function updateProductSection(picker, variant) {
    var sectionId = picker.getAttribute('data-section-id');
    var productUrl = picker.getAttribute('data-product-url');
    if (!sectionId || !productUrl || !variant) return;

    fetch(productUrl + '?variant=' + variant.id + '&section_id=' + sectionId)
      .then(function (response) {
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        ['[data-product-price]', '[data-product-form-wrapper]'].forEach(function (selector) {
          var next = doc.querySelector(selector);
          var current = document.querySelector(selector);
          if (next && current) current.replaceWith(next);
        });
      })
      .catch(function () {
        /* Leave the form as-is; the plain <select> values remain correct. */
      });

    if (variant.featured_image && variant.featured_image.src) {
      var image = qs('[data-product-featured-image]');
      if (image) image.src = variant.featured_image.src;
    }

    if (window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }
  }

  document.addEventListener('change', function (event) {
    var select = event.target.closest('[data-variant-option]');
    if (!select) return;

    var picker = select.closest('[data-variant-picker]');
    if (!picker) return;

    var variantsJson = qs('[data-product-variants-json]');
    if (!variantsJson) return;

    var variants;
    try {
      variants = JSON.parse(variantsJson.textContent);
    } catch (error) {
      return;
    }

    var selects = Array.prototype.slice.call(picker.querySelectorAll('[data-option-index]'));
    selects.sort(function (a, b) {
      return Number(a.getAttribute('data-option-index')) - Number(b.getAttribute('data-option-index'));
    });
    var selectedOptions = selects.map(function (node) {
      return node.value;
    });

    var variant = findMatchingVariant(variants, selectedOptions);
    if (variant) updateProductSection(picker, variant);
  });
})();
