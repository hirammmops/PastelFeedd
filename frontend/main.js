// Configuración del backend (actualizada al puerto correcto)
const API = "http://localhost:3001";

document.addEventListener("DOMContentLoaded", async () => {
  console.log('Página cargada, iniciando verificación...');
  
  // Solo verificamos la sesión si estamos en la página de login
  if (window.location.pathname.endsWith('index.html') || 
      window.location.pathname === '/' ||
      window.location.pathname === '/index') {
    await checkInitialSession();
  }

  // Elementos del DOM
  const loginForm = document.getElementById('loginForm');
  const registerBtn = document.getElementById('registerBtn');
  const modal = document.getElementById('registerModal');
  const closeModal = document.getElementById('closeModal');
  const regForm = document.getElementById('registerForm');
  const errorMsg = document.getElementById('errorMsg');
  const regError = document.getElementById('registerError');
  const googleBtn = document.querySelector('.oauth-btn.google');
  const fbBtn = document.querySelector('.oauth-btn.facebook');

  // Funciones de utilidad
  function showError(message, isRegister = false) {
    const element = isRegister ? regError : errorMsg;
    if (element) {
      element.textContent = message;
      element.style.display = "block";
    }
  }

  function hideError(isRegister = false) {
    const element = isRegister ? regError : errorMsg;
    if (element) {
      element.style.display = "none";
    }
  }

  function validateEmail(email) {
    return /^[\w.-]+@[\w-]+\.\w{2,}$/.test(email);
  }

  // Función principal de login
  async function handleLogin(username, password) {
    try {
      console.log('Intentando iniciar sesión...');
      
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      console.log('Respuesta recibida:', res.status);
      
      // Si hay un error del servidor, mostramos un mensaje más específico
      if (res.status >= 500) {
        showError("Error en el servidor. Por favor, intenta más tarde.");
        return false;
      }
      
      try {
        const data = await res.json();
        console.log('Datos recibidos:', data);

        if (data.success) {
          console.log('Login exitoso, redirigiendo...');
          // Usar ruta relativa para la redirección
          window.location.href = "/feed";
          return true;
        } else {
          console.error('Error en login:', data.error);
          showError(data.error || "Usuario o contraseña incorrectos");
          return false;
        }
      } catch (parseErr) {
        console.error('Error al parsear respuesta:', parseErr);
        showError("Error al procesar la respuesta del servidor");
        return false;
      }
    } catch (err) {
      console.error('Error de conexión:', err);
      
      // Mensaje más detallado según el tipo de error
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        showError("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
      } else {
        showError("Error inesperado durante el inicio de sesión: " + err.message);
      }
      return false;
    }
  }

  // Manejador del formulario de login
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      hideError();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!username || !password) {
        showError("Completa todos los campos");
        return;
      }

      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) loginBtn.disabled = true;
      
      await handleLogin(username, password);
      
      if (loginBtn) loginBtn.disabled = false;
    };
  }

  // Manejador del botón de registro
  if (registerBtn) {
    registerBtn.onclick = () => {
      if (modal) {
        modal.style.display = "block";
        hideError(true);
      }
    };
  }

  // Manejador para cerrar el modal
  if (closeModal) {
    closeModal.onclick = () => {
      if (modal) {
        modal.style.display = "none";
      }
    };
  }

  // Manejador del formulario de registro
  if (regForm) {
    regForm.onsubmit = async (e) => {
      e.preventDefault();
      hideError(true);

      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value.trim();

      if (!username || !email || !password) {
        showError("Completa todos los campos", true);
        return;
      }

      if (!validateEmail(email)) {
        showError("Correo electrónico no válido", true);
        return;
      }

      try {
        const res = await fetch(`${API}/api/register`, {
          method: "POST",
          credentials: "include",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username,
            email,
            password
          })
        });

        const data = await res.json();

        if (data.success) {
          // Si el registro es exitoso, intentamos hacer login
          await handleLogin(username, password);
        } else {
          showError(data.error || "Error al registrar usuario", true);
        }
      } catch (err) {
        showError("Error de conexión con el servidor", true);
      }
    };
  }

  // Manejadores de OAuth
  if (googleBtn) {
    googleBtn.onclick = () => {
      window.location.href = "/auth/google";
    };
  }

  if (fbBtn) {
    fbBtn.onclick = () => {
      window.location.href = "/auth/facebook";
    };
  }

  // Cerrar modal al hacer clic fuera
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // Verificación inicial de sesión
  async function checkInitialSession() {
    try {
      console.log('Verificando sesión inicial...');
      const res = await fetch(`${API}/api/session`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Estado de la sesión:', res.status);

      if (res.status === 401) {
        console.log('No hay sesión activa');
        return false;
      }

      try {
        const data = await res.json();
        console.log('Datos de sesión:', data);
        
        if (data.loggedIn && data.user) {
          console.log('Sesión activa, redirigiendo a feed');
          window.location.href = "/feed";
          return true;
        }
      } catch (parseErr) {
        console.error('Error al parsear datos de sesión:', parseErr);
      }

      return false;
    } catch (err) {
      console.error('Error al verificar sesión inicial:', err);
      return false;
    }
  }
});
