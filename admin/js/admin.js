// Admin panel functionality for SUBE Academia
// Handles blog posts and courses management using Firebase

// Global variables
let currentUser = null;
let currentEditingBlogId = null;
let currentEditingCourseId = null;
let blogImageFile = null;
let courseImageFile = null;
let editor = null;

// Initialize admin panel when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Verify user authentication
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is authenticated
            currentUser = user;
            console.log('User authenticated:', user.email);
            showNotification('Sesión Iniciada', `Bienvenido ${user.email}`, 'success');
            initializeAdmin();
        } else {
            // User is not authenticated, redirect to login
            window.location.href = 'login.html';
        }
    });

    // Set up refresh button
    const refreshBtn = document.getElementById('refreshData');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            loadBlogPosts();
            loadCourses();
            updateDashboardCounters();
            loadRecentActivity();
            showNotification('Actualización', 'Datos actualizados correctamente', 'success');
        });
    }

    // Set up refresh activity button
    const refreshActivityBtn = document.getElementById('refreshActivity');
    if (refreshActivityBtn) {
        refreshActivityBtn.addEventListener('click', function() {
            loadRecentActivity();
        });
    }

    // Set up logout button
    const logoutBtn = document.querySelector('[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Set up blog post save button
    const saveBlogPostBtn = document.getElementById('saveBlogPost');
    if (saveBlogPostBtn) {
        saveBlogPostBtn.addEventListener('click', saveBlogPost);
    }

    // Set up course save button
    const saveCourseBtn = document.getElementById('saveCourse');
    if (saveCourseBtn) {
        saveCourseBtn.addEventListener('click', saveCourse);
    }

    // Handle blog image file input
    const blogImageInput = document.querySelector('input[name="image"]');
    if (blogImageInput) {
        blogImageInput.addEventListener('change', function(e) {
            blogImageFile = e.target.files[0];
            validateFileSize(blogImageFile, 2); // Limit to 2MB
        });
    }

    // Handle course image file input
    const courseImageInput = document.querySelector('#courseForm input[name="image"]');
    if (courseImageInput) {
        courseImageInput.addEventListener('change', function(e) {
            courseImageFile = e.target.files[0];
            validateFileSize(courseImageFile, 2); // Limit to 2MB
        });
    }

    // Set up search functionality for blog posts
    const blogSearch = document.getElementById('blogSearch');
    if (blogSearch) {
        blogSearch.addEventListener('input', function() {
            filterBlogPosts(this.value);
        });
    }

    // Set up clear search for blog posts
    const clearBlogSearch = document.getElementById('clearBlogSearch');
    if (clearBlogSearch) {
        clearBlogSearch.addEventListener('click', function() {
            document.getElementById('blogSearch').value = '';
            filterBlogPosts('');
        });
    }

    // Set up filter and search functionality for courses
    const courseFilter = document.getElementById('courseFilter');
    const courseSearch = document.getElementById('courseSearch');
    
    if (courseFilter) {
        courseFilter.addEventListener('change', function() {
            filterCourses(courseSearch.value, this.value);
        });
    }
    
    if (courseSearch) {
        courseSearch.addEventListener('input', function() {
            filterCourses(this.value, courseFilter.value);
        });
    }

    // Set up clear search for courses
    const clearCourseSearch = document.getElementById('clearCourseSearch');
    if (clearCourseSearch) {
        clearCourseSearch.addEventListener('click', function() {
            document.getElementById('courseSearch').value = '';
            document.getElementById('courseFilter').value = '';
            filterCourses('', '');
        });
    }
});

// Initialize TinyMCE
function initTinyMCE() {
    if (tinymce.get('editor')) {
        tinymce.get('editor').remove();
    }
    
    tinymce.init({
        selector: '#editor',
        height: 500,
        plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
            'insertdatetime', 'media', 'table', 'help', 'wordcount'
        ],
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | link image | preview fullscreen | ' +
                'forecolor backcolor | help',
        menubar: 'file edit view insert format tools table help',
        content_style: 'body { font-family: Poppins, sans-serif; font-size: 16px }',
        images_upload_handler: function (blobInfo, success, failure) {
            // Handle image upload from editor
            const file = blobInfo.blob();
            const fileName = blobInfo.filename();
            const storageRef = storage.ref(`blog-images/${Date.now()}_${fileName}`);
            
            storageRef.put(file).then(snapshot => {
                snapshot.ref.getDownloadURL().then(downloadURL => {
                    success(downloadURL);
                });
            }).catch(error => {
                failure('Error uploading image: ' + error.message);
            });
        },
        setup: function (ed) {
            editor = ed;
            ed.on('change', function () {
                ed.save();
            });
        }
    });
}

// Initialize Admin Panel
function initializeAdmin() {
    // Show loading state
    showLoading('Iniciando panel de administración...');
    
    // Variable para controlar si ya se ha ocultado el overlay de carga
    let loadingHidden = false;
    
    // Set a timeout to ensure loading overlay is removed even if there are issues
    const loadingTimeout = setTimeout(() => {
        if (!loadingHidden) {
            hideLoading();
            loadingHidden = true;
            console.log('Loading timeout triggered - forcing hideLoading');
            showNotification('Advertencia', 'La inicialización está tardando más de lo esperado. Algunas funciones podrían no estar disponibles.', 'warning');
        }
    }, 3000); // Reducido a 3 segundos para mejor experiencia de usuario
    
    try {
        // DOM Elements
        const navLinks = document.querySelectorAll('#sidebar .nav-link');
        const contentSections = document.querySelectorAll('.content-section');
        
        // Set up navigation
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const targetSection = this.getAttribute('data-section');
                
                // Update active link
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Show target section, hide others
                contentSections.forEach(section => {
                    if (section.id === targetSection) {
                        section.classList.remove('d-none');
                    } else {
                        section.classList.add('d-none');
                    }
                });

                // Initialize TinyMCE if we're showing the blog section
                if (targetSection === 'blog') {
                    initTinyMCE();
                }
            });
        });

        // Reset forms when modals are closed
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('hidden.bs.modal', function() {
                const form = this.querySelector('form');
                if (form) form.reset();
                
                // Reset editing state
                if (this.id === 'blogPostModal') {
                    currentEditingBlogId = null;
                    blogImageFile = null;
                    if (tinymce.get('editor')) {
                        tinymce.get('editor').setContent('');
                    }
                } else if (this.id === 'courseModal') {
                    currentEditingCourseId = null;
                    courseImageFile = null;
                }
            });
        });

        // Initialize TinyMCE
        initTinyMCE();
        
        // Inicializar componentes en paralelo con manejo de errores
        Promise.allSettled([
            // Cargar posts del blog
            new Promise((resolve) => {
                try {
                    loadBlogPosts();
                    resolve();
                } catch (error) {
                    console.error('Error loading blog posts:', error);
                    resolve(); // Resolvemos de todas formas para no bloquear
                }
            }),
            // Cargar cursos
            new Promise((resolve) => {
                try {
                    loadCourses();
                    resolve();
                } catch (error) {
                    console.error('Error loading courses:', error);
                    resolve(); // Resolvemos de todas formas para no bloquear
                }
            }),
            // Cargar actividad reciente
            new Promise((resolve) => {
                try {
                    loadRecentActivity();
                    resolve();
                } catch (error) {
                    console.error('Error loading recent activity:', error);
                    resolve(); // Resolvemos de todas formas para no bloquear
                }
            })
        ]).then(() => {
            // Actualizar contadores del dashboard
            try {
                updateDashboardCounters();
            } catch (error) {
                console.error('Error updating dashboard counters:', error);
            }
            
            // Configurar botones después de cargar todo
            setupButtons();
            
            // Ocultar el overlay de carga si aún no se ha hecho
            if (!loadingHidden) {
                hideLoading();
                loadingHidden = true;
                clearTimeout(loadingTimeout);
            }
        });
        
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        // Show error message in the activity list
        const activityList = document.getElementById('recentActivity');
        if (activityList) {
            activityList.innerHTML = '<li class="list-group-item text-center text-danger">Error al inicializar el panel. Por favor, recargue la página.</li>';
        }
        
        // Asegurar que el overlay de carga se oculte en caso de error
        if (!loadingHidden) {
            hideLoading();
            loadingHidden = true;
            clearTimeout(loadingTimeout);
        }
    }
}

// Configurar botones del panel
function setupButtons() {
    // Set up the blog post form to handle new post creation
    const blogPostBtn = document.querySelector('[data-bs-target="#blogPostModal"]');
    if (blogPostBtn) {
        blogPostBtn.addEventListener('click', function() {
            currentEditingBlogId = null;
            const modalTitle = document.querySelector('#blogPostModal .modal-title');
            if (modalTitle) modalTitle.textContent = 'Nuevo Artículo';
            
            // Reset form
            const form = document.getElementById('blogPostForm');
            if (form) {
                form.reset();
                if (tinymce.get('editor')) {
                    tinymce.get('editor').setContent('');
                }
            }
        });
    }
    
    // Set up the course form to handle new course creation
    const courseBtn = document.querySelector('[data-bs-target="#courseModal"]');
    if (courseBtn) {
        courseBtn.addEventListener('click', function() {
            currentEditingCourseId = null;
            const modalTitle = document.querySelector('#courseModal .modal-title');
            if (modalTitle) modalTitle.textContent = 'Nuevo Curso';
            
            // Reset form
            const form = document.getElementById('courseForm');
            if (form) {
                form.reset();
            }
        });
    }
}

// Validate file size
function validateFileSize(file, maxSizeMB) {
    if (!file) return true;
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    
    if (file.size > maxSizeBytes) {
        showNotification('Error', `El archivo excede el tamaño máximo permitido de ${maxSizeMB}MB.`, 'error');
        return false;
    }
    
    return true;
}

// Filter blog posts
function filterBlogPosts(query) {
    query = query.toLowerCase();
    const rows = document.querySelectorAll('#blogPostsList tr');
    
    rows.forEach(row => {
        const title = row.querySelector('td:first-child').textContent.toLowerCase();
        if (title.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Filter courses
function filterCourses(query, category) {
    query = query.toLowerCase();
    const rows = document.querySelectorAll('#coursesList tr');
    
    rows.forEach(row => {
        const title = row.querySelector('td:first-child').textContent.toLowerCase();
        const courseCategory = row.getAttribute('data-category');
        
        const matchesQuery = title.includes(query);
        const matchesCategory = !category || courseCategory === category;
        
        if (matchesQuery && matchesCategory) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Load recent activity
// Load recent activity
async function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;
    
    // Verificar si Firebase está disponible
    if (!firebase || !db) {
        console.error('Firebase no está inicializado correctamente');
        activityList.innerHTML = '<li class="list-group-item text-center text-danger"><i class="fas fa-exclamation-circle me-2"></i>Error de conexión con la base de datos. <button class="btn btn-sm btn-outline-primary ms-2" onclick="window.location.reload()">Recargar página</button></li>';
        return;
    }
    
    // Variable para controlar si ya se ha actualizado la UI
    let hasUpdatedUI = false;
    
    // Establecer un tiempo límite para la carga
    let timeoutId = setTimeout(() => {
        if (!hasUpdatedUI) {
            console.warn('Tiempo de carga excedido para la actividad reciente');
            activityList.innerHTML = '<li class="list-group-item text-center text-warning"><i class="fas fa-exclamation-triangle me-2"></i>La carga de actividad está tardando demasiado. <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadRecentActivity()">Reintentar</button></li>';
            hasUpdatedUI = true;
            hideLoading();
        }
    }, 5000); // Reducido a 5 segundos para mejor experiencia de usuario
    
    try {
        // Mostrar estado de carga
        activityList.innerHTML = '<li class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"><span class="visually-hidden">Cargando...</span></div> Cargando actividad reciente...</li>';
        
        // Usar Promise.all con un tiempo límite más corto para cada consulta
        const [blogSnapshot, coursesSnapshot] = await Promise.all([
            Promise.race([
                db.collection('blog-posts').orderBy('date', 'desc').limit(3).get(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo excedido al cargar blogs')), 4000))
            ]),
            Promise.race([
                db.collection('courses').orderBy('updatedAt', 'desc').limit(3).get(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo excedido al cargar cursos')), 4000))
            ])
        ]);
        
        // Marcar que hemos actualizado la UI exitosamente
        hasUpdatedUI = true;
        
        // Limpiar el timeout ya que la carga fue exitosa
        clearTimeout(timeoutId);
        
        // Combine and sort activities
        const activities = [];
        
        blogSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                id: doc.id,
                title: data.title || 'Sin título',
                date: data.date,
                type: 'blog',
                author: data.author || 'Anónimo'
            });
        });
        
        coursesSnapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                id: doc.id,
                title: data.title || 'Sin título',
                date: data.updatedAt || data.createdAt,
                type: 'course',
                category: getCategoryName(data.category || '')
            });
        });
        
        // Sort by date with error handling
        activities.sort((a, b) => {
            // Check if dates are valid
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1; // b comes first
            if (!b.date) return -1; // a comes first
            
            try {
                return b.date - a.date;
            } catch (error) {
                console.error('Error sorting dates:', error);
                return 0;
            }
        });
        
        if (activities.length === 0) {
            activityList.innerHTML = '<li class="list-group-item text-center">No hay actividad reciente.</li>';
            hideLoading();
            return;
        }
        
        activityList.innerHTML = '';
        
        // Display activities
        activities.slice(0, 5).forEach(activity => {
            const date = activity.date ? formatFirestoreDate(activity.date) : 'Fecha desconocida';
            
            let html = `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${activity.title}</div>
                        <small class="text-muted">
            `;
            
            if (activity.type === 'blog') {
                html += `<i class="fas fa-blog me-1"></i> Artículo por ${activity.author} - ${date}`;
            } else {
                html += `<i class="fas fa-graduation-cap me-1"></i> Curso (${activity.category}) - ${date}`;
            }
            
            html += `
                        </small>
                    </div>
                    <a href="#" class="btn btn-sm btn-outline-primary" onclick="${activity.type === 'blog' ? 'viewBlogPost' : 'viewCourse'}('${activity.id}')">
                        <i class="fas fa-eye"></i>
                    </a>
                </li>
            `;
            
            activityList.innerHTML += html;
        });
        
    } catch (error) {
        // Solo actualizar la UI si no se ha hecho ya
        if (!hasUpdatedUI) {
            console.error('Error loading recent activity:', error);
            let errorMessage = 'Error al cargar la actividad reciente.';
            
            // Personalizar el mensaje de error según el tipo
            if (error.message && error.message.includes('Tiempo excedido')) {
                errorMessage = 'Tiempo de espera agotado al cargar los datos. La conexión a Firebase puede estar lenta.';
            } else if (error.code === 'permission-denied') {
                errorMessage = 'No tienes permisos para acceder a estos datos.';
            } else if (error.code && error.code.includes('unavailable')) {
                errorMessage = 'El servicio de Firebase no está disponible en este momento.';
            }
            
            activityList.innerHTML = `
                <li class="list-group-item text-center text-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>${errorMessage}
                    <button class="btn btn-sm btn-outline-primary ms-2" onclick="loadRecentActivity()">
                        <i class="fas fa-sync-alt me-1"></i>Reintentar
                    </button>
                </li>
            `;
            
            hasUpdatedUI = true;
        }
        
        // Limpiar el timeout ya que estamos manejando el error
        clearTimeout(timeoutId);
    } finally {
        // Asegurar que el overlay de carga siempre se oculte
        hideLoading();
    }
}

// Load blog posts from Firestore
async function loadBlogPosts() {
    const blogPostsList = document.getElementById('blogPostsList');
    if (!blogPostsList) return;
    
    try {
        blogPostsList.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></td></tr>';
        
        const snapshot = await db.collection('blog-posts').orderBy('date', 'desc').get();
        
        if (snapshot.empty) {
            blogPostsList.innerHTML = '<tr><td colspan="4" class="text-center">No hay artículos para mostrar.</td></tr>';
            return;
        }
        
        blogPostsList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const post = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${post.title}</td>
                <td>${formatFirestoreDate(post.date)}</td>
                <td><span class="badge bg-success">Publicado</span></td>
                <td>
                    <button class="btn btn-sm btn-info btn-action" onclick="viewBlogPost('${doc.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning btn-action" onclick="editBlogPost('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteBlogPost('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            blogPostsList.appendChild(row);
        });
        
        // Update dashboard counter
        updateDashboardCounters();
    } catch (error) {
        console.error('Error loading blog posts:', error);
        blogPostsList.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar los artículos. Por favor, intente de nuevo.</td></tr>';
    }
}

// Load courses from Firestore
async function loadCourses() {
    const coursesList = document.getElementById('coursesList');
    if (!coursesList) return;
    
    try {
        coursesList.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Cargando...</span></div></td></tr>';
        
        const snapshot = await db.collection('courses').orderBy('title').get();
        
        if (snapshot.empty) {
            coursesList.innerHTML = '<tr><td colspan="4" class="text-center">No hay cursos para mostrar.</td></tr>';
            return;
        }
        
        coursesList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const course = doc.data();
            const row = document.createElement('tr');
            row.setAttribute('data-category', course.category);
            row.innerHTML = `
                <td>${course.title}</td>
                <td>${getCategoryName(course.category)}</td>
                <td><span class="badge bg-success">Activo</span></td>
                <td>
                    <button class="btn btn-sm btn-info btn-action" onclick="viewCourse('${doc.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning btn-action" onclick="editCourse('${doc.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-action" onclick="deleteCourse('${doc.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            coursesList.appendChild(row);
        });
        
        // Update dashboard counter
        updateDashboardCounters();
    } catch (error) {
        console.error('Error loading courses:', error);
        coursesList.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar los cursos. Por favor, intente de nuevo.</td></tr>';
    }
}

// Update dashboard counters
async function updateDashboardCounters() {
    try {
        // Get blog posts count
        const blogSnapshot = await db.collection('blog-posts').get();
        const totalPostsElement = document.getElementById('totalPosts');
        if (totalPostsElement) {
            totalPostsElement.textContent = blogSnapshot.size;
        }
        
        // Get courses count
        const coursesSnapshot = await db.collection('courses').get();
        const totalCoursesElement = document.getElementById('totalCourses');
        if (totalCoursesElement) {
            totalCoursesElement.textContent = coursesSnapshot.size;
        }
    } catch (error) {
        console.error('Error updating dashboard counters:', error);
        showNotification('Error', 'No se pudo actualizar los contadores del dashboard', 'error');
    }
}

// Get category display name
function getCategoryName(category) {
    const categories = {
        'ia': 'Inteligencia Artificial',
        'ml': 'Machine Learning',
        'ds': 'Data Science',
        'dl': 'Deep Learning',
        'nlp': 'Procesamiento de Lenguaje Natural',
        'cv': 'Computer Vision',
        'rl': 'Reinforcement Learning'
    };
    return categories[category] || category;
}

// View blog post
async function viewBlogPost(id) {
    try {
        showLoading('Cargando artículo...');
        
        const docRef = await db.collection('blog-posts').doc(id).get();
        
        if (!docRef.exists) {
            showNotification('Error', 'El artículo no existe.', 'error');
            hideLoading();
            return;
        }
        
        const post = docRef.data();
        
        // Generate slug if not exists
        const slug = post.slug || post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Open blog post URL on a new tab
        const url = `../blog/posts/${slug}.html`;
        
        window.open(url, '_blank');
        hideLoading();
    } catch (error) {
        console.error('Error viewing blog post:', error);
        showNotification('Error', 'Error al ver el artículo. Por favor, intente de nuevo.', 'error');
        hideLoading();
    }
}

// View course
async function viewCourse(id) {
    try {
        showLoading('Cargando curso...');
        
        const docRef = await db.collection('courses').doc(id).get();
        
        if (!docRef.exists) {
            showNotification('Error', 'El curso no existe.', 'error');
            hideLoading();
            return;
        }
        
        // Open course URL on a new tab
        const url = `../curso-detalle.html?id=${id}`;
        
        window.open(url, '_blank');
        hideLoading();
    } catch (error) {
        console.error('Error viewing course:', error);
        showNotification('Error', 'Error al ver el curso. Por favor, intente de nuevo.', 'error');
        hideLoading();
    }
}

// Edit blog post
async function editBlogPost(id) {
    try {
        showLoading('Cargando artículo para edición...');
        
        const docRef = await db.collection('blog-posts').doc(id).get();
        
        if (!docRef.exists) {
            showNotification('Error', 'El artículo no existe.', 'error');
            hideLoading();
            return;
        }
        
        const post = docRef.data();
        currentEditingBlogId = id;
        
        // Update modal title
        const modalTitle = document.querySelector('#blogPostModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'Editar Artículo';
        
        // Fill form with post data
        const form = document.getElementById('blogPostForm');
        if (form) {
            form.elements['title'].value = post.title;
            form.elements['author'].value = post.author;
            form.elements['linkedinProfile'].value = post.linkedinProfile || '';
            
            // Set TinyMCE content
            if (tinymce.get('editor')) {
                tinymce.get('editor').setContent(post.content);
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('blogPostModal'));
            modal.show();
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error editing blog post:', error);
        showNotification('Error', 'Error al editar el artículo. Por favor, intente de nuevo.', 'error');
        hideLoading();
    }
}

// Edit course
async function editCourse(id) {
    try {
        showLoading('Cargando curso para edición...');
        
        const docRef = await db.collection('courses').doc(id).get();
        
        if (!docRef.exists) {
            showNotification('Error', 'El curso no existe.', 'error');
            hideLoading();
            return;
        }
        
        const course = docRef.data();
        currentEditingCourseId = id;
        
        // Update modal title
        const modalTitle = document.querySelector('#courseModal .modal-title');
        if (modalTitle) modalTitle.textContent = 'Editar Curso';
        
        // Fill form with course data
        const form = document.getElementById('courseForm');
        if (form) {
            form.elements['title'].value = course.title;
            form.elements['category'].value = course.category;
            form.elements['description'].value = course.description;
            form.elements['content'].value = course.content;
            
            // Handle competencies checkboxes
            if (course.competencies && Array.isArray(course.competencies)) {
                course.competencies.forEach(comp => {
                    const checkbox = form.querySelector(`input[name="competencies"][value="${comp}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('courseModal'));
            modal.show();
        }
        
        hideLoading();
    } catch (error) {
        console.error('Error editing course:', error);
        showNotification('Error', 'Error al editar el curso. Por favor, intente de nuevo.', 'error');
        hideLoading();
    }
}

// Delete blog post
async function deleteBlogPost(id) {
    if (!confirm('¿Está seguro de que desea eliminar este artículo? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showLoading('Eliminando artículo...');
        
        // Get blog post data to delete the image
        const docRef = await db.collection('blog-posts').doc(id).get();
        
        if (!docRef.exists) {
            showNotification('Error', 'El artículo no existe.', 'error');
            hideLoading();
            return;
        }
        
        const post = docRef.data();
        
        // Delete the post from Firestore
        await db.collection('blog-posts').doc(id).delete();
        
        // Delete the image from Storage if it exists
        if (post.imagePath) {
            try {
                const imageRef = storage.ref(post.imagePath);
                await imageRef.delete();
            } catch (imageError) {
                console.error('Error deleting image:', imageError);
                // Continue with deletion even if image deletion fails
            }
        }
        
        // Reload the blog posts list
        loadBlogPosts();
        
        // Update dashboard counters
        updateDashboardCounters();
        
        // Update recent activity
        loadRecentActivity();
        
        hideLoading();
        showNotification('Éxito', 'Artículo eliminado con éxito.', 'success');
    } catch (error) {
        console.error('Error deleting blog post:', error);
        hideLoading();
        showNotification('Error', 'Error al eliminar el artículo. Por favor, intente de nuevo.', 'error');
    }
}

// Delete course
async function deleteCourse(id) {
    if (!confirm('¿Está seguro de que desea eliminar este curso? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        showLoading('Eliminando curso...');
        
        // Get course data to delete the image
        const docRef = await db.collection('courses').doc(id).get();
        
        if (!docRef.exists) {
            showNotification('Error', 'El curso no existe.', 'error');
            hideLoading();
            return;
        }
        
        const course = docRef.data();
        
        // Delete the course from Firestore
        await db.collection('courses').doc(id).delete();
        
        // Delete the image from Storage if it exists
        if (course.imagePath) {
            try {
                const imageRef = storage.ref(course.imagePath);
                await imageRef.delete();
            } catch (imageError) {
                console.error('Error deleting image:', imageError);
                // Continue with deletion even if image deletion fails
            }
        }
        
        // Reload the courses list
        loadCourses();
        
        // Update dashboard counters
        updateDashboardCounters();
        
        // Update recent activity
        loadRecentActivity();
        
        hideLoading();
        showNotification('Éxito', 'Curso eliminado con éxito.', 'success');
    } catch (error) {
        console.error('Error deleting course:', error);
        hideLoading();
        showNotification('Error', 'Error al eliminar el curso. Por favor, intente de nuevo.', 'error');
    }
}

// Save blog post (create or update)
async function saveBlogPost() {
    const form = document.getElementById('blogPostForm');
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        // Show loading state
        setButtonLoading('saveBlogPost', true);
        showLoading('Guardando artículo...');
        
        // Get form data
        const formData = new FormData(form);
        const title = formData.get('title');
        const author = formData.get('author');
        const linkedinProfile = formData.get('linkedinProfile');
        const content = tinymce.get('editor').getContent();
        
        if (!content) {
            showNotification('Error', 'Por favor, ingresa el contenido del artículo', 'error');
            setButtonLoading('saveBlogPost', false);
            hideLoading();
            return;
        }
        
        // Generate slug for URL and filename
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // Prepare blog post data
        const blogPost = {
            title,
            author,
            linkedinProfile,
            content,
            slug
        };
        
        let postId = currentEditingBlogId;
        let imagePath = null;
        let imageUrl = null;
        
        // Add timestamp for new posts or updating
        if (postId) {
            blogPost.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        } else {
            blogPost.date = firebase.firestore.FieldValue.serverTimestamp();
        }
        
        // Handle image upload if there's a new image
        if (blogImageFile) {
            // Validate file size
            if (!validateFileSize(blogImageFile, 2)) {
                setButtonLoading('saveBlogPost', false);
                hideLoading();
                return;
            }
            
            // Create a unique path for the image
            imagePath = `blog-images/${Date.now()}_${blogImageFile.name}`;
            const imageRef = storage.ref(imagePath);
            
            // Upload image
            await imageRef.put(blogImageFile);
            
            // Get the download URL
            imageUrl = await imageRef.getDownloadURL();
            
            // Add image URL and path to blog post data
            blogPost.imageUrl = imageUrl;
            blogPost.imagePath = imagePath;
        }
        
        // Save or update blog post in Firestore
        if (postId) {
            // Update existing post
            await db.collection('blog-posts').doc(postId).update(blogPost);
        } else {
            // Create new post
            const docRef = await db.collection('blog-posts').add(blogPost);
            postId = docRef.id;
        }
        
        // Generate HTML file for the blog post
        await generateBlogPostHTML(postId, blogPost);
        
        // Reload blog posts list
        loadBlogPosts();
        
        // Update dashboard counters
        updateDashboardCounters();
        
        // Update recent activity
        loadRecentActivity();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('blogPostModal'));
        modal.hide();
        
        // Reset form
        form.reset();
        tinymce.get('editor').setContent('');
        blogImageFile = null;
        currentEditingBlogId = null;
        
        hideLoading();
        showNotification('Éxito', 'Artículo guardado con éxito.', 'success');
    } catch (error) {
        console.error('Error saving blog post:', error);
        hideLoading();
        showNotification('Error', 'Error al guardar el artículo. Por favor, intente de nuevo.', 'error');
    } finally {
        // Reset button state
        setButtonLoading('saveBlogPost', false);
    }
}

// Save course (create or update)
async function saveCourse() {
    const form = document.getElementById('courseForm');
    if (!form || !form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    try {
        // Show loading state
        setButtonLoading('saveCourse', true);
        showLoading('Guardando curso...');
        
        // Get form data
        const formData = new FormData(form);
        const title = formData.get('title');
        const category = formData.get('category');
        const description = formData.get('description');
        const content = formData.get('content');
        
        // Get selected competencies
        const competencies = [];
        form.querySelectorAll('input[name="competencies"]:checked').forEach(checkbox => {
            competencies.push(checkbox.value);
        });
        
        // Prepare course data
        const course = {
            title,
            category,
            description,
            content,
            competencies,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        let courseId = currentEditingCourseId;
        let imagePath = null;
        let imageUrl = null;
        
        // Handle image upload if there's a new image
        if (courseImageFile) {
            // Validate file size
            if (!validateFileSize(courseImageFile, 2)) {
                setButtonLoading('saveCourse', false);
                hideLoading();
                return;
            }
            
            // Create a unique path for the image
            imagePath = `course-images/${Date.now()}_${courseImageFile.name}`;
            const imageRef = storage.ref(imagePath);
            
            // Upload image
            await imageRef.put(courseImageFile);
            
            // Get the download URL
            imageUrl = await imageRef.getDownloadURL();
            
            // Add image URL and path to course data
            course.imageUrl = imageUrl;
            course.imagePath = imagePath;
        }
        
        // Save or update course in Firestore
        if (courseId) {
            // Update existing course
            await db.collection('courses').doc(courseId).update(course);
        } else {
            // Create new course with timestamp
            course.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            const docRef = await db.collection('courses').add(course);
            courseId = docRef.id;
        }
        
        // Reload courses list
        loadCourses();
        
        // Update dashboard counters
        updateDashboardCounters();
        
        // Update recent activity
        loadRecentActivity();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('courseModal'));
        modal.hide();
        
        // Reset form
        form.reset();
        courseImageFile = null;
        currentEditingCourseId = null;
        
        hideLoading();
        showNotification('Éxito', 'Curso guardado con éxito.', 'success');
    } catch (error) {
        console.error('Error saving course:', error);
        hideLoading();
        showNotification('Error', 'Error al guardar el curso. Por favor, intente de nuevo.', 'error');
    } finally {
        // Reset button state
        setButtonLoading('saveCourse', false);
    }
}

// Logout function
function logout() {
    try {
        showLoading('Cerrando sesión...');
        
        auth.signOut().then(() => {
            console.log('User signed out');
            hideLoading();
            window.location.href = 'login.html';
        });
    } catch (error) {
        console.error('Error signing out:', error);
        hideLoading();
        showNotification('Error', 'Error al cerrar sesión. Por favor, intente de nuevo.', 'error');
    }
}

// Make functions available globally
window.viewBlogPost = viewBlogPost;
window.editBlogPost = editBlogPost;
window.deleteBlogPost = deleteBlogPost;
window.viewCourse = viewCourse;
window.editCourse = editCourse;
window.deleteCourse = deleteCourse;
window.logout = logout;