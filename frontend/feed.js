
/**
 * feed.js - Funcionalidad principal para la página de feed
 * Última actualización: 2023-04-23
 */

// Configuración global
const API = "http://localhost:3001";
const DEFAULT_AVATAR = "avatar.svg";

// ============= VERIFICACIÓN DE SESIÓN Y PERFIL =============

/**
 * Verifica si el usuario tiene una sesión activa
 * @returns {Object|null} Datos del usuario o null si no hay sesión
 */
async function checkSession() {
  try {
    console.log('Verificando sesión...');
    const res = await fetch(`${API}/api/session`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.error('Error al verificar sesión:', res.status);
      redirectToLogin();
      return null;
    }

    const data = await res.json();
    if (data.loggedIn && data.user) {
      console.log('Sesión activa, datos de usuario:', data.user);
      return data.user;
    } else {
      console.log('Sin sesión activa, redirigiendo a login');
      redirectToLogin();
      return null;
    }
  } catch (err) {
    console.error('Error al verificar sesión:', err);
    redirectToLogin();
    return null;
  }
}

/**
 * Redirecciona a la página de login
 */
function redirectToLogin() {
  // Usa rutas relativas para redirecciones internas
  window.location.href = "/index.html";
}

/**
 * Actualiza la interfaz con los datos del perfil del usuario
 * @param {Object} user - Datos del usuario
 */
function updateProfile(user) {
  if (!user) return;

  // Actualizar nombre de perfil
  const profileName = document.getElementById('profileName');
  if (profileName) {
    profileName.textContent = user.displayName || user.username || 'Perfil';
  }

  // Actualizar foto de perfil
  const profilePhoto = document.getElementById('profilePhoto');
  if (profilePhoto) {
    if (user.photoUrl) {
      // Añadir timestamp para evitar caché
      const photoUrl = `${user.photoUrl}?t=${new Date().getTime()}`;
      
      // Cargar la imagen con manejo de error
      loadImageWithFallback(profilePhoto, photoUrl, DEFAULT_AVATAR);
    } else {
      profilePhoto.src = DEFAULT_AVATAR;
    }
  }
}

/**
 * Carga una imagen con manejo de errores y fallback
 * @param {HTMLImageElement} imgElement - Elemento de imagen a actualizar
 * @param {string} primarySrc - URL principal de la imagen
 * @param {string} fallbackSrc - URL de respaldo si la principal falla
 */
function loadImageWithFallback(imgElement, primarySrc, fallbackSrc) {
  const img = new Image();
  
  img.onload = function() {
    imgElement.src = primarySrc;
    console.log('Imagen cargada correctamente:', primarySrc);
  };
  
  img.onerror = function() {
    console.error('Error al cargar la imagen:', primarySrc);
    imgElement.src = fallbackSrc;
  };
  
  img.src = primarySrc;
}

// ============= MANEJO DE FOTOS DE PERFIL =============

/**
 * Procesa y sube una foto de perfil al servidor
 * @param {File} file - Archivo de imagen a subir
 * @returns {Promise<string|null>} URL de la foto subida o null si falló
 */
async function handleProfilePhoto(file) {
  if (!file) return null;

  // Validar el archivo
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecciona una imagen válida.');
    return null;
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    alert('La imagen es demasiado grande. El tamaño máximo es 5MB.');
    return null;
  }

  // Mostrar indicador de carga
  const profilePhoto = document.getElementById('profilePhoto');
  const originalSrc = profilePhoto ? profilePhoto.src : null;
  
  if (profilePhoto) {
    profilePhoto.style.opacity = "0.5";
  }

  try {
    console.log(`Preparando envío de foto: ${file.name} (${Math.round(file.size/1024)} KB)`);
    
    const formData = new FormData();
    formData.append('photo', file);

    // Intentar subir la foto
    try {
      const res = await fetch(`${API}/api/profile/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      // Restaurar opacidad
      if (profilePhoto) profilePhoto.style.opacity = "1";

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: `Error HTTP: ${res.status}` }));
        throw new Error(errorData.error || `Error al subir la imagen: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.success && data.photoUrl) {
        // Actualizar la foto con la nueva URL
        const photoUrl = `${data.photoUrl}?t=${new Date().getTime()}`;
        
        if (profilePhoto) {
          loadImageWithFallback(profilePhoto, photoUrl, originalSrc || DEFAULT_AVATAR);
        }
        
        return data.photoUrl;
      } else {
        throw new Error('No se recibió la URL de la foto');
      }
    } catch (error) {
      // Restaurar estado original en caso de error
      if (profilePhoto) {
        profilePhoto.style.opacity = "1";
        if (originalSrc) profilePhoto.src = originalSrc;
      }
      
      throw error; // Propagar el error para manejarlo fuera
    }
  } catch (err) {
    console.error('Error al actualizar la foto de perfil:', err);
    alert('Error al actualizar la foto de perfil: ' + err.message);
    return null;
  }
}

// ============= NUEVA FUNCIONALIDAD: MANEJO DE IMÁGENES DEL FEED =============

/**
 * Sube una imagen del feed al servidor
 * @param {File} file - Archivo de imagen a subir
 * @returns {Promise<string|null>} URL de la imagen subida o null si falló
 */
async function uploadFeedImage(file) {
  if (!file) return null;

  // Validar el archivo
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecciona una imagen válida.');
    return null;
  }

  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    alert('La imagen es demasiado grande. El tamaño máximo es 10MB.');
    return null;
  }

  // Crear un elemento de loading spinner
  const uploadContainer = document.getElementById('uploadImageContainer');
  const uploadImageElement = document.getElementById('uploadedImage');
  const uploadInterface = document.querySelector('.image-upload');
  
  // Ocultar la interfaz de carga y mostrar el spinner
  if (uploadInterface) {
    uploadInterface.style.display = 'none';
  }
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  uploadContainer.appendChild(spinner);

  try {
    console.log(`Preparando envío de imagen: ${file.name} (${Math.round(file.size/1024)} KB)`);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('type', 'feed');  // Especificar que es una imagen del feed

    // Intentar subir la imagen
    const res = await fetch(`${API}/api/upload/image`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    // Quitar el spinner
    if (spinner) {
      spinner.remove();
    }

    if (!res.ok) {
      // Mostrar de nuevo la interfaz de carga en caso de error
      if (uploadInterface) {
        uploadInterface.style.display = 'flex';
      }
      
      const errorData = await res.json().catch(() => ({ error: `Error HTTP: ${res.status}` }));
      throw new Error(errorData.error || `Error al subir la imagen: ${res.status}`);
    }

    const data = await res.json();
    
    if (data.success && data.imageUrl) {
      // Mostrar la imagen subida
      if (uploadImageElement) {
        uploadImageElement.src = data.imageUrl + `?t=${new Date().getTime()}`;
        uploadImageElement.style.display = 'block';
      }
      
      // Ocultar la interfaz de carga
      if (uploadInterface) {
        uploadInterface.style.display = 'none';
      }
      
      // Guardar la imagen en el almacenamiento local para persistencia
      saveFeedImageLocally(data.imageUrl);
      
      return data.imageUrl;
    } else {
      throw new Error('No se recibió la URL de la imagen');
    }
  } catch (err) {
    console.error('Error al subir imagen al feed:', err);
    alert('Error al subir la imagen: ' + err.message);
    
    // Mostrar de nuevo la interfaz de carga en caso de error
    if (uploadInterface) {
      uploadInterface.style.display = 'flex';
    }
    
    return null;
  }
}

/**
 * Guarda la URL de la imagen del feed en el almacenamiento local
 * @param {string} imageUrl - URL de la imagen subida
 */
function saveFeedImageLocally(imageUrl) {
  try {
    localStorage.setItem('feedUserImage', imageUrl);
    console.log('Imagen guardada localmente:', imageUrl);
  } catch (e) {
    console.error('Error al guardar imagen localmente:', e);
  }
}

/**
 * Carga la imagen del feed desde el almacenamiento local o el servidor
 */
async function loadFeedImages() {
  // Cargar imagen del primer contenedor (la que viene de la carpeta images)
  const sharedImage = document.getElementById('sharedImage');
  if (sharedImage) {
    // Asumimos que esta imagen es estática y ya está establecida en el HTML
    // Verificar si la imagen carga correctamente
    sharedImage.onerror = function() {
      console.error('Error al cargar la imagen compartida');
      sharedImage.src = 'placeholder.svg'; // Imagen de reemplazo si falla
    };
  }
  
  // Cargar imagen del segundo contenedor (la que sube el usuario)
  const uploadedImage = document.getElementById('uploadedImage');
  const uploadInterface = document.querySelector('.image-upload');
  
  try {
    // Primero intentar cargar desde localStorage
    const localImageUrl = localStorage.getItem('feedUserImage');
    
    if (localImageUrl && uploadedImage) {
      uploadedImage.src = localImageUrl + `?t=${new Date().getTime()}`;
      uploadedImage.style.display = 'block';
      
      // Ocultar interfaz de carga si hay una imagen
      if (uploadInterface) {
        uploadInterface.style.display = 'none';
      }
    } else {
      // Si no hay imagen local, intentar cargar desde el servidor
      const res = await fetch(`${API}/api/user/feed-image`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.imageUrl && uploadedImage) {
          uploadedImage.src = data.imageUrl + `?t=${new Date().getTime()}`;
          uploadedImage.style.display = 'block';
          
          // Guardar la URL para futuras cargas
          saveFeedImageLocally(data.imageUrl);
          
          // Ocultar interfaz de carga
          if (uploadInterface) {
            uploadInterface.style.display = 'none';
          }
        }
      }
    }
  } catch (err) {
    console.error('Error al cargar imagen del feed:', err);
    // En caso de error, asegurarnos de que la interfaz de carga esté visible
    if (uploadInterface) {
      uploadInterface.style.display = 'flex';
    }
  }
}

/**
 * Configura los eventos para la carga de imágenes del feed
 */
function setupImageUpload() {
  const uploadBtn = document.getElementById('uploadImageBtn');
  const imageInput = document.getElementById('imageInput');
  const uploadedImage = document.getElementById('uploadedImage');
  
  if (!uploadBtn || !imageInput) return;
  
  // Evento para el botón de selección de imagen
  uploadBtn.addEventListener('click', () => {
    imageInput.click();
  });
  
  // Evento para cuando se selecciona un archivo
  imageInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Vista previa rápida antes de subir
    const reader = new FileReader();
    reader.onload = (e) => {
      if (uploadedImage) {
        uploadedImage.src = e.target.result;
        uploadedImage.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
    
    // Subir la imagen al servidor
    try {
      const imageUrl = await uploadFeedImage(file);
      if (imageUrl) {
        console.log('Imagen de feed subida con éxito:', imageUrl);
      }
    } catch (err) {
      console.error('Error al subir imagen del feed:', err);
    }
  });
  
  // Si hay una imagen subida, permitir hacer clic para reemplazarla
  if (uploadedImage) {
    uploadedImage.addEventListener('click', () => {
      if (confirm('¿Deseas reemplazar esta imagen?')) {
        imageInput.click();
      }
    });
  }
}

// ============= FUNCIONALIDAD DE CHAT Y MENSAJES =============

/**
 * Carga los mensajes del chat desde el servidor
 */
async function loadMessages() {
  try {
    const res = await fetch(`${API}/api/messages`, {
      credentials: 'include'
    });
    
    if (!res.ok) {
      throw new Error(`Error al cargar mensajes: ${res.status}`);
    }
    
    const messages = await res.json();
    const chatMessages = document.getElementById('chatMessages');
    
    if (chatMessages) {
      if (messages.length === 0) {
        chatMessages.innerHTML = '<div class="empty-chat">No hay mensajes aún. ¡Sé el primero en comentar!</div>';
        return;
      }
      
      chatMessages.innerHTML = messages
        .map(msg => `
          <div class="chat-message">
            <strong>${msg.displayName || 'Usuario ' + msg.userId}:</strong> 
            <span>${msg.message}</span>
            <small class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</small>
          </div>
        `)
        .join('');
      
      // Desplazar al último mensaje
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  } catch (err) {
    console.error("Error al cargar mensajes:", err);
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
      chatMessages.innerHTML = '<div class="error-message">Error al cargar mensajes. Intenta de nuevo más tarde.</div>';
    }
  }
}

/**
 * Configura la funcionalidad del chat
 */
function setupChatFunctionality() {
  const sendChatBtn = document.getElementById('sendChatBtn');
  const chatInput = document.getElementById('chatInput');

  if (!sendChatBtn || !chatInput) return;

  const sendMessage = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    try {
      sendChatBtn.disabled = true;
      chatInput.disabled = true;
      
      const res = await fetch(`${API}/api/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }
      
      chatInput.value = '';
      await loadMessages();
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      alert("No se pudo enviar el mensaje. Intenta de nuevo.");
    } finally {
      sendChatBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  sendChatBtn.onclick = sendMessage;
  
  chatInput.addEventListener('keydown', e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

// ============= FUNCIONALIDAD DE ELEMENTOS GUARDADOS =============

/**
 * Carga elementos guardados desde el servidor
 */
async function loadSavedItems() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  
  try {
    mainContent.innerHTML = '<div class="loading">Cargando elementos guardados...</div>';
    
    const res = await fetch(`${API}/api/saved-items`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!res.ok) {
      throw new Error(`Error al obtener elementos guardados: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.items && data.items.length > 0) {
      let html = `
        <h2>Elementos Guardados</h2>
        <div class="saved-items-container">
      `;
      
      data.items.forEach(item => {
        html += `
          <div class="saved-item" data-id="${item.id}">
            <div class="saved-item-header">
              <h3>${item.title || 'Elemento guardado'}</h3>
              <button class="delete-saved-item" data-id="${item.id}">×</button>
            </div>
            ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" class="saved-item-image">` : ''}
            <p>${item.description || 'Sin descripción'}</p>
            <span class="saved-date">Guardado: ${new Date(item.createdAt).toLocaleDateString()}</span>
          </div>
        `;
      });
      
      html += `</div>`;
      mainContent.innerHTML = html;
      
      // Agregar event listeners a los botones de eliminar
      document.querySelectorAll('.delete-saved-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const itemId = btn.getAttribute('data-id');
          if (confirm('¿Estás seguro de eliminar este elemento?')) {
            const success = await deleteSavedItem(itemId);
            if (success) {
              loadSavedItems(); // Recargar la lista
            }
          }
        });
      });
    } else {
      mainContent.innerHTML = `
        <h2>Elementos Guardados</h2>
        <div class="feed-placeholder pastel-bg">
          <p>Aún no tienes elementos guardados.</p>
          <p>Los elementos que guardes aparecerán aquí.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error("Error al cargar elementos guardados:", err);
    mainContent.innerHTML = `
      <h2>Elementos Guardados</h2>
      <div class="feed-placeholder pastel-bg error-message">
        <p>Ocurrió un error al cargar tus elementos guardados.</p>
        <p>Por favor, intenta de nuevo más tarde.</p>
      </div>
    `;
  }
}

/**
 * Elimina un elemento guardado
 * @param {string|number} itemId - ID del elemento a eliminar
 * @returns {Promise<boolean>} True si se eliminó correctamente
 */
async function deleteSavedItem(itemId) {
  try {
    const res = await fetch(`${API}/api/saved-items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Error: ${res.status}` }));
      throw new Error(errorData.error || 'Error al eliminar elemento');
    }
    
    const data = await res.json();
    console.log('Elemento eliminado:', data);
    return data.success;
  } catch (err) {
    console.error("Error al eliminar elemento guardado:", err);
    alert('Error al eliminar elemento. Por favor, intenta de nuevo.');
    return false;
  }
}

/**
 * Guarda un nuevo elemento
 * @returns {Promise<boolean>} True si se guardó correctamente
 */
async function saveNewItem() {
  const title = prompt("Título del elemento a guardar:");
  if (!title) return false;
  
  const description = prompt("Descripción (opcional):");
  
  const itemData = {
    itemType: "custom",
    title: title,
    description: description || "Elemento guardado por el usuario"
  };
  
  try {
    const res = await fetch(`${API}/api/saved-items`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(itemData)
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: `Error: ${res.status}` }));
      throw new Error(errorData.error || 'Error al guardar elemento');
    }
    
    const data = await res.json();
    alert('Elemento guardado correctamente');
    console.log('Elemento guardado:', data);
    return data.success;
  } catch (err) {
    console.error("Error al guardar elemento:", err);
    alert('Error al guardar elemento. Por favor, intenta de nuevo.');
    return false;
  }
}

// ============= CONFIGURACIÓN DE MENÚ Y NAVEGACIÓN =============

/**
 * Configura el menú lateral
 */
function setupSidebarMenu() {
  const menuOptions = document.querySelectorAll('.menu-option');
  menuOptions.forEach(option => {
    option.addEventListener('click', () => {
      const optionType = option.getAttribute('data-option');
      handleMenuOption(optionType);
    });
  });
}

/**
 * Maneja la selección de opciones del menú
 * @param {string} optionType - Tipo de opción seleccionada
 */
function handleMenuOption(optionType) {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;
  
  // Resaltar la opción seleccionada
  document.querySelectorAll('.menu-option').forEach(opt => {
    opt.classList.remove('active');
    if (opt.getAttribute('data-option') === optionType) {
      opt.classList.add('active');
    }
  });
  
  // Contenido según la opción seleccionada
  switch (optionType) {
    case 'history':
      mainContent.innerHTML = `
        <h2>Historia</h2>
        <div class="feed-placeholder pastel-bg">
          <p>Aquí se mostrará tu historial de actividad.</p>
        </div>
      `;
      break;
    case 'gallery':
      mainContent.innerHTML = `
        <h2>Galería</h2>
        <div class="feed-placeholder pastel-bg">
          <p>Aquí se mostrará tu galería de fotos.</p>
        </div>
      `;
      break;
    case 'letter':
      // Redirigir a la página letter.html
      window.location.href = '/letter.html';
      break;
    case 'saved':
      loadSavedItems();
      break;
    case 'text':
      // Mostrar la pantalla principal con el diseño de feed completo
      loadMainFeed();
      break;
    default:
      // Pantalla principal con el diseño de feed
      loadMainFeed();
  }
}

/**
 * Carga la pantalla principal con el contenido del feed.
 * Respeta el contenido original del HTML y solo configura JS, no sobrescribe el HTML si ya existe.
 */
function loadMainFeed() {
  const mainContent = document.getElementById('mainContent');
  if (!mainContent) return;

  // Si ya hay contenido (editado manualmente en feed.html), no sobrescribirlo
  // Solo configurar la funcionalidad de JS para subir imágenes y cargar imagen del feed
  if (mainContent.innerHTML.trim() === '' || mainContent.innerHTML.trim() === '<h2>Hello @you</h2>') {
    // Inicializar contenido solo si está vacío
    mainContent.innerHTML = `
      <h2>Hello @you</h2>
      <div class="main-container">
        <!-- Contenedor de texto principal -->
        <div class="text-container">
          <h2>Hola crzn ❤</h2>
          <p>Esta es una página para ti, quiero decirte muchas cosas las cuáles no puedo expresar directamente por millones de razones pero aquí te las haré saber.</p>
        </div>
        
        <!-- Contenedores de imágenes -->
        <div class="image-containers">
          <!-- Primer contenedor de imagen estática personalizada -->
          <div class="image-box" id="Camilateamo">
            <img src="images/camyyo.png" alt="Imagen compartida" id="sharedImage">
          </div>
          
          <!-- Segundo contenedor para subir una imagen -->
          <div class="image-box" id="uploadImageContainer">
            <div class="image-upload">
              <div class="upload-icon">+</div>
              <p class="upload-text">Sube una imagen aquí</p>
              <button class="upload-btn" id="uploadImageBtn">Seleccionar imagen</button>
              <input type="file" id="imageInput" accept="image/*">
            </div>
            <img src="" alt="Imagen subida" id="uploadedImage" style="display: none;">
          </div>
        </div>
      </div>
    `;
  }
  
  // Configurar la funcionalidad de carga de imágenes
  setupImageUpload();
  
  // Cargar imágenes guardadas
  loadFeedImages();
}

/**
 * Configura el menú de perfil
 */
function setupProfileMenu() {
  const profileMenu = document.getElementById('profileMenu');
  const dropdown = document.getElementById('dropdownMenu');
  const profilePhoto = document.getElementById('profilePhoto') || document.querySelector('.profile-icon');
  
  // Asegurar que el menú esté oculto inicialmente
  if (dropdown) {
    dropdown.style.display = 'none';
  }
  
  // Evento de clic para el contenedor de perfil
  if (profileMenu) {
    profileMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      
      if (dropdown) {
        // Alternar visibilidad del menú
        dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' 
          ? 'flex' 
          : 'none';
      }
    });
  }

  // Cerrar el menú al hacer clic en cualquier otra parte
  document.addEventListener('click', (e) => {
    if (dropdown && dropdown.style.display !== 'none' && 
        !dropdown.contains(e.target) && 
        !profileMenu.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Configurar opciones del menú desplegable
  setupDropdownOptions(dropdown, profilePhoto);
}

/**
 * Configura las opciones del menú desplegable
 * @param {HTMLElement} dropdown - Elemento del menú desplegable
 * @param {HTMLImageElement} profilePhoto - Elemento de la foto de perfil
 */
function setupDropdownOptions(dropdown, profilePhoto) {
  // Botón para editar nombre de perfil
  const editBtnDropdown = document.getElementById('editProfileBtnDropdown');
  if (editBtnDropdown) {
    editBtnDropdown.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (dropdown) dropdown.style.display = 'none';
      
      const newName = prompt("Nuevo nombre a mostrar:");
      if (!newName) return;

      try {
        const res = await fetch(`${API}/api/profile`, {
          method: "POST",
          credentials: "include",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: newName })
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: `Error: ${res.status}` }));
          throw new Error(errorData.error || 'Error al actualizar perfil');
        }
        
        const data = await res.json();
        if (data.success) {
          updateProfile({ displayName: newName });
          alert("Nombre actualizado correctamente");
        }
      } catch (err) {
        console.error("Error al actualizar perfil:", err);
        alert("No se pudo actualizar el nombre. Intenta de nuevo.");
      }
    });
  }

  // Botón para cerrar sesión
  const logoutBtnDropdown = document.getElementById('logoutBtnDropdown');
  if (logoutBtnDropdown) {
    logoutBtnDropdown.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (dropdown) dropdown.style.display = 'none';
      
      try {
        const res = await fetch(`${API}/api/logout`, { 
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error(`Error al cerrar sesión: ${res.status}`);
        }
        
        // Usar ruta relativa para la redirección
        window.location.href = "/index.html";
      } catch (err) {
        console.error("Error al cerrar sesión:", err);
        alert("No se pudo cerrar sesión. Intenta de nuevo.");
      }
    });
  }

  // Input para cambiar foto de perfil
  const photoInputDropdown = document.getElementById('photoInputDropdown');
  if (photoInputDropdown) {
    photoInputDropdown.addEventListener('change', async (event) => {
      event.stopPropagation();
      if (dropdown) dropdown.style.display = 'none';
      
      const file = event.target.files[0];
      if (!file) return;

      // Vista previa de la imagen antes de subir
      if (profilePhoto) {
        const reader = new FileReader();
        reader.onload = (e) => {
          profilePhoto.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }

      // Subir la imagen al servidor
      try {
        const photoUrl = await handleProfilePhoto(file);
        if (photoUrl) {
          console.log('Foto actualizada con éxito:', photoUrl);
          alert("Foto de perfil actualizada correctamente");
        }
      } catch (err) {
        console.error('Error al actualizar foto:', err);
      }
    });
  }

  // Botón para ver elementos guardados
  const savedItemsBtn = document.querySelector('.saved-items-btn');
  if (savedItemsBtn) {
    savedItemsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown) dropdown.style.display = 'none';
      
      // Cargar y mostrar elementos guardados
      loadSavedItems();
    });
  }
}

// ============= INICIALIZACIÓN =============

// Cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, configurando funcionalidades...');
  
  // Configuración del chat
  setupChatFunctionality();
  
  // Configuración del menú de perfil
  setupProfileMenu();
  
  // Eventos para las opciones del menú lateral
  setupSidebarMenu();
  
  // Carga inicial de la vista principal
  loadMainFeed();
});

// Cuando la página completa está cargada
window.onload = async () => {
  console.log('Página completamente cargada, verificando sesión...');
  
  try {
    // Verificar sesión y cargar perfil
    const user = await checkSession();
    if (user) {
      updateProfile(user);
      await loadMessages();
      console.log('Sesión iniciada como:', user.displayName || user.username);
    }
  } catch (err) {
    console.error('Error en la inicialización:', err);
    redirectToLogin();
  }
};
