// Notification utility using anime.js

export const showNotification = (message, type = 'info') => {
  // Remove existing notifications
  document.querySelectorAll('.notification').forEach(n => n.remove());

  const notification = document.createElement('div');
  notification.className = `notification fixed top-20 right-4 p-4 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'error' ? 'bg-red-500' : 
    type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
  } text-white`;
  notification.textContent = message;

  document.body.appendChild(notification);

  if (window.anime) {
    window.anime({
      targets: notification,
      translateX: [300, 0],
      opacity: [0, 1],
      duration: 300,
      easing: 'easeOutQuad'
    });

    setTimeout(() => {
      window.anime({
        targets: notification,
        translateX: [0, 300],
        opacity: [1, 0],
        duration: 300,
        easing: 'easeInQuad',
        complete: () => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }
      });
    }, 3000);
  } else {
    // Fallback if anime.js is not loaded
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  }
};


