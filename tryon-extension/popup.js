document.addEventListener('DOMContentLoaded', function() {
  const clothingPreview = document.getElementById('clothingPreview');
  const personPhotoInput = document.getElementById('personPhoto');
  const tryOnBtn = document.getElementById('tryOnBtn');
  const resultSection = document.getElementById('resultSection');
  const resultPreview = document.getElementById('resultPreview');
  const statusMessage = document.getElementById('statusMessage');

  let selectedClothingUrl = null;
  let personPhotoFile = null;

  function loadSelectedClothing() {
    chrome.storage.local.get(['selectedImages'], function(result) {
      const images = result.selectedImages || [];
      if (images.length > 0) {
        selectedClothingUrl = images[images.length - 1];
        clothingPreview.innerHTML = `<img src="${selectedClothingUrl}" alt="Selected clothing">`;
        updateTryOnButton();
      }
    });
  }

  personPhotoInput.addEventListener('change', function(e) {
    personPhotoFile = e.target.files[0];
    updateTryOnButton();
  });

  function updateTryOnButton() {
    tryOnBtn.disabled = !selectedClothingUrl || !personPhotoFile;
  }

  tryOnBtn.addEventListener('click', async function() {
    // Validate both inputs
    if (!selectedClothingUrl || selectedClothingUrl.trim() === '') {
      statusMessage.innerHTML = '<div class="error">❌ Please select a clothing item first. Open the extension on a product page and click the "Try On" button on an image.</div>';
      resultSection.classList.add('show');
      return;
    }
    
    if (!personPhotoFile) {
      statusMessage.innerHTML = '<div class="error">❌ Please upload your photo first.</div>';
      resultSection.classList.add('show');
      return;
    }

    tryOnBtn.disabled = true;
    tryOnBtn.textContent = 'Processing...';
    resultSection.classList.add('show');
    resultPreview.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        Processing... please wait 30-60 seconds
      </div>
    `;
    statusMessage.innerHTML = '';

    try {
      const formData = new FormData();
      formData.append('cloth_url', selectedClothingUrl.trim());
      formData.append('person_image', personPhotoFile);

      const response = await fetch('http://localhost:8000/tryon', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.status === 'success' && result.result_image) {
        resultPreview.innerHTML = `<img src="http://localhost:8000${result.result_image}" alt="Try-on result" style="width:100%; border-radius:8px;">`;
        statusMessage.innerHTML = '<div class="success">✓ Try-on completed!</div>';
      } else {
        throw new Error(result.message || 'No result image received');
      }

    } catch (error) {
      resultPreview.innerHTML = '<div style="color:#ff6b6b; text-align:center;">Failed to process</div>';
      statusMessage.innerHTML = `<div class="error">❌ ${error.message}</div>`;
    } finally {
      tryOnBtn.disabled = false;
      tryOnBtn.textContent = '🚀 Try On';
    }
  });

  chrome.storage.onChanged.addListener(function(changes) {
    if (changes.selectedImages) {
      loadSelectedClothing();
    }
  });

  loadSelectedClothing();
});
