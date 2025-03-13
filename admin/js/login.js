// Login functionality for admin panel using Firebase Authentication

document.addEventListener('DOMContentLoaded', function() {
    // Set up login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Set up auth state listener
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
        if (user) {
            // User is signed in
            console.log('Redirecting to admin panel...');
            window.location.replace('index.html');
        } else {
            // User is signed out
            const currentPage = window.location.pathname.split('/').pop();
            if (currentPage !== 'login.html') {
                console.log('Redirecting to login...');
                window.location.replace('login.html');
            }
        }
    });

    // Handle "Forgot Password" link
    const forgotPasswordLink = document.getElementById('forgotPassword');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', handleForgotPassword);
    }
});

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginAlert = document.getElementById('loginAlert');
    const submitButton = document.querySelector('button[type="submit"]');
    
    // Disable submit button and show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Iniciando sesión...';
    
    try {
        // Set persistence first based on "Remember Me" checkbox
        if (document.getElementById('rememberMe').checked) {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        }
        
        // Sign in with Firebase Auth
        await auth.signInWithEmailAndPassword(email, password);
        
        // Redirect to admin panel (this will be handled by onAuthStateChanged)
    } catch (error) {
        // Show error message
        loginAlert.textContent = getErrorMessage(error.code);
        loginAlert.classList.remove('d-none');
        
        // Clear password field
        document.getElementById('password').value = '';
        
        // Focus on email field
        document.getElementById('email').focus();
    } finally {
        // Restore submit button
        submitButton.disabled = false;
        submitButton.innerHTML = 'Iniciar Sesión';
    }
}

// Handle forgot password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = prompt('Por favor, ingrese su correo electrónico para restablecer la contraseña:');
    
    if (!email) return;
    
    try {
        await auth.sendPasswordResetEmail(email);
        alert('Se ha enviado un correo para restablecer la contraseña. Por favor, revise su bandeja de entrada.');
    } catch (error) {
        alert(getErrorMessage(error.code));
    }
}

// Get user-friendly error message
function getErrorMessage(errorCode) {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'El correo electrónico no es válido.';
        case 'auth/user-disabled':
            return 'Esta cuenta ha sido deshabilitada.';
        case 'auth/user-not-found':
            return 'No existe una cuenta con este correo electrónico.';
        case 'auth/wrong-password':
            return 'La contraseña es incorrecta.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos fallidos. Por favor, intente más tarde.';
        case 'auth/network-request-failed':
            return 'Error de conexión. Compruebe su conexión a internet.';
        default:
            return 'Ha ocurrido un error al iniciar sesión. Por favor, inténtelo de nuevo.';
    }
}