chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'saveImage' && message.imageUrl) {
    // Get existing saved images, then append the new one
    chrome.storage.local.get(['selectedImages'], (result) => {
      const images = result.selectedImages || [];
      images.push(message.imageUrl);
      chrome.storage.local.set({ selectedImages: images }, () => {
        console.log('Image saved to storage:', message.imageUrl);
        sendResponse({ success: true });
      });
    });
    // Return true to indicate we'll call sendResponse asynchronously
    return true;
  }
});
