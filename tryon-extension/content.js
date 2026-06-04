console.log('Virtual Try-On loaded on', window.location.hostname);

function createTryOnButton(imageElement) {
  if (imageElement.dataset.tryonAdded) return;
  if (!imageElement.src && !imageElement.getAttribute('data-src')) return;
  
  imageElement.dataset.tryonAdded = true;

  const button = document.createElement('button');
  button.className = 'try-on-btn';
  button.textContent = 'Try On 👕';
  button.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    background-color: #2ecc71;
    color: white;
    border: none;
    padding: 8px 15px;
    border-radius: 5px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;

  const container = imageElement.parentElement;
  if (container) {
    container.style.position = 'relative';
    container.insertBefore(button, imageElement.nextSibling);
  }

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const imageUrl = imageElement.src || imageElement.getAttribute('data-src');
    if (imageUrl && imageUrl.trim()) {
      chrome.runtime.sendMessage({ action: 'saveImage', imageUrl: imageUrl.trim() });
      button.textContent = '✓ Saved!';
      button.style.backgroundColor = '#27ae60';
      setTimeout(() => {
        button.textContent = 'Try On 👕';
        button.style.backgroundColor = '#2ecc71';
      }, 2000);
    }
  });
}

function initializeTryOnButtons() {
  // Look for common product image selectors
  const imageSelectors = [
    '.pdp-image', 
    '.image-grid-image', 
    '.product-image',
    '[class*="product"][class*="image"]',
    '[class*="item"][class*="image"]',
    '[class*="gallery"]'
  ];
  
  let pdpImages = new Set();
  imageSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(img => {
      pdpImages.add(img);
    });
  });
  
  // Also add all img tags with reasonable size (likely product images, not tiny icons)
  document.querySelectorAll('img[src]').forEach(img => {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if ((width && width > 200) || (height && height > 200)) {
      pdpImages.add(img);
    }
  });
  
  pdpImages.forEach(img => createTryOnButton(img));
}

initializeTryOnButtons();

const observer = new MutationObserver(() => {
  initializeTryOnButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});